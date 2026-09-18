'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import UiIcon from './UiIcon';
import s from './AdminWalletOperations.module.css';

type NetworkRow={id:string;asset:string;network:string;display_name:string;confirmations:number;deposit_enabled:boolean;withdraw_enabled:boolean;min_deposit:number;min_withdraw:number;withdraw_fee:number;active:boolean;updated_at:string};
type DepositRow={id:string;user_id:string;email:string|null;asset:string;network:string;address:string|null;txid:string|null;amount:number;confirmations:number;status:string;created_at:string;credited_at:string|null};
type WithdrawalRow={id:string;user_id:string;email:string|null;asset:string;network:string;address:string;amount:number;fee:number;status:string;txid:string|null;note:string|null;created_at:string;reviewed_at:string|null;updated_at:string};
type Snap={networks:NetworkRow[];deposits:DepositRow[];withdrawals:WithdrawalRow[];stats:Record<string,number>};
type Tab='networks'|'deposits'|'withdrawals';

export default function AdminWalletOperations(){
 const supabase=useMemo(()=>createBrowserSupabase(),[]);
 const [allowed,setAllowed]=useState<boolean|null>(null);
 const [tab,setTab]=useState<Tab>('networks');
 const [data,setData]=useState<Snap>({networks:[],deposits:[],withdrawals:[],stats:{}});
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
   <div><span>활성 네트워크</span><b>{data.stats?.networks||0}</b></div>
   <div><span>입금 활성</span><b>{data.stats?.deposit_enabled||0}</b></div>
   <div><span>출금 활성</span><b>{data.stats?.withdraw_enabled||0}</b></div>
   <div><span>출금 대기</span><b>{data.stats?.withdraw_pending||0}</b></div>
  </section>

  <nav className={s.tabs}>
   <button className={tab==='networks'?s.active:''} onClick={()=>setTab('networks')}><UiIcon name="wallet" size={17}/> Asset Networks</button>
   <button className={tab==='deposits'?s.active:''} onClick={()=>setTab('deposits')}><UiIcon name="history" size={17}/> Deposit Records</button>
   <button className={tab==='withdrawals'?s.active:''} onClick={()=>setTab('withdrawals')}><UiIcon name="order" size={17}/> Withdrawals</button>
  </nav>

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
