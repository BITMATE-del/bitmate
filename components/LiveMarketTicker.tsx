'use client';

import {useEffect,useMemo,useState} from 'react';
import s from './LiveMarketTicker.module.css';

type Row={symbol:string;base:string;price:number;changePct:number;quoteVolume:number};
type Props={marketType:'spot'|'futures';label?:string};
const fmt=(v:number)=>v>=1000?v.toLocaleString(undefined,{maximumFractionDigits:2}):v>=1?v.toLocaleString(undefined,{maximumFractionDigits:4}):v.toLocaleString(undefined,{maximumFractionDigits:6});

export default function LiveMarketTicker({marketType,label}:Props){
  const [rows,setRows]=useState<Row[]>([]);const [connected,setConnected]=useState(false);
  useEffect(()=>{
    let ws:WebSocket|null=null;let retry:ReturnType<typeof setTimeout>|null=null;let dead=false;
    const connect=()=>{
      if(dead)return;
      ws=new WebSocket(marketType==='futures'?'wss://fstream.binance.com/ws':'wss://stream.binance.com:9443/ws/!ticker@arr');
      ws.onopen=()=>{setConnected(true);if(marketType==='futures')ws?.send(JSON.stringify({method:'SUBSCRIBE',params:['!ticker@arr'],id:21}))};
      ws.onmessage=(ev)=>{try{const msg=JSON.parse(ev.data);if(msg?.result===null)return;const arr=Array.isArray(msg)?msg:Array.isArray(msg?.data)?msg.data:null;if(!arr)return;const next=arr.filter((x:any)=>typeof x?.s==='string'&&x.s.endsWith('USDT')&&!x.s.includes('_')&&Number(x.c)>0).map((x:any)=>({symbol:String(x.s),base:String(x.s).replace(/USDT$/,''),price:Number(x.c),changePct:Number(x.P||0),quoteVolume:Number(x.q||0)})).sort((a:Row,b:Row)=>b.quoteVolume-a.quoteVolume).slice(0,30);if(next.length)setRows(next)}catch{}};
      ws.onerror=()=>{setConnected(false);ws?.close()};ws.onclose=()=>{setConnected(false);if(!dead)retry=setTimeout(connect,2000)};
    };connect();return()=>{dead=true;if(retry)clearTimeout(retry);ws?.close()};
  },[marketType]);
  const loop=useMemo(()=>rows.length?[...rows,...rows]:[],[rows]);
  return <div className={s.ticker}><div className={s.status}><span className={connected?s.dot:s.dotOff}>●</span><b>{label||'실시간 시세'}</b><span>{rows.length?`${rows.length}개`:'연결 중'}</span></div><div className={s.viewport}>{loop.length?<div className={s.track}>{loop.map((r,i)=><div className={s.item} key={`${r.symbol}-${i}`}><b>{r.base}/USDT</b><span>{fmt(r.price)}</span><em className={r.changePct>=0?s.up:s.down}>{r.changePct>=0?'+':''}{r.changePct.toFixed(2)}%</em></div>)}</div>:<div className={s.empty}>실시간 시장 데이터를 연결 중입니다.</div>}</div></div>;
}
