'use client';

import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import UiIcon from './UiIcon';
import s from './Deposit.module.css';
import {useUnifiedWalletDisplay} from '@/lib/useUnifiedWalletDisplay';

type TokenKey='BTC'|'ETH'|'USDT'|'TRX'|'SOL';
type TokenMeta={name:string;symbol:TokenKey;icon:string};
type NetworkMeta={id:string;name:string;confirmations:number;minDeposit:number};
type DepositRecord={id:string;asset:string;network:string;address:string|null;txid:string|null;amount:number;status:string;created_at:string};
type DepositAddress={id:string;asset:string;network:string;address:string;provider:string;active:boolean;scan_from:string};

const TOKENS:Record<TokenKey,TokenMeta>={
 BTC:{name:'Bitcoin',symbol:'BTC',icon:'B'},
 ETH:{name:'Ethereum',symbol:'ETH',icon:'E'},
 USDT:{name:'Tether',symbol:'USDT',icon:'T'},
 TRX:{name:'TRON',symbol:'TRX',icon:'T'},
 SOL:{name:'Solana',symbol:'SOL',icon:'S'},
};

const FALLBACK:Record<string,NetworkMeta[]>={
 BTC:[{id:'BTC',name:'Bitcoin',confirmations:2,minDeposit:0}],
 ETH:[{id:'ERC20',name:'Ethereum (ERC20)',confirmations:12,minDeposit:0}],
 USDT:[
  {id:'TRC20',name:'TRON (TRC20)',confirmations:20,minDeposit:0},
  {id:'ERC20',name:'Ethereum (ERC20)',confirmations:12,minDeposit:0},
  {id:'BEP20',name:'BNB Smart Chain (BEP20)',confirmations:15,minDeposit:0},
 ],
 TRX:[{id:'TRC20',name:'TRON (TRC20)',confirmations:20,minDeposit:0}],
 SOL:[{id:'SOL',name:'Solana',confirmations:32,minDeposit:0}],
};

const isKycExempt=(asset:string,network:string)=>
 (asset==='USDT'&&network==='TRC20')||(asset==='TRX'&&network==='TRC20');

