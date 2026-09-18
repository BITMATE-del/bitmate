'use client';

import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import UiIcon from './UiIcon';
import s from './Deposit.module.css';

type TokenKey='BTC'|'ETH'|'USDT'|'TRX'|'SOL';
type TokenMeta={name:string;symbol:TokenKey;icon:string};
type NetworkMeta={id:string;name:string;confirmations:number;minDeposit:number};
type DepositRecord={id:string;asset:string;network:string;address:string|null;txid:string|null;amount:number;status:string;created_at:string};

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

export default function DepositClient(){
 const supabase=useMemo(()=>createBrowserSupabase(),[]);
 const [token,setToken]=useState<TokenKey|''>('');
 const [network,setNetwork]=useState('');
 const [tokenOpen,setTokenOpen]=useState(false);
 const [query,setQuery]=useState('');
 const [networkMap,setNetworkMap]=useState<Record<string,NetworkMeta[]>>(FALLBACK);
 const [records,setRecords]=useState<DepositRecord[]>([]);

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
    const {data:rows}=await supabase.from('deposit_records').select('id,asset,network,address,txid,amount,status,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50);
    setRecords((rows||[]) as DepositRecord[]);
   }
  })();
 },[supabase]);

 const nets=useMemo(()=>networkMap[token]||[],[token,networkMap]);
 const filteredTokens=useMemo(()=>Object.values(TOKENS).filter(t=>(networkMap[t.symbol]?.length||0)>0&&`${t.symbol} ${t.name}`.toLowerCase().includes(query.trim().toLowerCase())),[query,networkMap]);
 const chooseToken=(t:TokenKey)=>{setToken(t);setNetwork('');setTokenOpen(false);setQuery('')};
 const selectedToken=token?TOKENS[token]:null;

 return <main className={s.page}>
  <div className={s.shell}>
   <div className={s.titleRow}><span>‹</span><h1>Crypto Deposit</h1></div>
   <div className={s.mainGrid}>
    <section className={s.flow}>
      <div className={`${s.step} ${token?s.done:s.active}`}><i>1</i><div><b>Select Token</b>
        <div className={s.tokenSelector}>
          <button className={`${s.tokenTrigger} ${tokenOpen?s.open:''}`} onClick={()=>setTokenOpen(v=>!v)} type="button">
            <span className={s.tokenTriggerValue}>{selectedToken?<><span className={`${s.tokenIcon} ${s[`icon${selectedToken.symbol}`]}`}>{selectedToken.icon}</span><span><strong>{selectedToken.symbol}</strong><small>{selectedToken.name}</small></span></>:<span className={s.placeholder}>Select Token</span>}</span>
            <UiIcon name="chevronDown" size={14}/>
          </button>
          {tokenOpen&&<div className={s.tokenMenu}>
            <div className={s.searchBox}><UiIcon name="search" size={16}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search"/></div>
            <div className={s.tokenList}>{filteredTokens.map(t=><button key={t.symbol} type="button" onClick={()=>chooseToken(t.symbol)} className={token===t.symbol?s.tokenActive:''}>
              <span className={`${s.tokenIcon} ${s[`icon${t.symbol}`]}`}>{t.icon}</span>
              <span><strong>{t.symbol}</strong><small>{t.name}</small></span>
            </button>)}{filteredTokens.length===0&&<div className={s.noToken}>No token found</div>}</div>
          </div>}
        </div>
      </div></div>

      <div className={`${s.step} ${!token?s.disabled:network?s.done:s.active}`}><i>2</i><div><b>Select Network</b>{token&&<div className={s.networks}>{nets.map(n=><button key={n.id} onClick={()=>setNetwork(n.id)} className={network===n.id?s.selectedCard:''}><strong>{n.name}</strong><small>{n.confirmations} confirmations{n.minDeposit>0?` · Min ${n.minDeposit}`:''}</small></button>)}</div>}</div></div>

      <div className={`${s.step} ${!network?s.disabled:s.active}`}><i>3</i><div><b>Deposit Address</b>{network&&<div className={s.addressCard}><small>{token} · {network}</small><strong>Deposit address assignment pending</strong><p>지원 네트워크는 관리자 설정과 연동되어 있습니다. 실제 입금 주소는 지갑/커스터디 공급자 연동 후 사용자별로 발급되며, 유효한 주소가 발급되기 전에는 자산을 전송하지 마세요.</p></div>}</div></div>
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
