'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import s from './FuturesMarketSelector.module.css';

export type FuturesFeedMarket={
  symbol:string;base:string;displayName:string;lastPrice:number;changePct:number;high24h:number;low24h:number;volume:number;quoteVolume:number;
  markPrice:number;indexPrice:number;fundingRate:number;nextFundingTime:number;bid:number;ask:number;pricePrecision:number;quantityPrecision:number;tradingViewSymbol:string;
};

type Tab='ALL'|'HOT'|'GAINERS';

type Props={
  markets:FuturesFeedMarket[];
  selectedSymbol:string;
  onSelect:(symbol:string)=>void;
};

const fmt=(v:number)=>v>=1000?v.toLocaleString(undefined,{maximumFractionDigits:2}):v>=1?v.toLocaleString(undefined,{maximumFractionDigits:4}):v.toLocaleString(undefined,{maximumFractionDigits:6});
const compact=(v:number)=>new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(v||0);
const priceDigits=(v:number)=>v>=1000?2:v>=1?4:6;

export default function FuturesMarketSelector({markets,selectedSymbol,onSelect}:Props){
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState('');
  const [tab,setTab]=useState<Tab>('ALL');
  const [liveMarkets,setLiveMarkets]=useState<FuturesFeedMarket[]>(markets);
  const root=useRef<HTMLDivElement|null>(null);

  useEffect(()=>{if(markets.length)setLiveMarkets(markets)},[markets]);

  useEffect(()=>{
    let ws:WebSocket|null=null;
    let retry:ReturnType<typeof setTimeout>|null=null;
    let dead=false;
    const connect=()=>{
      if(dead)return;
      ws=new WebSocket('wss://fstream.binance.com/ws/!ticker@arr');
      ws.onmessage=(ev)=>{
        try{
          const arr=JSON.parse(ev.data) as any[];
          if(!Array.isArray(arr))return;
          setLiveMarkets(prev=>{
            const old=new Map(prev.map(x=>[x.symbol,x]));
            return arr
              .filter(x=>typeof x?.s==='string'&&x.s.endsWith('USDT')&&!x.s.includes('_')&&Number(x.c)>0)
              .map(x=>{
                const symbol=String(x.s);const last=Number(x.c);const prior=old.get(symbol);const base=symbol.slice(0,-4);
                return {
                  symbol,base,displayName:`${base}/USDT`,lastPrice:last,changePct:Number(x.P||0),high24h:Number(x.h||0),low24h:Number(x.l||0),volume:Number(x.v||0),quoteVolume:Number(x.q||0),
                  markPrice:prior?.markPrice||last,indexPrice:prior?.indexPrice||last,fundingRate:prior?.fundingRate||0,nextFundingTime:prior?.nextFundingTime||0,bid:Number(x.b||last),ask:Number(x.a||last),
                  pricePrecision:prior?.pricePrecision??priceDigits(last),quantityPrecision:prior?.quantityPrecision??3,tradingViewSymbol:`BINANCE:${symbol}.P`
                } as FuturesFeedMarket;
              })
              .sort((a,b)=>b.quoteVolume-a.quoteVolume);
          });
        }catch{}
      };
      ws.onclose=()=>{if(!dead)retry=setTimeout(connect,1800)};
      ws.onerror=()=>ws?.close();
    };
    connect();
    return()=>{dead=true;if(retry)clearTimeout(retry);ws?.close()};
  },[]);

  useEffect(()=>{
    if(!selectedSymbol)return;
    const ws=new WebSocket(`wss://fstream.binance.com/ws/${selectedSymbol.toLowerCase()}@markPrice@1s`);
    ws.onmessage=(ev)=>{try{const x=JSON.parse(ev.data);setLiveMarkets(prev=>prev.map(m=>m.symbol===selectedSymbol?{...m,markPrice:Number(x.p)||m.markPrice,indexPrice:Number(x.i)||m.indexPrice,fundingRate:Number(x.r)||0,nextFundingTime:Number(x.T)||m.nextFundingTime}:m))}catch{}};
    return()=>ws.close();
  },[selectedSymbol]);

  useEffect(()=>{
    const close=(e:MouseEvent)=>{if(root.current&&!root.current.contains(e.target as Node))setOpen(false)};
    document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close);
  },[]);

  const selected=liveMarkets.find(x=>x.symbol===selectedSymbol)||markets.find(x=>x.symbol===selectedSymbol)||liveMarkets[0]||markets[0]||null;
  const rows=useMemo(()=>{
    const q=query.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
    let out=liveMarkets.filter(m=>!q||m.symbol.includes(q)||m.base.includes(q)||m.displayName.replace('/','').includes(q));
    if(tab==='HOT')out=[...out].sort((a,b)=>b.quoteVolume-a.quoteVolume).slice(0,80);
    if(tab==='GAINERS')out=[...out].sort((a,b)=>b.changePct-a.changePct).slice(0,80);
    return out;
  },[liveMarkets,query,tab]);

  return <div className={s.wrap} ref={root}>
    <button type="button" className={s.trigger} onClick={()=>setOpen(v=>!v)} aria-expanded={open}>
      <span className={s.badge}>{(selected?.base||'BTC').slice(0,2)}</span>
      <span className={s.triggerText}><b>{selected?.displayName||'BTC/USDT'}</b><small>USDT-M · Perpetual</small></span>
      <span className={`${s.chevron} ${open?s.open:''}`}>⌄</span>
    </button>
    {open&&<div className={s.panel}>
      <div className={s.top}><div><strong>선물 종목 선택</strong><span>Binance USDT-M Perpetual {liveMarkets.length.toLocaleString()}개</span></div><button onClick={()=>setOpen(false)}>×</button></div>
      <div className={s.search}><span>⌕</span><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="코인명 또는 심볼 검색"/><kbd>USDT-M</kbd></div>
      <div className={s.tabs}><button className={tab==='ALL'?s.active:''} onClick={()=>setTab('ALL')}>전체</button><button className={tab==='HOT'?s.active:''} onClick={()=>setTab('HOT')}>거래량 상위</button><button className={tab==='GAINERS'?s.active:''} onClick={()=>setTab('GAINERS')}>상승률 상위</button></div>
      <div className={s.head}><span>종목 / 거래대금</span><span>현재가</span><span>24H</span></div>
      <div className={s.list}>{rows.length?rows.map(m=><button type="button" key={m.symbol} className={`${s.row} ${m.symbol===selectedSymbol?s.selected:''}`} onClick={()=>{onSelect(m.symbol);setOpen(false);setQuery('')}}>
        <span className={s.pair}><span className={s.coin}>{m.base.slice(0,2)}</span><span><b>{m.base}<i>/USDT</i></b><small>{compact(m.quoteVolume)} USDT</small></span></span>
        <span className={s.price}>{fmt(m.lastPrice)}</span>
        <span className={m.changePct>=0?s.up:s.down}>{m.changePct>=0?'+':''}{m.changePct.toFixed(2)}%</span>
      </button>):<div className={s.empty}>실시간 Binance Futures 종목을 연결 중입니다.</div>}</div>
    </div>}
  </div>;
}
