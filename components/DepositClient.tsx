'use client';

import {useMemo,useState} from 'react';
import s from './Deposit.module.css';

const TOKENS={BTC:['Bitcoin','BTC'],ETH:['Ethereum','ETH'],USDT:['Tether','USDT'],SOL:['Solana','SOL']} as const;
const NETWORKS:Record<string,{id:string;name:string;confirmations:number;fee:string}[]>={
 BTC:[{id:'BTC',name:'Bitcoin',confirmations:2,fee:'Network fee applies'}],
 ETH:[{id:'ERC20',name:'Ethereum (ERC20)',confirmations:12,fee:'Network fee applies'}],
 USDT:[{id:'TRC20',name:'Tron (TRC20)',confirmations:20,fee:'Network fee applies'},{id:'ERC20',name:'Ethereum (ERC20)',confirmations:12,fee:'Network fee applies'},{id:'BEP20',name:'BNB Smart Chain (BEP20)',confirmations:15,fee:'Network fee applies'}],
 SOL:[{id:'SOL',name:'Solana',confirmations:32,fee:'Network fee applies'}],
};

export default function DepositClient(){
 const [token,setToken]=useState('');const [network,setNetwork]=useState('');
 const nets=useMemo(()=>NETWORKS[token]||[],[token]);
 const fakeAddress=token&&network?`${token}-${network}-DEPOSIT-ADDRESS-WILL-BE-ASSIGNED`:'--';
 const chooseToken=(t:string)=>{setToken(t);setNetwork('')};
 return <main className={s.page}>
  <div className={s.shell}>
   <div className={s.titleRow}><span>‹</span><h1>Crypto Deposit</h1></div>
   <div className={s.mainGrid}>
    <section className={s.flow}>
      <div className={`${s.step} ${token?s.done:s.active}`}><i>1</i><div><b>Select Token</b><div className={s.selectWrap}><select value={token} onChange={e=>chooseToken(e.target.value)}><option value="">Select Token</option>{Object.entries(TOKENS).map(([k,v])=><option key={k} value={k}>{v[0]} ({k})</option>)}</select></div><div className={s.quick}>{Object.keys(TOKENS).map(t=><button key={t} onClick={()=>chooseToken(t)} className={token===t?s.selected:''}>{t}</button>)}</div></div></div>
      <div className={`${s.step} ${!token?s.disabled:network?s.done:s.active}`}><i>2</i><div><b>Select Network</b>{token&&<div className={s.networks}>{nets.map(n=><button key={n.id} onClick={()=>setNetwork(n.id)} className={network===n.id?s.selectedCard:''}><strong>{n.name}</strong><small>{n.confirmations} confirmations</small></button>)}</div>}</div></div>
      <div className={`${s.step} ${!network?s.disabled:s.active}`}><i>3</i><div><b>Deposit Address</b>{network&&<div className={s.addressCard}><small>{token} · {network}</small><strong>{fakeAddress}</strong><button onClick={()=>navigator.clipboard?.writeText(fakeAddress)}>Copy Address</button><p>Send only {token} using the selected network. Deposits sent using another network may not be credited.</p></div>}</div></div>
    </section>
    <aside className={s.faq}><h3>FAQ</h3><a>How to deposit crypto?</a><a>Why Hasn't My Deposit Been Credited?</a><a>FAQ on Incorrect Deposits</a><a>Fees for Incorrect Deposit and Delisted Coins</a><button>Buy Crypto →</button></aside>
   </div>
   <section className={s.records}><div className={s.recordsTop}><h3>Deposit Records</h3><button>More ›</button></div><div className={s.tableHead}><span>Token</span><span>Time</span><span>Amount</span><span>Address/Account</span><span>Transfer ID</span><span>Status</span></div><div className={s.empty}><strong>▣</strong><span>No data</span></div></section>
  </div>
 </main>
}
