'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import s from './CfdMarketSelector.module.css';

export type LiveMarket={
  symbol:string;base:string;displayName:string;tradingViewSymbol?:string;lastPrice:number;priceChange:number;changePct:number;high24h:number;low24h:number;volume:number;quoteVolume:number;bid:number;ask:number;
};

type ProductLike={id:string;symbol:string;display_name:string};

type Props={
  products:ProductLike[];
  selected:ProductLike|null;
  onSelect:(p:ProductLike)=>void;
  onMarkets?:(markets:LiveMarket[])=>void;
};

type Tab='ALL'|'HOT'|'GAINERS';

const priceFmt=(v:number)=>!Number.isFinite(v)||v<=0?'—':v>=1000?v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}):v>=1?v.toLocaleString(undefined,{minimumFractionDigits:4,maximumFractionDigits:4}):v.toLocaleString(undefined,{minimumFractionDigits:6,maximumFractionDigits:6});
const compact=(v:number)=>!Number.isFinite(v)||v<=0?'—':new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(v);

export default function CfdMarketSelector({products,selected,onSelect,onMarkets}:Props){
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState('');
  const [tab,setTab]=useState<Tab>('ALL');
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
    load();
    const id=setInterval(load,30000);
    return()=>{dead=true;clearInterval(id)};
  },[onMarkets]);

  useEffect(()=>{
    let ws:WebSocket|null=null;
    let retry:ReturnType<typeof setTimeout>|null=null;
    let dead=false;
    const connect=()=>{
      if(dead)return;
      ws=new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');
      ws.onmessage=(ev)=>{
        try{
          const incoming=JSON.parse(ev.data) as any[];
          if(!Array.isArray(incoming))return;
          setMarkets(prev=>{
            if(!prev.length)return prev;
            const patch=new Map(incoming.map(x=>[String(x.s),x]));
            let changed=false;
            const next=prev.map(m=>{
              const x=patch.get(m.symbol);
              if(!x)return m;
              changed=true;
              return {...m,lastPrice:Number(x.c),priceChange:Number(x.p),changePct:Number(x.P),high24h:Number(x.h),low24h:Number(x.l),volume:Number(x.v),quoteVolume:Number(x.q),bid:Number(x.b),ask:Number(x.a)};
            });
            if(changed)onMarkets?.(next);
            return changed?next:prev;
          });
        }catch{}
      };
      ws.onclose=()=>{if(!dead)retry=setTimeout(connect,2000)};
      ws.onerror=()=>ws?.close();
    };
    connect();
    return()=>{dead=true;if(retry)clearTimeout(retry);ws?.close()};
  },[onMarkets]);

  useEffect(()=>{
    const fn=(e:MouseEvent)=>{if(rootRef.current&&!rootRef.current.contains(e.target as Node))setOpen(false)};
    document.addEventListener('mousedown',fn);return()=>document.removeEventListener('mousedown',fn);
  },[]);

  const productMap=useMemo(()=>new Map(products.map(p=>[p.symbol,p])),[products]);
  const marketMap=useMemo(()=>new Map(markets.map(m=>[m.symbol,m])),[markets]);
  const baseRows=useMemo(()=>products.map(p=>marketMap.get(p.symbol)||({
    symbol:p.symbol,
    base:p.symbol.endsWith('USDT')?p.symbol.slice(0,-4):p.symbol,
    displayName:p.display_name,
    tradingViewSymbol:`BINANCE:${p.symbol}`,
    lastPrice:0,priceChange:0,changePct:0,high24h:0,low24h:0,volume:0,quoteVolume:0,bid:0,ask:0
  } as LiveMarket)),[products,marketMap]);

  const rows=useMemo(()=>{
    const q=query.trim().toUpperCase().replace(/[^A-Z0-9가-힣]/g,'');
    let list=baseRows.filter(m=>!q||m.symbol.toUpperCase().includes(q)||m.base.toUpperCase().includes(q)||m.displayName.toUpperCase().replace('/','').includes(q));
    if(tab==='HOT')list=[...list].sort((a,b)=>b.quoteVolume-a.quoteVolume).slice(0,80);
    if(tab==='GAINERS')list=[...list].sort((a,b)=>b.changePct-a.changePct).slice(0,80);
    return list;
  },[baseRows,query,tab]);

  return <div className={s.wrap} ref={rootRef}>
    <button type="button" className={s.trigger} onClick={()=>setOpen(v=>!v)} aria-expanded={open}>
      <span className={s.assetBadge}>{(selected?.symbol||'BTCUSDT').replace(/USDT$/,'').slice(0,2)}</span>
      <span className={s.triggerText}><b>{selected?.display_name||'BTC/USDT'}</b><small>CFD 종목</small></span>
      <span className={`${s.chevron} ${open?s.open:''}`}>⌄</span>
    </button>
    {open&&<div className={s.panel}>
      <div className={s.panelTop}>
        <div><strong>종목 선택</strong><span>등록 거래 가능 {products.length.toLocaleString()}개 · 실시간 시세 {markets.length.toLocaleString()}개 수신</span></div>
        <button type="button" className={s.close} onClick={()=>setOpen(false)}>×</button>
      </div>
      <div className={s.search}><span>⌕</span><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="코인명 또는 심볼 검색"/><kbd>USDT</kbd></div>
      <div className={s.tabs}>
        <button className={tab==='ALL'?s.active:''} onClick={()=>setTab('ALL')}>전체</button>
        <button className={tab==='HOT'?s.active:''} onClick={()=>setTab('HOT')}>거래량 상위</button>
        <button className={tab==='GAINERS'?s.active:''} onClick={()=>setTab('GAINERS')}>상승률 상위</button>
      </div>
      <div className={s.head}><span>종목 / 거래대금</span><span>현재가</span><span>24시간</span></div>
      <div className={s.list}>
        {rows.length?rows.map(m=>{
          const p=productMap.get(m.symbol)!;
          const active=selected?.symbol===m.symbol;
          return <button type="button" className={`${s.row} ${active?s.selected:''}`} key={m.symbol} onClick={()=>{onSelect(p);setOpen(false);setQuery('')}}>
            <span className={s.pair}><span className={s.coin}>{m.base.slice(0,2)}</span><span className={s.pairText}><b>{m.base}<i>/USDT</i></b><small>{m.quoteVolume>0?`${compact(m.quoteVolume)} USDT`:'시세 연결 확인 중'}</small></span></span>
            <span className={s.price}>{priceFmt(m.lastPrice)}</span>
            <span className={`${s.change} ${m.changePct>=0?s.up:s.down}`}>{m.lastPrice>0?`${m.changePct>=0?'+':''}${m.changePct.toFixed(2)}%`:'—'}</span>
          </button>
        }):<div className={s.empty}>검색 결과가 없습니다.</div>}
      </div>
    </div>}
  </div>;
}
