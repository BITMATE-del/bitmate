'use client';

import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import {siteConfirm,sitePrompt} from './SiteDialog';
import BrandLogo from './BrandLogo';
import s from './DealerPortal.module.css';

type Dealer={id:string;code:string;display_name:string;active:boolean};
type Member={user_id:string;email:string;joined_at:string;usdt_available:number;usdt_locked:number;banned_until?:string|null};
type P2PPlayer={id:string;user_id:string;email:string;nickname:string;status:string;fee_rate:number;primary_asset:string;payment_methods:string[];min_order:number;max_order:number;created_at:string};
type Setting={id:string;asset:string;network:string;deposit_address:string|null;withdraw_address:string|null;note:string;active:boolean};
type Withdrawal={id:string;email:string;asset:string;network:string;address:string;amount:number;fee:number;status:string;txid:string|null;created_at:string};
type Deposit={id:string;email:string;asset:string;network:string;address:string|null;amount:number;status:string;txid:string|null;created_at:string};
type Loan={id:string;loan_no:string;email:string;principal:number;borrow_asset:string;status:string;created_at:string;due_at:string|null};
type Cfd={id:string;email:string;symbol:string;direction:string;amount:number;start_price:number;end_price:number|null;status:string;result:string|null;starts_at:string;expires_at:string;override_value?:string|null;override_reason?:string|null};
type Snap={dealer:Dealer;members:Member[];settings:Setting[];withdrawals:Withdrawal[];deposits:Deposit[];loans:Loan[];cfd_trades:Cfd[];p2p_players:P2PPlayer[]};
type Tab='members'|'wallet'|'loans'|'cfd'|'p2p'|'settings';

const n=(v:number)=>Number(v||0).toLocaleString('ko-KR');

