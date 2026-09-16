'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import s from './CfdMarketSelector.module.css';

export type LiveMarket={
  symbol:string;base:string;displayName:string;lastPrice:number;priceChange:number;changePct:number;high24h:number;low24h:number;volume:number;quoteVolume:number;bid:number;ask:number;
};

type ProductLike={id:string;symbol:string;display_name:string};

type Props={
  products:ProductLike[];
  selected:ProductLike|null;
  onSelect:(p:ProductLike)=>void;
  onMarkets?:(markets:LiveMarket[])=>void;
};

const priceFmt=(v:number)=>v>=1000?v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}):v>=1?v.toLocaleString(undefined,{minimumFractionDigits:4,maximumFractionDigits:4}):v.toLocaleString(undefined,{minimumFractionDigits:6,maximumFractionDigits:6});
const compact=(v:number)=>new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(v||0);

export default function CfdMarketSelector({products,selected,onSelect,onMarkets}:Props){
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState('');
  const [markets,setMarkets]=useState<LiveMarket[]>([]);
  const rootRef=useRef<HTMLDivElement|null>(null);

  useEffect(()=>{
    let dead=false;
    const load=async()=>{
      try{
        const r=await fetch('/api/cfd/markets',{cache:'no-store'});
        if(!r.ok)return;
        const j=await r.json();
        if(dead)return;
        const rows=(j.markets||[]) as LiveMarket[];
        setMarkets(rows);onMarkets?.(rows);
      }catch{}
    };
    load();const id=setInterval(load,10000);
    return()=>{dead=true;clearInterval(id)};
  },[onMarkets]);

  useEffect(()=>{
    const fn=(e:MouseEvent)=>{if(rootRef.current&&!rootRef.current.contains(e.target as Node))setOpen(false)};
    document.addEventListener('mousedown',fn);return()=>document.removeEventListener('mousedown',fn);
  },[]);

  const productMap=useMemo(()=>new Map(products.map(p=>[p.symbol,p])),[products]);
  const rows=useMemo(()=>{
    const q=query.trim().toUpperCase();
    return markets.filter(m=>productMap.has(m.symbol)&&(!q||m.symbol.includes(q)||m.base.includes(q))).slice(0,500);
  },[markets,productMap,query]);

  return <div className={s.wrap} ref={rootRef}>
    <button type="button" className={s.trigger} onClick={()=>setOpen(v=>!v)} aria-expanded={open}>
      <span className={s.triggerMain}>{selected?.display_name||'BTC/USDT'} <span className={s.chevron}>▼</span></span>
    </button>
    {open&&<div className={s.panel}>
      <div className={s.search}><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="코인 또는 심볼 검색"/></div>
      <div className={s.tabs}><button className={s.active}>USDT</button><button>HOT COIN</button><button>전체</button></div>
      <div className={s.head}><span>Pairs / Volume</span><span style={{textAlign:'right'}}>Last Price</span><span style={{textAlign:'right'}}>24H Change</span></div>
      <div className={s.list}>
        {rows.length?rows.map(m=>{
          const p=productMap.get(m.symbol)!;
          return <div className={s.row} key={m.symbol} onClick={()=>{onSelect(p);setOpen(false);setQuery('')}}>
            <div className={s.pair}><span className={s.coin}>{m.base.slice(0,2)}</span><span className={s.pairText}><b>{m.base}<span style={{color:'#6f7d83',fontWeight:500}}>/USDT</span></b><span>{compact(m.quoteVolume)} USDT</span></span></div>
            <span className={s.price}>{priceFmt(m.lastPrice)}</span>
            <span className={`${s.change} ${m.changePct>=0?s.up:s.down}`}>{m.changePct>=0?'+':''}{m.changePct.toFixed(2)}%</span>
          </div>
        }):<div className={s.empty}>검색 결과가 없습니다.</div>}
      </div>
    </div>}
  </div>;
}
