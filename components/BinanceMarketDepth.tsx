'use client';

import {useEffect,useMemo,useState} from 'react';

type Level={price:number;qty:number;total:number};
type Trade={id:number;price:number;qty:number;time:number;buyerMaker:boolean};
type Props={symbol:string;currentPrice:number;mode:'book'|'recent';marketType?:'spot'|'futures';futures?:boolean;classNames:{bookBody:string;bookHead:string;bookRows:string;bookRow:string;askDepth:string;bidDepth:string;midPrice:string;bookStatus:string;recentList:string;empty:string;};};
const fmt=(v:number,d=2)=>Number(v).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d});

export default function BinanceMarketDepth({symbol,currentPrice,mode,marketType='spot',futures=false,classNames:s}:Props){
  const [asks,setAsks]=useState<Level[]>([]),[bids,setBids]=useState<Level[]>([]),[trades,setTrades]=useState<Trade[]>([]),[connected,setConnected]=useState(false);

  useEffect(()=>{
    const sym=symbol?.toLowerCase();if(!sym)return;setAsks([]);setBids([]);setTrades([]);setConnected(false);
    const effectiveType=futures||marketType==='futures'||window.location.pathname.startsWith('/futures')?'futures':'spot';
    const map=(rows:[string,string][],reverse=false)=>{let total=0;const out=rows.map(([p,q])=>{const qty=Number(q);total+=qty;return {price:Number(p),qty,total}});return reverse?out.reverse():out};

    if(effectiveType==='futures'){
      let dead=false;
      const load=async()=>{
        try{
          const r=await fetch(`/api/futures/depth?symbol=${encodeURIComponent(symbol.toUpperCase())}`,{cache:'no-store'});
          if(!r.ok)throw new Error(String(r.status));
          const j=await r.json();
          if(dead)return;
          const askRows=(j?.depth?.asks||[]) as [string,string][];
          const bidRows=(j?.depth?.bids||[]) as [string,string][];
          if(askRows.length)setAsks(map(askRows,true));
          if(bidRows.length)setBids(map(bidRows));
          const nextTrades=((j?.trades||[]) as Array<{a:number;p:string;q:string;T:number;m:boolean}>).map(t=>({id:Number(t.a),price:Number(t.p),qty:Number(t.q),time:Number(t.T),buyerMaker:Boolean(t.m)})).reverse().slice(0,18);
          if(nextTrades.length)setTrades(nextTrades);
          setConnected(askRows.length>0&&bidRows.length>0);
        }catch{if(!dead)setConnected(false)}
      };
      load();const timer=setInterval(load,1000);
      return()=>{dead=true;clearInterval(timer)};
    }

    const book=new WebSocket(`wss://stream.binance.com:9443/ws/${sym}@depth10@1000ms`);const trade=new WebSocket(`wss://stream.binance.com:9443/ws/${sym}@aggTrade`);
    book.onopen=()=>setConnected(true);book.onmessage=(ev)=>{try{const data=JSON.parse(ev.data);setAsks(map(data.asks||[],true));setBids(map(data.bids||[]))}catch{}};book.onerror=()=>setConnected(false);book.onclose=()=>setConnected(false);
    trade.onmessage=(ev)=>{try{const t=JSON.parse(ev.data);const row:Trade={id:Number(t.a),price:Number(t.p),qty:Number(t.q),time:Number(t.T),buyerMaker:Boolean(t.m)};setTrades(prev=>[row,...prev.filter(x=>x.id!==row.id)].slice(0,18))}catch{}};
    return()=>{book.close();trade.close()};
  },[symbol,marketType,futures]);

  const visibleAsks=useMemo(()=>asks.slice(-7),[asks]),visibleBids=useMemo(()=>bids.slice(0,7),[bids]);const maxQty=useMemo(()=>Math.max(1,...visibleAsks.map(x=>x.qty),...visibleBids.map(x=>x.qty)),[visibleAsks,visibleBids]);const priceDigits=currentPrice>=1000?2:currentPrice>=1?4:6;
  if(mode==='recent')return <div className={s.recentList}>{trades.length?trades.map(t=><div key={t.id}><span>{new Date(t.time).toLocaleTimeString('ko-KR',{hour12:false})}</span><b style={{color:t.buyerMaker?'#ff6b7a':'#56d99b'}}>{fmt(t.price,priceDigits)}</b><span>{fmt(t.qty,6)}</span></div>):<div className={s.empty}>최근 체결 데이터를 연결 중입니다.</div>}</div>;
  const row=(x:Level,side:'ask'|'bid',i:number)=>{const pct=Math.max(3,Math.min(100,x.qty/maxQty*100));const color=side==='ask'?'rgba(92,32,43,.48)':'rgba(25,78,58,.48)';return <div key={`${side}-${i}-${x.price}`} className={`${s.bookRow} ${side==='ask'?s.askDepth:s.bidDepth}`} style={{background:`linear-gradient(to left, ${color} 0 ${pct}%, transparent ${pct}% 100%)`}}><b>{fmt(x.price,priceDigits)}</b><span>{fmt(x.qty,6)}</span><span>{fmt(x.total,6)}</span></div>};
  const effectiveLabel=futures||marketType==='futures'||(typeof window!=='undefined'&&window.location.pathname.startsWith('/futures'))?'FUTURES':'SPOT';
  return <div className={s.bookBody}><div className={s.bookHead}><span>가격</span><span>수량</span><span>누적</span></div><div className={s.bookRows}>{visibleAsks.length?visibleAsks.map((x,i)=>row(x,'ask',i)):Array.from({length:7},(_,i)=><div key={`a-${i}`} className={`${s.bookRow} ${s.askDepth}`}><b>—</b><span>—</span><span>—</span></div>)}</div><div className={s.midPrice}><strong>{fmt(currentPrice,priceDigits)}</strong><span>{connected?`BINANCE ${effectiveLabel} LIVE DEPTH`:'호가 연결 중'}</span></div><div className={s.bookRows}>{visibleBids.length?visibleBids.map((x,i)=>row(x,'bid',i)):Array.from({length:7},(_,i)=><div key={`b-${i}`} className={`${s.bookRow} ${s.bidDepth}`}><b>—</b><span>—</span><span>—</span></div>)}</div><div className={s.bookStatus}>호가/최근 체결은 Binance 공개 시장데이터 표시용이며 BITMATE 주문 체결 로직과 분리됩니다.</div></div>;
}
