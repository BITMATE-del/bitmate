'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import UiIcon from './UiIcon';
import s from './AdminWalletOperations.module.css';

type NetworkRow={id:string;asset:string;network:string;display_name:string;confirmations:number;deposit_enabled:boolean;withdraw_enabled:boolean;min_deposit:number;min_withdraw:number;withdraw_fee:number;active:boolean;updated_at:string};
type DepositRow={id:string;user_id:string;email:string|null;asset:string;network:string;address:string|null;txid:string|null;amount:number;confirmations:number;status:string;created_at:string;credited_at:string|null};
type WithdrawalRow={id:string;user_id:string;email:string|null;asset:string;network:string;address:string;amount:number;fee:number;status:string;txid:string|null;note:string|null;created_at:string;reviewed_at:string|null;updated_at:string};
type AddressRow={id:string;user_id:string;email:string|null;asset:string;network:string;address:string;provider:string;active:boolean;scan_from:string;created_at:string};
type BalanceRow={user_id:string;email:string|null;asset:string;available:number;locked:number;created_at:string|null;updated_at:string};
type Snap={networks:NetworkRow[];deposits:DepositRow[];withdrawals:WithdrawalRow[];addresses:AddressRow[];balances:BalanceRow[];stats:Record<string,number>};
type Tab='balances'|'networks'|'addresses'|'deposits'|'withdrawals';

