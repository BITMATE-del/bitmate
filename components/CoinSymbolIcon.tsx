'use client';

import {useMemo,useState} from 'react';

type Props={symbol:string;className?:string};

// Explicit chain identity mapping prevents confusing tokens with the same ticker.
const chainIds:Record<string,string>={
  BTC:'bitcoin',ETH:'ethereum',XRP:'ripple',SOL:'solana',DOGE:'dogecoin',
  TRX:'tron',LTC:'litecoin',BCH:'bitcoincash',ADA:'cardano',DOT:'polkadot',
  AVAX:'avalanchec',BNB:'smartchain',ATOM:'cosmos',ETC:'ethereumclassic',
  XLM:'stellar',XMR:'monero',NEAR:'near',APT:'aptos',SUI:'sui',TON:'ton',
  FIL:'filecoin',HBAR:'hedera',ALGO:'algorand',ICP:'internetcomputer',
  ZEC:'zcash',DASH:'dash',VET:'vechain',EOS:'eos',XTZ:'tezos',
  EGLD:'elrond',KAVA:'kava',FLOW:'flow',ONE:'harmony'
};
const valid=/^[a-z0-9]{2,18}$/;
const legacy='https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/';
const trust='https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/';

export default function CoinSymbolIcon({symbol,className}:Props){
  const raw=symbol.toUpperCase().replace(/(?:USDT|USDC|USD)$/,'');
  const base=raw.replace(/^1000(?=[A-Z])/,'');
  const sources=useMemo(()=>{
    const ticker=base.toLowerCase();
    if(!valid.test(ticker))return [];
    const paths=[
      `${legacy}${ticker}.png`,
      ...(chainIds[base]?[`${trust}${chainIds[base]}/info/logo.png`]:[]),
      // Additional independent icon catalog; failure falls back to the ticker badge.
      `https://assets.coincap.io/assets/icons/${ticker}@2x.png`
    ];
    return [...new Set(paths)];
  },[base]);
  const [attempt,setAttempt]=useState(0);
  const current=sources[attempt];
  return <span className={className} style={{overflow:'hidden',flexShrink:0}}>
    {current?<img key={current} src={current} alt={`${base} 로고`} loading="lazy"
      style={{display:'block',width:'100%',height:'100%',objectFit:'contain'}}
      onError={()=>setAttempt(i=>i+1)}/>:<span aria-hidden="true">{base.slice(0,2)}</span>}
  </span>;
}
