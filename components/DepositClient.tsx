'use client';

import {useMemo,useState} from 'react';
import s from './Deposit.module.css';

type TokenKey='BTC'|'ETH'|'USDT'|'TRX'|'SOL';
type TokenMeta={name:string;symbol:TokenKey;icon:string};

const TOKENS:Record<TokenKey,TokenMeta>={
 BTC:{name:'Bitcoin',symbol:'BTC',icon:'₿'},
 ETH:{name:'Ethereum',symbol:'ETH',icon:'◆'},
 USDT:{name:'Tether',symbol:'USDT',icon:'₮'},
 TRX:{name:'TRON',symbol:'TRX',icon:'T'},
 SOL:{name:'Solana',symbol:'SOL',icon:'S'},
};

const NETWORKS:Record<string,{id:string;name:string;confirmations:number;fee:string}[]>={
 BTC:[{id:'BTC',name:'Bitcoin',confirmations:2,fee:'Network fee applies'}],
 ETH:[{id:'ERC20',name:'Ethereum (ERC20)',confirmations:12,fee:'Network fee applies'}],
 USDT:[
  {id:'TRC20',name:'TRON (TRC20)',confirmations:20,fee:'Network fee applies'},
  {id:'ERC20',name:'Ethereum (ERC20)',confirmations:12,fee:'Network fee applies'},
  {id:'BEP20',name:'BNB Smart Chain (BEP20)',confirmations:15,fee:'Network fee applies'},
 ],
 TRX:[{id:'TRC20',name:'TRON (TRC20)',confirmations:20,fee:'Network fee applies'}],
 SOL:[{id:'SOL',name:'Solana',confirmations:32,fee:'Network fee applies'}],
};

export default function DepositClient(){
 const [token,setToken]=useState<TokenKey|''>('');
 const [network,setNetwork]=useState('');
 const [tokenOpen,setTokenOpen]=useState(false);
 const [query,setQuery]=useState('');
 const nets=useMemo(()=>NETWORKS[token]||[],[token]);
 const filteredTokens=useMemo(()=>Object.values(TOKENS).filter(t=>`${t.symbol} ${t.name}`.toLowerCase().includes(query.trim().toLowerCase())),[query]);
 const fakeAddress=token&&network?`${token}-${network}-DEPOSIT-ADDRESS-WILL-BE-ASSIGNED`:'--';
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
            <span className={s.chevron}>{tokenOpen?'▴':'▾'}</span>
          </button>
          {tokenOpen&&<div className={s.tokenMenu}>
            <div className={s.searchBox}><span>⌕</span><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search"/></div>
            <div className={s.tokenList}>{filteredTokens.map(t=><button key={t.symbol} type="button" onClick={()=>chooseToken(t.symbol)} className={token===t.symbol?s.tokenActive:''}>
              <span className={`${s.tokenIcon} ${s[`icon${t.symbol}`]}`}>{t.icon}</span>
              <span><strong>{t.symbol}</strong><small>{t.name}</small></span>
            </button>)}{filteredTokens.length===0&&<div className={s.noToken}>No token found</div>}</div>
          </div>}
        </div>
      </div></div>
      <div className={`${s.step} ${!token?s.disabled:network?s.done:s.active}`}><i>2</i><div><b>Select Network</b>{token&&<div className={s.networks}>{nets.map(n=><button key={n.id} onClick={()=>setNetwork(n.id)} className={network===n.id?s.selectedCard:''}><strong>{n.name}</strong><small>{n.confirmations} confirmations</small></button>)}</div>}</div></div>
      <div className={`${s.step} ${!network?s.disabled:s.active}`}><i>3</i><div><b>Deposit Address</b>{network&&<div className={s.addressCard}><small>{token} · {network}</small><strong>{fakeAddress}</strong><button onClick={()=>navigator.clipboard?.writeText(fakeAddress)}>Copy Address</button><p>Send only {token} using the selected network. Deposits sent using another network may not be credited.</p></div>}</div></div>
    </section>
    <aside className={s.faq}><h3>FAQ</h3><a>How to deposit crypto?</a><a>Why Hasn't My Deposit Been Credited?</a><a>FAQ on Incorrect Deposits</a><a>Fees for Incorrect Deposit and Delisted Coins</a><button>Buy Crypto →</button></aside>
   </div>
   <section className={s.records}><div className={s.recordsTop}><h3>Deposit Records</h3><button>More ›</button></div><div className={s.tableHead}><span>Token</span><span>Time</span><span>Amount</span><span>Address/Account</span><span>Transfer ID</span><span>Status</span></div><div className={s.empty}><strong>▣</strong><span>No data</span></div></section>
  </div>
 </main>
}