export default function AdminWalletOperations(){
 const supabase=useMemo(()=>createBrowserSupabase(),[]);
 const [allowed,setAllowed]=useState<boolean|null>(null);
 const [tab,setTab]=useState<Tab>('balances');
 const [data,setData]=useState<Snap>({networks:[],deposits:[],withdrawals:[],addresses:[],balances:[],stats:{}});
 const [msg,setMsg]=useState('');
 const [busy,setBusy]=useState(false);

 async function load(){
  const {data:{user}}=await supabase.auth.getUser();
  const role=String(user?.app_metadata?.role||'').toLowerCase();
  const ok=role==='admin'||role==='superadmin'||user?.app_metadata?.superadmin===true;
  setAllowed(ok);if(!ok)return;
  const {data:snap,error}=await supabase.rpc('admin_wallet_ops_snapshot');
  if(error){setMsg(error.message);return}
  setData((snap||{}) as Snap);
 }
 useEffect(()=>{load()},[]);

 async function run(name:string,args:Record<string,unknown>,success:string){
  setBusy(true);setMsg('');
  const {error}=await supabase.rpc(name,args);
  setBusy(false);
  if(error){setMsg(error.message);return}
  setMsg(success);await load();
 }

 async function editNetwork(n:NetworkRow){
  const confirmations=Number(prompt('필요 확인 수',String(n.confirmations)));if(!Number.isFinite(confirmations))return;
  const minDeposit=Number(prompt('최소 입금 수량',String(n.min_deposit)));if(!Number.isFinite(minDeposit))return;
  const minWithdraw=Number(prompt('최소 출금 수량',String(n.min_withdraw)));if(!Number.isFinite(minWithdraw))return;
  const fee=Number(prompt('출금 수수료',String(n.withdraw_fee)));if(!Number.isFinite(fee))return;
  const depositEnabled=confirm('입금을 활성화할까요?\n확인=활성 / 취소=비활성');
  const withdrawEnabled=confirm('출금을 활성화할까요?\n확인=활성 / 취소=비활성');
  const active=confirm('이 네트워크 자체를 노출할까요?\n확인=노출 / 취소=숨김');
  await run('admin_update_asset_network',{p_id:n.id,p_deposit_enabled:depositEnabled,p_withdraw_enabled:withdrawEnabled,p_confirmations:confirmations,p_min_deposit:minDeposit,p_min_withdraw:minWithdraw,p_withdraw_fee:fee,p_active:active},`${n.asset} ${n.network} 설정이 변경되었습니다.`);
 }

 async function assignTronAddress(){
  const email=(prompt('회원 이메일을 입력하세요.')||'').trim();
  if(!email)return;
  const address=(prompt('TRON 입금 주소를 입력하세요. (T로 시작하는 34자리 주소)')||'').trim();
  if(!address)return;
  if(!confirm(email+'\n'+address+'\nUSDT/TRC20 + TRX 자동입금 주소로 배정할까요?'))return;
  await run('admin_assign_tron_deposit_address',{p_email:email,p_address:address},'TRON 자동입금 주소가 배정되었습니다.');
 }

 async function setBalance(row:BalanceRow){
  const current=Number(row.available||0);
  const next=Number(prompt(`${row.email||'회원'} · USDT 사용 가능 잔액\n새 잔액을 입력하세요.`,String(current)));
  if(!Number.isFinite(next)||next<0)return alert('0 이상의 잔액을 입력하세요.');
  const note=(prompt('관리자 메모 (선택)','')||'').trim();
  if(!confirm(`${row.email||row.user_id}\nUSDT 사용 가능 잔액: ${current.toLocaleString()} → ${next.toLocaleString()}\n변경할까요?`))return;
  await run('admin_set_user_usdt_balance',{p_user_id:row.user_id,p_available:next,p_note:note||null},`${row.email||'회원'}의 USDT 잔액이 ${next.toLocaleString()} 으로 변경되었습니다.`);
 }

 async function updateWithdrawal(r:WithdrawalRow,status:string){
  let txid=r.txid||'';let note=r.note||'';
  if(status==='SENT')txid=prompt('전송 TXID를 입력하세요.',txid)||'';
  if(status==='REJECTED'||status==='FAILED')note=prompt('처리 사유를 입력하세요.',note)||'';
  if(!confirm(`${r.email||r.user_id}\n${r.amount} ${r.asset} · ${status}\n상태를 변경할까요?`))return;
  await run('admin_update_withdrawal_status',{p_id:r.id,p_status:status,p_txid:txid||null,p_note:note||null},`출금 요청이 ${status} 상태로 변경되었습니다.`);
 }

 if(allowed===null)return <main className={s.page}><div className={s.gate}>관리자 권한 확인 중...</div></main>;
 if(!allowed)return <main className={s.page}><div className={s.gate}><h1>관리자 권한이 필요합니다.</h1><Link href="/">홈으로</Link></div></main>;

 return <main className={s.page}><div className={s.shell}>
  <header className={s.hero}>
   <div><span>BITMATE ADMIN</span><h1>입금 · 출금 · 네트워크 관리</h1><p>현재 지원 자산/체인, 확인 수, 최소 수량, 수수료와 입출금 운영 상태를 관리합니다. 실제 블록체인 송금은 별도 지갑/커스터디 연동이 필요하며 이 화면은 운영 정책과 요청 상태를 관리합니다.</p></div>
   <div className={s.heroActions}><Link href="/admin">관리자 홈</Link><Link href="/deposit">입금 화면</Link></div>
  </header>

  <section className={s.stats}>
   <div><span>잔액 보유 회원</span><b>{data.stats?.wallet_users||0}</b></div>
   <div><span>활성 네트워크</span><b>{data.stats?.networks||0}</b></div>
   <div><span>입금 활성</span><b>{data.stats?.deposit_enabled||0}</b></div>
   <div><span>출금 대기</span><b>{data.stats?.withdraw_pending||0}</b></div>
   <div><span>TRON 주소 배정</span><b>{data.stats?.tron_addresses||0}</b></div>
  </section>

  <nav className={s.tabs}>
   <button className={tab==='balances'?s.active:''} onClick={()=>setTab('balances')}><UiIcon name="wallet" size={17}/> Member Balances</button>
   <button className={tab==='networks'?s.active:''} onClick={()=>setTab('networks')}><UiIcon name="settings" size={17}/> Asset Networks</button>
   <button className={tab==='addresses'?s.active:''} onClick={()=>setTab('addresses')}><UiIcon name="link" size={17}/> TRON Addresses</button>
   <button className={tab==='deposits'?s.active:''} onClick={()=>setTab('deposits')}><UiIcon name="history" size={17}/> Deposit Records</button>
   <button className={tab==='withdrawals'?s.active:''} onClick={()=>setTab('withdrawals')}><UiIcon name="order" size={17}/> Withdrawals</button>
  </nav>

  {tab==='balances'&&<section className={`${s.panel} ${s.balancePanel}`}>
   <div className={s.balanceHead}>
    <div className={s.balanceHeadCopy}><span>MEMBER WALLET</span><h2>회원 USDT 입금 / 지갑 잔액</h2><p>여기 표시되는 USDT Available 잔액과 회원 상단 Wallet 잔액은 동일한 값을 사용합니다.</p></div>
    <div className={s.balanceSyncBadge}><UiIcon name="wallet" size={15}/>Header Wallet과 동일 기준</div>
   </div>
   <div className={s.balanceInfo}><UiIcon name="overview" size={15}/><span><b>USDT Available</b>이 회원 헤더의 Wallet Balance입니다. TRC20 USDT 입금이 CREDITED 되면 이 값에 자동 충전됩니다. Locked와 Futures 잔액은 별도로 관리됩니다.</span></div>
   <div className={s.balanceTable}>
    <div className={s.balanceTableHead}><span>회원</span><span>자산</span><span>사용 가능 잔액</span><span>잠금 잔액</span><span>관리</span></div>
    {data.balances.length?data.balances.map(r=><div className={s.balanceRow} key={r.user_id}>
     <div className={s.memberCell}><div className={s.memberAvatar}>{(r.email||'M').slice(0,1).toUpperCase()}</div><div><b>{r.email||'—'}</b><small>UID {r.user_id.slice(0,8)}…</small></div></div>
     <div className={s.assetCell}><strong>{r.asset}</strong><small>{new Date(r.updated_at).toLocaleString()}</small></div>
     <div className={s.availableCell}><strong>{Number(r.available||0).toLocaleString(undefined,{maximumFractionDigits:10})}</strong><small>{r.asset}</small></div>
     <div className={s.lockedCell}><strong>{Number(r.locked||0).toLocaleString(undefined,{maximumFractionDigits:10})}</strong><small>{r.asset}</small></div>
     <div className={s.manageCell}><button disabled={busy} onClick={()=>setBalance(r)}>잔액 수정</button></div>
    </div>):<div className={s.balanceEmpty}><UiIcon name="wallet" size={24}/><b>잔액 데이터가 없습니다.</b><span>회원 잔액 설정 버튼으로 첫 잔액을 생성할 수 있습니다.</span></div>}
   </div>
  </section>}

  {tab==='networks'&&<section className={s.panel}>
   <div className={s.panelHead}><div><h2>Asset / Network 설정</h2><p>Deposit 페이지에 노출되는 네트워크 정책의 기준 데이터입니다.</p></div></div>
   <div className={s.table}><div className={s.thNet}><span>자산</span><span>네트워크</span><span>확인/최소수량</span><span>운영 상태</span><span>관리</span></div>
   {data.networks.map(n=><div className={s.trNet} key={n.id}>
    <span><b>{n.asset}</b><small>{n.display_name}</small></span>
    <span><b>{n.network}</b><small>Fee {Number(n.withdraw_fee||0).toLocaleString()}</small></span>
    <span><small>Confirmations {n.confirmations}</small><small>Min deposit {Number(n.min_deposit||0).toLocaleString()}</small><small>Min withdraw {Number(n.min_withdraw||0).toLocaleString()}</small></span>
    <span><b className={n.active?s.good:s.bad}>{n.active?'ACTIVE':'HIDDEN'}</b><small>Deposit {n.deposit_enabled?'ON':'OFF'} · Withdraw {n.withdraw_enabled?'ON':'OFF'}</small></span>
    <span className={s.actions}><button disabled={busy} onClick={()=>editNetwork(n)}>설정 수정</button></span>
   </div>)}
   </div>
  </section>}

  {tab==='addresses'&&<section className={s.panel}>
   <div className={s.panelHead}><div><h2>TRON 자동입금 주소</h2><p>회원별 TRON 주소를 배정하면 USDT/TRC20과 TRX 입금을 동일 주소에서 자동 감지합니다.</p></div><div className={s.actions}><button disabled={busy} onClick={assignTronAddress}>TRON 주소 배정</button></div></div>
   <div className={s.table}><div className={s.thAddr}><span>회원</span><span>자산</span><span>주소</span><span>공급자</span><span>상태</span></div>
   {data.addresses.length?data.addresses.map(r=><div className={s.trAddr} key={r.id}><span><b>{r.email||'—'}</b><small>{r.user_id.slice(0,8)}…</small></span><span><b>{r.asset}</b><small>{r.network}</small></span><span><small>{r.address}</small></span><span><b>{r.provider}</b><small>{new Date(r.scan_from).toLocaleString()} 이후 감지</small></span><span><b className={r.active?s.good:s.bad}>{r.active?'ACTIVE':'INACTIVE'}</b></span></div>):<div className={s.empty}>배정된 TRON 입금 주소가 없습니다.</div>}
   </div>
  </section>}

  {tab==='deposits'&&<section className={s.panel}>
   <div className={s.panelHead}><div><h2>Deposit Records</h2><p>체인 모니터 또는 입금 공급자가 적재한 입금 레코드가 표시됩니다.</p></div></div>
   <div className={s.table}><div className={s.thDep}><span>회원</span><span>자산/체인</span><span>금액</span><span>상태</span><span>TXID</span></div>
   {data.deposits.length?data.deposits.map(r=><div className={s.trDep} key={r.id}><span><b>{r.email||'—'}</b><small>{r.user_id.slice(0,8)}…</small></span><span><b>{r.asset}</b><small>{r.network}</small></span><span><b>{Number(r.amount||0).toLocaleString()}</b><small>{r.confirmations} confirmations</small></span><span><b>{r.status}</b><small>{new Date(r.created_at).toLocaleString()}</small></span><span><small>{r.txid||'—'}</small></span></div>):<div className={s.empty}>입금 레코드가 없습니다.</div>}
   </div>
  </section>}

  {tab==='withdrawals'&&<section className={s.panel}>
   <div className={s.panelHead}><div><h2>Withdrawal Requests</h2><p>출금 요청의 검토 상태를 관리합니다. SENT 처리에는 TXID를 기록할 수 있습니다.</p></div></div>
   <div className={s.table}><div className={s.thWd}><span>회원</span><span>출금 정보</span><span>주소</span><span>상태</span><span>처리</span></div>
   {data.withdrawals.length?data.withdrawals.map(r=><div className={s.trWd} key={r.id}><span><b>{r.email||'—'}</b><small>{r.user_id.slice(0,8)}…</small></span><span><b>{Number(r.amount).toLocaleString()} {r.asset}</b><small>{r.network} · Fee {Number(r.fee||0).toLocaleString()}</small></span><span><small>{r.address}</small>{r.txid&&<em>{r.txid}</em>}</span><span><b>{r.status}</b><small>{new Date(r.created_at).toLocaleString()}</small>{r.note&&<em>{r.note}</em>}</span><span className={s.actions}><button onClick={()=>updateWithdrawal(r,'REVIEW')}>검토</button><button onClick={()=>updateWithdrawal(r,'APPROVED')}>승인</button><button onClick={()=>updateWithdrawal(r,'SENT')}>전송완료</button><button onClick={()=>updateWithdrawal(r,'REJECTED')}>거절</button></span></div>):<div className={s.empty}>출금 요청이 없습니다.</div>}
   </div>
  </section>}

  {msg&&<div className={s.toast} onClick={()=>setMsg('')}>{msg}</div>}
 </div></main>
}
