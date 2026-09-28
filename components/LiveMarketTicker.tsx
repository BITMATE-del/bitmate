'use client';

import {useEffect,useMemo,useState} from 'react';
import s from './LiveMarketTicker.module.css';

type Row={symbol:string;base:string;price:number;changePct:number;quoteVolume:number};
type Props={marketType:'spot'|'futures';label?:string};

const fmt=(v:number)=>v>=1000?v.toLocaleString(undefined,{maximumFractionDigits:2}):v>=1?v.toLocaleString(undefined,{maximumFractionDigits:4}):v.toLocaleString(undefined,{maximumFractionDigits:6});

export default function LiveMarketTicker({marketType,label}:Props){
  const [rows,setRows]=useState<Row[]>([]);
  const [connected,setConnected]=useState(false);

  useEffect(()=>{
    let dead=false;
    let poll:ReturnType<typeof setInterval>|null=null;

    const loadServer=async()=>{
      if(dead)return;
      try{
        const endpoint=marketType==='futures'?'/api/futures/markets':'/api/market';
        const r=await fetch(endpoint,{cache:'no-store'});
        if(!r.ok)throw new Error(`${endpoint} ${r.status}`);
        const j=await r.json();

        const next:Row[]=marketType==='futures'
          ?((j?.markets||[]) as any[])
            .filter(x=>typeof x?.symbol==='string'&&x.symbol.endsWith('USDT')&&Number(x.lastPrice)>0)
            .map(x=>({
              symbol:String(x.symbol),
              base:String(x.base||x.symbol.replace(/USDT$/,'')),
              price:Number(x.lastPrice),
              changePct:Number(x.changePct||0),
              quoteVolume:Number(x.quoteVolume||0)
            }))
            .sort((a,b)=>b.quoteVolume-a.quoteVolume)
            .slice(0,30)
          :((j?.rows||[]) as any[])
            .filter(x=>typeof x?.symbol==='string'&&Number(x.price)>0)
            .map(x=>({
              symbol:`${String(x.symbol).toUpperCase()}USDT`,
              base:String(x.symbol).toUpperCase(),
              price:Number(x.price),
              changePct:Number(x.changePct||0),
              quoteVolume:Number(x.volume||0)
            }))
            .sort((a,b)=>b.quoteVolume-a.quoteVolume);

        if(!dead&&next.length){
          setRows(next);
          setConnected(true);
        }
      }catch(err){
        console.error('LiveMarketTicker server feed error',err);
        if(!dead&&rows.length===0)setConnected(false);
      }
    };

    loadServer();
    poll=setInterval(loadServer,8000);
    return()=>{dead=true;if(poll)clearInterval(poll)};
  // keep polling independent from price updates
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[marketType]);

  useEffect(()=>{
    let ws:WebSocket|null=null;
    let retry:ReturnType<typeof setTimeout>|null=null;
    let dead=false;

    const connect=()=>{
      if(dead)return;
      try{
        ws=new WebSocket(marketType==='futures'
          ?'wss://fstream.binance.com/ws'
          :'wss://stream.binance.com:9443/ws/!ticker@arr');

        ws.onopen=()=>{
          if(marketType==='futures'){
            ws?.send(JSON.stringify({method:'SUBSCRIBE',params:['!ticker@arr'],id:21}));
          }
        };

        ws.onmessage=(ev)=>{
          try{
            const msg=JSON.parse(ev.data);
            if(msg?.result===null)return;
            const arr=Array.isArray(msg)?msg:Array.isArray(msg?.data)?msg.data:null;
            if(!arr)return;
            const next=arr
              .filter((x:any)=>typeof x?.s==='string'&&x.s.endsWith('USDT')&&!x.s.includes('_')&&Number(x.c)>0)
              .map((x:any)=>({
                symbol:String(x.s),
                base:String(x.s).replace(/USDT$/,''),
                price:Number(x.c),
                changePct:Number(x.P||0),
                quoteVolume:Number(x.q||0)
              }))
              .sort((a:Row,b:Row)=>b.quoteVolume-a.quoteVolume)
              .slice(0,30);
            if(next.length){
              setRows(next);
              setConnected(true);
            }
          }catch{}
        };

        ws.onerror=()=>{ws?.close()};
        ws.onclose=()=>{if(!dead)retry=setTimeout(connect,4000)};
      }catch{
        if(!dead)retry=setTimeout(connect,4000);
      }
    };

    connect();
    return()=>{dead=true;if(retry)clearTimeout(retry);ws?.close()};
  },[marketType]);

  const loop=useMemo(()=>rows.length?[...rows,...rows]:[],[rows]);

  return <div className={s.ticker}>
    <div className={s.status}>
      <span className={connected?s.dot:s.dotOff}>●</span>
      <b>{label||'실시간 시세'}</b>
      {!connected&&<span>연결 중</span>}
    </div>
    <div className={s.viewport}>
      {loop.length
        ?<div className={s.track}>{loop.map((r,i)=><div className={s.item} key={`${r.symbol}-${i}`}><b>{r.base}/USDT</b><span>{fmt(r.price)}</span><em className={r.changePct>=0?s.up:s.down}>{r.changePct>=0?'+':''}{r.changePct.toFixed(2)}%</em></div>)}</div>
        :<div className={s.empty}>실시간 시장 데이터를 연결 중입니다.</div>}
    </div>
  </div>;
}
