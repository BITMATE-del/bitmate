'use client';

import {siteConfirm,sitePrompt} from './SiteDialog';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import UiIcon from './UiIcon';
import {useUnifiedWalletDisplay} from '@/lib/useUnifiedWalletDisplay';
import s from './WalletActions.module.css';

type Balance={asset:string;available:number;locked:number};
type Network={asset:string;network:string;display_name:string;min_withdraw:number;withdraw_fee:number};
type Withdrawal={id:string;asset:string;network:string;address:string;amount:number;fee:number;status:string;txid:string|null;note:string|null;created_at:string};
type Transfer={id:string;asset:string;from_account:string;to_account:string;amount:number;status:string;reference_id:string;created_at:string};
type Snapshot={spot:Balance[];futures_usdt:number;withdrawals:Withdrawal[];transfers:Transfer[];withdraw_networks:Network[]};

const errorText=(m:string)=>{
 if(m.includes('withdraw_disabled'))return '현재 출금 서비스가 일시 중지되어 있습니다.';
 if(m.includes('network_not_available'))return '현재 출금 가능한 네트워크가 아닙니다.';
 if(m.includes('below_minimum'))return '최소 출금 수량보다 작습니다.';
 if(m.includes('insufficient_balance'))return '사용 가능 잔액이 부족합니다.';
 if(m.includes('insufficient_spot_balance'))return 'Spot USDT 잔액이 부족합니다.';
 if(m.includes('insufficient_futures_balance'))return 'Futures USDT 잔액이 부족합니다.';
 if(m.includes('unified_wallet_no_transfer_required'))return 'BITMATE는 통합 지갑을 사용하므로 계정 간 이체가 필요하지 않습니다.';
 return m;
};

