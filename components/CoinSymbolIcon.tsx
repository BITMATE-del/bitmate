'use client';

import {useState} from 'react';

type Props={symbol:string;className?:string};
/** Official ticker artwork where available; never substitute another coin's identity. */
export default function CoinSymbolIcon({symbol,className}:Props){
  const [failed,setFailed]=useState(false);
  const raw=symbol.toUpperCase().replace(/(?:USDT|USDC|USD)$/,'');
  // Binance multiplier contracts (1000CAT, 1000CHEEMS...) use their underlying coin ticker.
  const base=raw.replace(/^1000(?=[A-Z])/,'');
  const ticker=base.toLowerCase();
  const src=/^[a-z0-9]{2,18}$/.test(ticker)
    ?`https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${ticker}.png`:'';
  return <span className={className} style={{overflow:'hidden',flexShrink:0}}>
    {!failed&&src?<img key={src} src={src} alt={`${base} 로고`} loading="lazy" width="100%" height="100%"
      style={{display:'block',width:'100%',height:'100%',objectFit:'contain'}}
      onError={()=>setFailed(true)}/>:<span aria-hidden="true">{base.slice(0,2)}</span>}
  </span>;
}
