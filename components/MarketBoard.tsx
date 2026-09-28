'use client';

import {useEffect,useMemo,useState} from 'react';
import LiveMarketTicker from './LiveMarketTicker';

type Row={symbol:string;price:number;changePct:number;volume:number};
type Tab='favorites'|'spot'|'new'|'volume';

const MAJORS=['BTC','ETH','XRP','SOL','DOGE'];
function price(n:number){if(n>=1000)return n.toLocaleString(undefined,{maximumFractionDigits:2});if(n>=1)return n.toLocaleString(undefined,{maximumFractionDigits:4});return n.toLocaleString(undefined,{maximumFractionDigits:6});}
function vol(n:number){if(n>=1e9)return `${(n/1e9).toFixed(2)}B`;if(n>=1e6)return `${(n/1e6).toFixed(2)}M`;return Math.round(n).toLocaleString();}

export default function MarketBoard(){
  const [rows,setRows]=useState<Row[]>([]);
  const [tab,setTab]=useState<Tab>('favorites');
  const [favorites,setFavorites]=useState<string[]>(MAJORS);
  const [feedState,setFeedState]=useState<'loading'|'live'|'degraded'>('loading');

  useEffect(()=>{
    try{
      const saved=JSON.parse(localStorage.getItem('bitmate_market_favorites')||'null');
      if(Array.isArray(saved))setFavorites(saved.filter((x):x is string=>typeof x==='string'));
    }catch{}
  },[]);

  useEffect(()=>{
    let dead=false;
    const normalizeFallback=(data:any):Row[]=>{
      const all=Array.isArray(data?.markets)?data.markets:[];
      return MAJORS.map(symbol=>{
        const x=all.find((m:any)=>String(m?.base||'').toUpperCase()===symbol);
        return x?{symbol,price:Number(x.lastPrice||0),changePct:Number(x.changePct||0),volume:Number(x.quoteVolume||0)}:null;
      }).filter((x):x is Row=>!!x&&Number.isFinite(x.price)&&x.price>0);
    };
    const load=async()=>{
      try{
        const r=await fetch('/api/market',{cache:'no-store'});
        if(!r.ok)throw new Error(`market ${r.status}`);
        const d=await r.json();
        const next=Array.isArray(d?.rows)?d.rows.filter((x:any)=>x&&typeof x.symbol==='string'&&Number(x.price)>0):[];
        if(!next.length)throw new Error('empty market rows');
        if(!dead){setRows(next);setFeedState('live')}
      }catch(primaryError){
        try{
          const r=await fetch('/api/futures/markets',{cache:'no-store'});
          if(!r.ok)throw new Error(`fallback ${r.status}`);
          const d=await r.json();
          const next=normalizeFallback(d);
          if(!next.length)throw new Error('empty fallback rows');
          if(!dead){setRows(next);setFeedState('degraded')}
        }catch(fallbackError){
          console.error('MarketBoard feed unavailable',{primaryError,fallbackError});
          if(!dead&&rows.length===0)setFeedState('degraded');
        }
      }
    };
    load();
    const id=setInterval(load,10000);
    return()=>{dead=true;clearInterval(id)};
  // rows intentionally excluded: polling should not reset when prices update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(()=>{
    if(!rows.length)return;
    let ws:WebSocket|null=null;
    let retry:ReturnType<typeof setTimeout>|null=null;
    let dead=false;
    const connect=()=>{
      if(dead)return;
      try{
        ws=new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');
        ws.onmessage=(ev)=>{
          try{
            const payload=JSON.parse(ev.data);
            if(!Array.isArray(payload))return;
            const live=new Map(payload
              .filter((x:any)=>typeof x?.s==='string'&&x.s.endsWith('USDT'))
              .map((x:any)=>[String(x.s).replace(/USDT$/,''),x]));
            setRows(prev=>prev.map(r=>{
              const x=live.get(r.symbol) as any;
              return x?{...r,price:Number(x.c)||r.price,changePct:Number(x.P)||0,volume:Number(x.q)||r.volume}:r;
            }));
            setFeedState('live');
          }catch{}
        };
        ws.onerror=()=>ws?.close();
        ws.onclose=()=>{if(!dead)retry=setTimeout(connect,4000)};
      }catch{
        if(!dead)retry=setTimeout(connect,4000);
      }
    };
    connect();
    return()=>{dead=true;if(retry)clearTimeout(retry);ws?.close()};
  },[rows.length>0]);

  const toggleFavorite=(symbol:string)=>{
    setFavorites(prev=>{
      const next=prev.includes(symbol)?prev.filter(x=>x!==symbol):[...prev,symbol];
      localStorage.setItem('bitmate_market_favorites',JSON.stringify(next));
      return next;
    });
  };

  const visible=useMemo(()=>{
    if(tab==='favorites')return rows.filter(r=>favorites.includes(r.symbol));
    if(tab==='volume')return [...rows].sort((a,b)=>b.volume-a.volume);
    if(tab==='new')return [...rows].slice().reverse();
    return rows;
  },[rows,tab,favorites]);

  const tabs:[Tab,string][]=[['favorites','Favorites'],['spot','Spot'],['new','New Listings'],['volume','24h Volume']];

  return <section className="marketsSection" id="markets">
    <LiveMarketTicker marketType="spot" label="Markets 실시간" externalRows={rows}/>
    <div className="xtShell">
      <div className="marketHeading">
        <div><span>MARKETS</span><h2>Popular markets</h2></div>
        <div className="marketTabs" role="tablist" aria-label="Popular markets filters">
          {tabs.map(([key,label])=><button key={key} type="button" role="tab" aria-selected={tab===key} className={tab===key?'active':''} onClick={()=>setTab(key)}>{label}</button>)}
        </div>
      </div>

      {feedState==='loading'&&rows.length===0&&<div className="feedWarning">Market data is connecting…</div>}
      {feedState==='degraded'&&rows.length===0&&<div className="feedWarning">Market feed is reconnecting…</div>}

      <div className="marketTable">
        <div className="marketRow marketHead"><span>Trading pair</span><span>Last price</span><span>24h change</span><span>24h volume</span><span/></div>
        {visible.map(r=><div className="marketRow" key={r.symbol}>
          <span className="pair"><i>{r.symbol.slice(0,1)}</i><b>{r.symbol}</b><small>/USDT</small><button type="button" className={favorites.includes(r.symbol)?'favoriteStar active':'favoriteStar'} aria-label={favorites.includes(r.symbol)?`${r.symbol} 즐겨찾기 해제`:`${r.symbol} 즐겨찾기 추가`} onClick={()=>toggleFavorite(r.symbol)}>{favorites.includes(r.symbol)?'★':'☆'}</button></span>
          <span>${price(r.price)}</span>
          <span className={r.changePct>=0?'up':'down'}>{r.changePct>=0?'+':''}{r.changePct.toFixed(2)}%</span>
          <span>{vol(r.volume)} USDT</span>
          <span><a href={`/trade/spot?symbol=${r.symbol}USDT`}>Trade</a></span>
        </div>)}
        {visible.length===0&&feedState!=='loading'&&<div className="marketEmpty">{tab==='favorites'?'즐겨찾기한 마켓이 없습니다.':'표시할 마켓 데이터가 없습니다.'}</div>}
      </div>
      <a className="allMarkets" href="/trade/spot">View all markets →</a>
    </div>
  </section>;
}