export default function DepositClient(){
 const wallet=useUnifiedWalletDisplay();
 const supabase=useMemo(()=>createBrowserSupabase(),[]);
 const [token,setToken]=useState<TokenKey|''>('');
 const [network,setNetwork]=useState('');
 const [tokenOpen,setTokenOpen]=useState(false);
 const [query,setQuery]=useState('');
 const [networkMap,setNetworkMap]=useState<Record<string,NetworkMeta[]>>(FALLBACK);
 const [records,setRecords]=useState<DepositRecord[]>([]);
 const [kycStatus,setKycStatus]=useState('NOT_SUBMITTED');
 const [addresses,setAddresses]=useState<DepositAddress[]>([]);
 const [syncing,setSyncing]=useState(false);
 const [syncMessage,setSyncMessage]=useState('');

 const loadRecords=useCallback(async()=>{
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return;
  const {data:rows}=await supabase.from('deposit_records').select('id,asset,network,address,txid,amount,status,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50);
  setRecords((rows||[]) as DepositRecord[]);
 },[supabase]);

 useEffect(()=>{
  (async()=>{
   const {data:nets}=await supabase.from('asset_networks').select('asset,network,display_name,confirmations,min_deposit').eq('active',true).eq('deposit_enabled',true).order('asset');
   if(nets?.length){
    const next:Record<string,NetworkMeta[]>={};
    for(const n of nets){
     if(!next[n.asset])next[n.asset]=[];
     next[n.asset].push({id:n.network,name:n.display_name,confirmations:Number(n.confirmations||0),minDeposit:Number(n.min_deposit||0)});
    }
    setNetworkMap(next);
   }

   const {data:{user}}=await supabase.auth.getUser();
   if(user){
    const {data:access}=await supabase.rpc('user_deposit_access_snapshot');
    const snapshot=(access||{}) as {kyc_status?:string;addresses?:DepositAddress[]};
    setKycStatus(String(snapshot.kyc_status||'NOT_SUBMITTED').toUpperCase());
    setAddresses(Array.isArray(snapshot.addresses)?snapshot.addresses:[]);
    await loadRecords();
   }
  })();
 },[supabase,loadRecords]);

 const nets=useMemo(()=>networkMap[token]||[],[token,networkMap]);
 const filteredTokens=useMemo(()=>Object.values(TOKENS).filter(t=>(networkMap[t.symbol]?.length||0)>0&&((t.symbol+' '+t.name).toLowerCase().includes(query.trim().toLowerCase()))),[query,networkMap]);
 const chooseToken=(t:TokenKey)=>{setToken(t);setNetwork('');setTokenOpen(false);setQuery('');setSyncMessage('')};
 const selectedToken=token?TOKENS[token]:null;
 const exempt=token&&network?isKycExempt(token,network):false;
 const kycApproved=kycStatus==='APPROVED';
 const kycBlocked=Boolean(token&&network&&!exempt&&!kycApproved);
 const selectedAddress=useMemo(()=>addresses.find(a=>a.asset===token&&a.network===network&&a.active)?.address||'',[addresses,token,network]);
 const tronAuto=Boolean(token&&network==='TRC20'&&(token==='USDT'||token==='TRX'));

 useEffect(()=>{
  if(!tronAuto||!selectedAddress)return;
  let stopped=false;
  let timer:ReturnType<typeof setInterval>|undefined;

  const sync=async()=>{
   if(stopped)return;
   setSyncing(true);
   const {data,error}=await supabase.functions.invoke('tron-deposit-sync',{body:{}});
   if(!stopped){
    if(error)setSyncMessage('자동 입금 확인 대기 중');
    else{
     const result=(data||{}) as {credited?:number};
     setSyncMessage(result.credited?String(result.credited)+'건 입금 반영 완료':'TRON 네트워크 자동 확인 중');
     await loadRecords();
    }
    setSyncing(false);
   }
  };

  void sync();
  timer=setInterval(()=>void sync(),20000);
  return()=>{stopped=true;if(timer)clearInterval(timer)};
 },[tronAuto,selectedAddress,supabase,loadRecords]);

 const copyAddress=async()=>{
  if(!selectedAddress)return;
  await navigator.clipboard.writeText(selectedAddress);
  setSyncMessage('입금 주소를 복사했습니다.');
 };

 return <main className={s.page}>
  <div className={s.shell}>
   <div className={s.titleRow}><span>‹</span><h1>Crypto Deposit</h1><div className={s.walletBalanceChip}><small>내 자산</small><b>{wallet.withUnit(wallet.total)}</b></div></div>
   <div className={s.mainGrid}>
    <section className={s.flow}>
      <div className={s.step+' '+(token?s.done:s.active)}><i>1</i><div><b>Select Token</b>
        <div className={s.tokenSelector}>
          <button className={s.tokenTrigger+' '+(tokenOpen?s.open:'')} onClick={()=>setTokenOpen(v=>!v)} type="button">
            <span className={s.tokenTriggerValue}>{selectedToken?<><span className={[s.tokenIcon,s['icon'+selectedToken.symbol]].join(' ')}>{selectedToken.icon}</span><span><strong>{selectedToken.symbol}</strong><small>{selectedToken.name}</small></span></>:<span className={s.placeholder}>Select Token</span>}</span>
            <UiIcon name="chevronDown" size={14}/>
          </button>
          {tokenOpen&&<div className={s.tokenMenu}>
            <div className={s.searchBox}><UiIcon name="search" size={16}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search"/></div>
            <div className={s.tokenList}>{filteredTokens.map(t=><button key={t.symbol} type="button" onClick={()=>chooseToken(t.symbol)} className={token===t.symbol?s.tokenActive:''}>
              <span className={[s.tokenIcon,s['icon'+t.symbol]].join(' ')}>{t.icon}</span>
              <span><strong>{t.symbol}</strong><small>{t.name}</small></span>
            </button>)}{filteredTokens.length===0&&<div className={s.noToken}>No token found</div>}</div>
          </div>}
        </div>
      </div></div>

      <div className={s.step+' '+(!token?s.disabled:network?s.done:s.active)}><i>2</i><div><b>Select Network</b>{token&&<div className={s.networks}>{nets.map(n=>{
       const needsKyc=!isKycExempt(token,n.id);
       return <button key={n.id} onClick={()=>{setNetwork(n.id);setSyncMessage('')}} className={network===n.id?s.selectedCard:''}>
        <span className={s.networkTitle}><strong>{n.name}</strong>{needsKyc&&!kycApproved?<em>KYC Required</em>:isKycExempt(token,n.id)?<em className={s.autoBadge}>Auto Credit</em>:null}</span>
        <small>{n.confirmations} confirmations{n.minDeposit>0?' · Min '+n.minDeposit:''}</small>
       </button>
      })}</div>}</div></div>

      <div className={s.step+' '+(!network?s.disabled:s.active)}><i>3</i><div><b>Deposit Address</b>{network&&(
       kycBlocked?
        <div className={s.kycCard}>
         <span className={s.kycIcon}><UiIcon name="verification" size={18}/></span>
         <div><strong>KYC 인증이 필요합니다.</strong><p>USDT / TRC20 및 TRX 입금을 제외한 네트워크는 KYC 인증 완료 후 입금 주소를 확인할 수 있습니다.</p><small>현재 상태: {kycStatus}</small></div>
         <Link href="/member?view=verification">KYC 인증하기</Link>
        </div>
       :<div className={s.addressCard}>
         <small>{token} · {network}{tronAuto?' · Auto Credit':''}</small>
         {selectedAddress?
          <><strong className={s.depositAddress}>{selectedAddress}</strong><button type="button" onClick={copyAddress}>Copy Address</button>
          {tronAuto&&<div className={s.autoStatus}><span className={syncing?s.syncDotActive:s.syncDot}/><b>{syncMessage||'TRON 네트워크 자동 입금 확인 중'}</b></div>}
          <p>{tronAuto?'입금이 감지되면 네트워크 확인 수 충족 후 잔액에 자동 반영됩니다.':'선택한 네트워크의 입금 주소입니다. 네트워크가 일치하는지 확인한 후 전송하세요.'}</p></>
          :<><strong>Deposit address unavailable</strong><p>{tronAuto?'TRON 자동 입금 주소가 아직 계정에 배정되지 않았습니다. 주소가 표시되기 전에는 자산을 전송하지 마세요.':'현재 선택한 네트워크에서 입금 주소를 사용할 수 없습니다. 주소가 표시되기 전에는 자산을 전송하지 마세요.'}</p></>}
        </div>
      )}</div></div>
    </section>

    <aside className={s.faq}><h3>FAQ</h3><a>How to deposit crypto?</a><a>Why Hasn't My Deposit Been Credited?</a><a>FAQ on Incorrect Deposits</a><a>Fees for Incorrect Deposit and Delisted Coins</a><button>Buy Crypto →</button></aside>
   </div>

   <section className={s.records}>
    <div className={s.recordsTop}><h3>Deposit Records</h3><button>More</button></div>
    <div className={s.tableHead}><span>Token</span><span>Time</span><span>Amount</span><span>Address/Account</span><span>Transfer ID</span><span>Status</span></div>
    {records.length?records.map(r=><div className={s.recordRow} key={r.id}><span><b>{r.asset}</b><small>{r.network}</small></span><span>{new Date(r.created_at).toLocaleString()}</span><span>{Number(r.amount||0).toLocaleString()}</span><span>{r.address||'—'}</span><span>{r.txid||'—'}</span><span><b>{r.status}</b></span></div>):<div className={s.empty}><UiIcon name="order" size={42}/><span>No data</span></div>}
   </section>
  </div>
 </main>
}