export default function DealerPortal(){
 const supabase=useMemo(()=>createBrowserSupabase(),[]);
 const [data,setData]=useState<Snap|null>(null);
 const [tab,setTab]=useState<Tab>('members');
 const [loading,setLoading]=useState(true);
 const [msg,setMsg]=useState('');
 const [asset,setAsset]=useState('USDT');
 const [network,setNetwork]=useState('TRC20');
 const [depositAddress,setDepositAddress]=useState('');
 const [withdrawAddress,setWithdrawAddress]=useState('');
 const [note,setNote]=useState('');

 async function load(){
  setLoading(true);
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){location.href='/login?next=/dealer';return}
  const {data:snap,error}=await supabase.rpc('dealer_portal_snapshot');
  setLoading(false);
  if(error){setMsg(error.message.includes('dealer_required')?'총판 권한이 없는 계정입니다.':error.message);return}
  const next=snap as Snap;setData(next);
  const st=next.settings?.find(x=>x.asset==='USDT'&&x.network==='TRC20');
  if(st){setDepositAddress(st.deposit_address||'');setWithdrawAddress(st.withdraw_address||'');setNote(st.note||'')}
 }
 useEffect(()=>{void load()},[]);

 async function saveSettings(){
  const {error}=await supabase.rpc('dealer_set_payment_settings',{p_asset:asset,p_network:network,p_deposit_address:depositAddress,p_withdraw_address:withdrawAddress,p_note:note});
  if(error)return setMsg(error.message);setMsg('전용 입출금 주소 설정을 저장했습니다.');await load();
 }
 async function withdrawal(id:string,status:string){
  let txid:string|null=null;
  if(status==='SENT'){txid=await sitePrompt('전송 TXID를 입력하세요.','',{title:'출금 전송 완료'});if(!txid)return}
  if(!(await siteConfirm('출금 상태를 '+status+'(으)로 변경할까요?',{title:'출금 관리'})))return;
  const {error}=await supabase.rpc('dealer_update_withdrawal_status',{p_id:id,p_status:status,p_txid:txid,p_note:'총판 처리'});
  if(error)return setMsg(error.message);await load();
 }
 async function loan(id:string,approve:boolean){
  if(approve){
   if(!(await siteConfirm('해당 대출을 승인하고 지급할까요?',{title:'코인대출 승인'})))return;
   const {error}=await supabase.rpc('dealer_approve_crypto_loan',{p_loan:id});if(error)return setMsg(error.message);
  }else{
   const reason=await sitePrompt('거절 사유를 입력하세요.','',{title:'코인대출 거절'});if(!reason)return;
   const {error}=await supabase.rpc('dealer_reject_crypto_loan',{p_loan:id,p_reason:reason});if(error)return setMsg(error.message);
  }
  await load();
 }
 async function cfdOverride(id:string,value:string){
  const reason=await sitePrompt('판정보정 사유를 5자 이상 입력하세요.','',{title:'CFD 판정보정'});if(!reason)return;
  const {error}=await supabase.rpc('dealer_set_cfd_timed_round_override',{p_trade_id:id,p_override:value,p_reason:reason});
  if(error)return setMsg(error.message);setMsg('판정보정이 저장되었습니다.');await load();
 }

 async function setMemberBalance(m:Member){
  const value=await sitePrompt('변경할 USDT Available 잔액을 입력하세요.',String(m.usdt_available||0),{title:'회원 잔액 관리',inputType:'number'});
  if(value===null)return;
  const amount=Number(value);
  if(!Number.isFinite(amount)||amount<0){setMsg('올바른 잔액을 입력하세요.');return}
  const note=await sitePrompt('변경 사유를 입력하세요.','',{title:'잔액 변경 사유'});
  if(note===null)return;
  const {error}=await supabase.rpc('dealer_set_user_usdt_balance',{p_user_id:m.user_id,p_available:amount,p_note:note});
  if(error)return setMsg(error.message);
  setMsg('회원 USDT 잔액이 변경되었습니다.');await load();
 }

 async function toggleFreeze(m:Member){
  const frozen=Boolean(m.banned_until&&new Date(m.banned_until).getTime()>Date.now());
  let reason:string|null='';
  if(!frozen){
    reason=await sitePrompt('동결 사유를 입력하세요.','',{title:'회원 동결'});
    if(reason===null)return;
    if(!(await siteConfirm(m.email+' 계정을 동결할까요?\n동결 즉시 현재 로그인 세션도 종료됩니다.',{title:'회원 동결 확인'})))return;
  }else{
    if(!(await siteConfirm(m.email+' 계정의 동결을 해제할까요?',{title:'회원 동결 해제'})))return;
  }
  const {error}=await supabase.rpc('dealer_set_user_frozen',{p_user_id:m.user_id,p_frozen:!frozen,p_reason:reason||null});
  if(error)return setMsg(error.message);
  setMsg(frozen?'회원 동결이 해제되었습니다.':'회원 계정이 동결되었습니다.');await load();
 }

 async function setP2PStatus(p:P2PPlayer,status:string){
  const label=status==='APPROVED'?'승인':status==='REJECTED'?'거절':status==='SUSPENDED'?'정지':'대기';
  if(!(await siteConfirm(p.email+' P2P 판매자 상태를 '+label+' 처리할까요?',{title:'P2P 판매자 관리'})))return;
  const {error}=await supabase.rpc('dealer_set_p2p_player_status',{p_id:p.id,p_status:status});
  if(error)return setMsg(error.message);
  setMsg('P2P 판매자 상태가 변경되었습니다.');await load();
 }

 if(loading)return <main className={s.page}><div className={s.loading}>Dealer portal loading...</div></main>;
 if(!data)return <main className={s.page}><div className={s.denied}><h1>총판 페이지</h1><p>{msg||'접근 권한이 없습니다.'}</p><Link href="/">홈으로</Link></div></main>;

 return <main className={s.page}>
  <header className={s.header}><div className={s.brand}><BrandLogo variant="horizontal" height={34}/><span>DEALER</span></div><div><b>{data.dealer.display_name||'총판 관리자'}</b><small>가입코드 {data.dealer.code}</small></div><Link href="/">사이트 보기</Link></header>
  <div className={s.shell}>
   <section className={s.hero}><div><span>DEALER MANAGEMENT</span><h1>총판 관리센터</h1><p>본인의 가입코드 <b>{data.dealer.code}</b>로 가입된 회원만 관리할 수 있습니다.</p></div><div className={s.stats}><div><small>관리 회원</small><b>{data.members.length}</b></div><div><small>출금 대기</small><b>{data.withdrawals.filter(x=>['PENDING','REVIEW','APPROVED'].includes(x.status)).length}</b></div><div><small>대출 대기</small><b>{data.loans.filter(x=>x.status==='PENDING').length}</b></div></div></section>
   <nav className={s.tabs}>
    {([['members','회원관리'],['wallet','입출금관리'],['loans','코인대출'],['cfd','CFD 판정보정'],['p2p','P2P 승인'],['settings','전용 주소 설정']] as [Tab,string][]).map(([k,l])=><button key={k} className={tab===k?s.active:''} onClick={()=>setTab(k)}>{l}</button>)}
   </nav>

   {tab==='members'&&<section className={s.panel}><div className={s.panelHead}><h2>코드 가입 회원</h2><p>본인 코드 회원만 표시되며 잔액과 계정 동결을 관리할 수 있습니다.</p></div><div className={s.table}><div className={s.th5}><span>회원</span><span>가입일</span><span>USDT Available</span><span>상태</span><span>관리</span></div>{data.members.map(m=>{const frozen=Boolean(m.banned_until&&new Date(m.banned_until).getTime()>Date.now());return <div className={s.tr5} key={m.user_id}><span><b>{m.email}</b><small>{m.user_id.slice(0,12)}…</small></span><span>{new Date(m.joined_at).toLocaleString()}</span><span>{n(m.usdt_available)} USDT<small>Locked {n(m.usdt_locked)} USDT</small></span><span><b className={frozen?s.dangerText:s.goodText}>{frozen?'동결':'정상'}</b></span><span className={s.actions}><button onClick={()=>setMemberBalance(m)}>잔액 설정</button><button className={frozen?s.releaseBtn:s.dangerBtn} onClick={()=>toggleFreeze(m)}>{frozen?'동결 해제':'계정 동결'}</button></span></div>})}</div></section>}

   {tab==='wallet'&&<><section className={s.panel}><div className={s.panelHead}><h2>출금 요청</h2></div><div className={s.table}><div className={s.th5}><span>회원</span><span>금액</span><span>주소</span><span>상태</span><span>처리</span></div>{data.withdrawals.map(w=><div className={s.tr5} key={w.id}><span><b>{w.email}</b><small>{w.asset}/{w.network}</small></span><span>{n(w.amount)} {w.asset}<small>Fee {n(w.fee)}</small></span><span className={s.address}>{w.address}</span><span>{w.status}</span><span className={s.actions}><button onClick={()=>withdrawal(w.id,'APPROVED')}>승인</button><button onClick={()=>withdrawal(w.id,'SENT')}>전송완료</button><button onClick={()=>withdrawal(w.id,'REJECTED')}>거절</button></span></div>)}</div></section><section className={s.panel}><div className={s.panelHead}><h2>입금 내역</h2></div><div className={s.table}><div className={s.th}><span>회원</span><span>자산</span><span>금액</span><span>상태</span></div>{data.deposits.map(d=><div className={s.tr} key={d.id}><span><b>{d.email}</b><small>{new Date(d.created_at).toLocaleString()}</small></span><span>{d.asset}/{d.network}</span><span>{n(d.amount)}</span><span>{d.status}</span></div>)}</div></section></>}

   {tab==='loans'&&<section className={s.panel}><div className={s.panelHead}><h2>코인대출 관리</h2><p>본인 코드 회원의 대출만 승인/거절할 수 있습니다.</p></div><div className={s.table}><div className={s.th5}><span>회원</span><span>Loan</span><span>원금</span><span>상태</span><span>처리</span></div>{data.loans.map(l=><div className={s.tr5} key={l.id}><span><b>{l.email}</b><small>{new Date(l.created_at).toLocaleString()}</small></span><span>{l.loan_no||l.id.slice(0,8)}</span><span>{n(l.principal)} {l.borrow_asset}</span><span>{l.status}</span><span className={s.actions}>{l.status==='PENDING'&&<><button onClick={()=>loan(l.id,true)}>승인</button><button onClick={()=>loan(l.id,false)}>거절</button></>}</span></div>)}</div></section>}

   {tab==='cfd'&&<section className={s.panel}><div className={s.panelHead}><h2>CFD 판정보정</h2><p>ACTIVE 상태의 코드 회원 거래만 보정할 수 있습니다.</p></div><div className={s.table}><div className={s.th5}><span>회원/종목</span><span>방향</span><span>금액</span><span>상태</span><span>판정보정</span></div>{data.cfd_trades.map(t=><div className={s.tr5} key={t.id}><span><b>{t.email}</b><small>{t.symbol} · {new Date(t.starts_at).toLocaleString()}</small></span><span>{t.direction}</span><span>{n(t.amount)}</span><span>{t.status}<small>{t.override_value?'Override '+t.override_value:''}</small></span><span className={s.actions}>{t.status==='ACTIVE'&&<><button onClick={()=>cfdOverride(t.id,'WIN')}>승</button><button onClick={()=>cfdOverride(t.id,'LOSS')}>패</button><button onClick={()=>cfdOverride(t.id,'VOID')}>무효</button><button onClick={()=>cfdOverride(t.id,'AUTO')}>자동</button></>}</span></div>)}</div></section>}

   {tab==='p2p'&&<section className={s.panel}><div className={s.panelHead}><h2>P2P 판매자 승인</h2><p>본인 가입코드 회원이 신청한 P2P 플레이어만 승인·거절·정지할 수 있습니다.</p></div><div className={s.table}><div className={s.th5}><span>회원</span><span>닉네임</span><span>거래조건</span><span>상태</span><span>처리</span></div>{data.p2p_players?.length?data.p2p_players.map(p=><div className={s.tr5} key={p.id}><span><b>{p.email}</b><small>{p.user_id.slice(0,12)}…</small></span><span><b>{p.nickname}</b><small>{p.primary_asset} · 수수료 {Number(p.fee_rate||0).toFixed(2)}%</small></span><span>{n(p.min_order)} ~ {n(p.max_order)} KRW<small>{(p.payment_methods||[]).join(', ')||'결제수단 없음'}</small></span><span><b>{p.status}</b><small>{new Date(p.created_at).toLocaleString()}</small></span><span className={s.actions}><button onClick={()=>setP2PStatus(p,'APPROVED')}>승인</button><button onClick={()=>setP2PStatus(p,'REJECTED')}>거절</button><button onClick={()=>setP2PStatus(p,'SUSPENDED')}>정지</button></span></div>):<div className={s.empty}>P2P 판매자 신청이 없습니다.</div>}</div></section>}

   {tab==='settings'&&<section className={s.panel}><div className={s.panelHead}><h2>코드 전용 입출금 주소</h2><p>이 코드로 가입한 회원에게만 아래 주소가 노출됩니다. 일반 회원의 총어드민 주소에는 영향을 주지 않습니다.</p></div><div className={s.formGrid}><label>Asset<input value={asset} onChange={e=>setAsset(e.target.value.toUpperCase())}/></label><label>Network<input value={network} onChange={e=>setNetwork(e.target.value.toUpperCase())}/></label><label className={s.full}>입금 주소<input value={depositAddress} onChange={e=>setDepositAddress(e.target.value)} placeholder="코드 회원에게 노출할 입금주소"/></label><label className={s.full}>출금 주소<input value={withdrawAddress} onChange={e=>setWithdrawAddress(e.target.value)} placeholder="코드 회원에게 지정할 출금주소"/></label><label className={s.full}>메모<input value={note} onChange={e=>setNote(e.target.value)}/></label><button onClick={saveSettings}>설정 저장</button></div></section>}
   {msg&&<div className={s.toast} onClick={()=>setMsg('')}>{msg}</div>}
  </div>
 </main>;
}