export default function WalletActionsClient({mode}:{mode:'withdraw'|'transfer'}){
 const supabase=useMemo(()=>createBrowserSupabase(),[]);
 const wallet=useUnifiedWalletDisplay();
 const [snap,setSnap]=useState<Snapshot>({spot:[],futures_usdt:0,withdrawals:[],transfers:[],withdraw_networks:[]});
 const [loading,setLoading]=useState(true);
 const [asset,setAsset]=useState('USDT');
 const [network,setNetwork]=useState('');
 const [address,setAddress]=useState('');
 const [amount,setAmount]=useState('');
 const [from,setFrom]=useState<'SPOT'|'FUTURES'>('SPOT');
 const [to,setTo]=useState<'SPOT'|'FUTURES'>('FUTURES');
 const [busy,setBusy]=useState(false);
 const [msg,setMsg]=useState('');

 async function load(){
  setLoading(true);
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){location.href='/auth';return}
  const {data,error}=await supabase.rpc('user_wallet_snapshot');
  setLoading(false);
  if(error){setMsg(errorText(error.message));return}
  const next=(data||{}) as Snapshot; setSnap(next);
  if(mode==='withdraw'){
   const first=next.withdraw_networks?.[0];
   if(first){setAsset(first.asset);setNetwork(first.network)}
  }
 }
 useEffect(()=>{load()},[]);

 const assetBalance=useMemo(()=>snap.spot.find(x=>x.asset===asset),[snap.spot,asset]);
 const networks=useMemo(()=>snap.withdraw_networks.filter(n=>n.asset===asset),[snap.withdraw_networks,asset]);
 const selectedNetwork=networks.find(n=>n.network===network);
 const available=from==='SPOT'?Number(snap.spot.find(x=>x.asset==='USDT')?.available||0):Number(snap.futures_usdt||0);

 const chooseAsset=(v:string)=>{setAsset(v);const n=snap.withdraw_networks.find(x=>x.asset===v);setNetwork(n?.network||'')};
 const swap=()=>{setFrom(to);setTo(from)};
 const submitTransfer=async()=>{
  const n=Number(amount); if(!Number.isFinite(n)||n<=0)return setMsg('이체 금액을 입력하세요.');
  setBusy(true);setMsg('');
  const {error}=await supabase.rpc('user_internal_transfer',{p_from:from,p_to:to,p_amount:n});
  setBusy(false);
  if(error)return setMsg(errorText(error.message));
  setAmount('');setMsg('계정 간 이체가 완료되었습니다.');await load();
 };
 const submitWithdraw=async()=>{
  const n=Number(amount); if(!network)return setMsg('네트워크를 선택하세요.');
  if(!address.trim())return setMsg('출금 주소를 입력하세요.');
  if(!Number.isFinite(n)||n<=0)return setMsg('출금 수량을 입력하세요.');
  const fee=Number(selectedNetwork?.withdraw_fee||0);
  if(!(await siteConfirm(`${asset} ${n.toLocaleString()}\nNetwork: ${network}\nFee: ${fee}\nAddress: ${address}\n\n출금 요청을 제출할까요?`,{title:'출금 요청 확인'})))return;
  setBusy(true);setMsg('');
  const {error}=await supabase.rpc('user_create_withdrawal_request',{p_asset:asset,p_network:network,p_address:address.trim(),p_amount:n});
  setBusy(false);
  if(error)return setMsg(errorText(error.message));
  setAddress('');setAmount('');setMsg('출금 요청이 접수되었습니다. 진행 상태는 아래 출금 내역에서 확인할 수 있습니다.');await load();
 };

 if(loading)return <main className={s.page}><div className={s.shell}><div className={s.loading}>Wallet loading...</div></div></main>;

 return <main className={s.page}><div className={s.shell}>
  <header className={s.head}>
   <div><span>BITMATE WALLET</span><h1>{mode==='withdraw'?'Crypto Withdrawal':'Account Transfer'}</h1><p>{mode==='withdraw'?'출금 네트워크와 수량을 확인한 뒤 출금 요청을 제출하세요.':'모든 거래 메뉴가 하나의 통합 지갑 잔액을 사용합니다.'}</p></div>
   <div className={s.headActions}><Link href="/account?view=spot">Wallet Center</Link><Link href="/deposit">Deposit</Link></div>
  </header>

  {mode==='withdraw'?<>
   <section className={s.grid}>
    <div className={s.formCard}>
     <div className={s.formTitle}><UiIcon name="withdraw" size={20}/><div><h2>Withdraw</h2><p>사용 가능한 네트워크만 표시됩니다.</p></div></div>
     <label>Asset<select value={asset} onChange={e=>chooseAsset(e.target.value)}>{Array.from(new Set(snap.withdraw_networks.map(n=>n.asset))).map(a=><option value={a} key={a}>{a}</option>)}</select></label>
     <div className={s.available}>Available <b>{Number(assetBalance?.available||0).toLocaleString()} {asset}</b><span>Locked {Number(assetBalance?.locked||0).toLocaleString()}</span></div>
     <label>Network<select value={network} onChange={e=>setNetwork(e.target.value)}>{networks.map(n=><option value={n.network} key={n.network}>{n.display_name}</option>)}</select></label>
     <label>Withdrawal Address<input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Enter withdrawal address"/></label>
     <label>Amount<div className={s.amount}><input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal" placeholder="0.00"/><button onClick={()=>setAmount(String(Math.max(0,Number(assetBalance?.available||0)-Number(selectedNetwork?.withdraw_fee||0))))}>MAX</button><span>{asset}</span></div></label>
     <div className={s.summary}><span>Minimum <b>{Number(selectedNetwork?.min_withdraw||0).toLocaleString()} {asset}</b></span><span>Network fee <b>{Number(selectedNetwork?.withdraw_fee||0).toLocaleString()} {asset}</b></span><span>You receive <b>{Math.max(0,Number(amount||0)).toLocaleString()} {asset}</b></span></div>
     <button className={s.submit} disabled={busy||!snap.withdraw_networks.length} onClick={submitWithdraw}>{busy?'Processing...':snap.withdraw_networks.length?'Submit Withdrawal':'Withdrawal Unavailable'}</button>
     <p className={s.notice}>출금 처리 완료 후 거래 ID(TXID)가 출금 내역에 표시됩니다. 네트워크와 주소를 반드시 확인하세요.</p>
    </div>
    <aside className={s.sideCard}><h3>Security Checklist</h3><p>네트워크와 주소를 반드시 확인하세요.</p><p>잘못된 네트워크 또는 주소로 전송된 자산은 복구가 어려울 수 있습니다.</p><Link href="/member?view=security">Security Center</Link></aside>
   </section>

   <section className={s.history}><div className={s.historyHead}><h2>Withdrawal History</h2><button onClick={load}>Refresh</button></div>
    <div className={s.tableHead}><span>Asset</span><span>Time</span><span>Amount</span><span>Address</span><span>TXID</span><span>Status</span></div>
    {snap.withdrawals.length?snap.withdrawals.map(r=><div className={s.row} key={r.id}><span><b>{r.asset}</b><small>{r.network}</small></span><span>{new Date(r.created_at).toLocaleString()}</span><span>{Number(r.amount).toLocaleString()}<small>Fee {Number(r.fee).toLocaleString()}</small></span><span>{r.address}</span><span>{r.txid||'—'}</span><span><b className={r.status==='SENT'?s.good:r.status==='REJECTED'||r.status==='FAILED'?s.bad:s.warn}>{r.status}</b>{r.note&&<small>{r.note}</small>}</span></div>):<div className={s.empty}>No withdrawal history</div>}
   </section>
  </>:<>
   <section className={s.grid}>
    <div className={s.formCard}>
     <div className={s.formTitle}><UiIcon name="wallet" size={20}/><div><h2>Unified Wallet</h2><p>BITMATE 모든 거래 메뉴가 하나의 지갑 잔액을 공유합니다.</p></div></div>
     <div className={s.available}>내 자산 <b>{wallet.withUnit(wallet.total)}</b><span>Available {wallet.withUnit(wallet.available)} · Locked {wallet.withUnit(wallet.locked)}</span></div>
     <p className={s.notice}>Spot, Futures, CFD, AI, Copy Trading, Index 등에서 별도 계정 이체 없이 동일한 통합 지갑을 사용합니다.</p>
     <div className={s.headActions}><Link href="/deposit">Deposit</Link><Link href="/account?view=overview">Wallet Center</Link></div>
    </div>
    <aside className={s.balanceCard}><h3>Wallet Status</h3><div><span>통합 잔액</span><b>{wallet.withUnit(wallet.total)}</b></div><div><span>사용 가능</span><b>{wallet.withUnit(wallet.available)}</b></div><div><span>잠금</span><b>{wallet.withUnit(wallet.locked)}</b></div></aside>
   </section>
  </>}

  {msg&&<div className={s.toast} onClick={()=>setMsg('')}>{msg}</div>}
 </div></main>
}
