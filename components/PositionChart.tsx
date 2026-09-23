'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {ColorType,LineStyle,createChart,type IChartApi,type ISeriesApi,type UTCTimestamp} from 'lightweight-charts';
import {createBrowserSupabase} from '@/lib/supabase-browser';

type Mode='futures'|'cfd';
type Props={symbol:string;mode:Mode};
type PriceGuide={id:string;price:number;title:string;color:string;style?:number};

const clean=(s:string)=>s.toUpperCase().replace(/[^A-Z0-9]/g,'');
const asTime=(v:number)=>Math.floor(v/1000) as UTCTimestamp;

export default function PositionChart({symbol,mode}:Props){
  const host=useRef<HTMLDivElement|null>(null);
  const supabase=useMemo(()=>createBrowserSupabase(),[]);
  const [guides,setGuides]=useState<PriceGuide[]>([]);

  useEffect(()=>{
    let dead=false;
    let chart:IChartApi|null=null;
    let series:ISeriesApi<'Candlestick'>|null=null;
    let ws:WebSocket|null=null;
    let resize:ResizeObserver|null=null;
    let guideTimer:ReturnType<typeof setInterval>|null=null;
    let guideLines:any[]=[];
    const s=clean(symbol);

    const clearGuides=()=>{
      if(series){
        for(const line of guideLines){try{series.removePriceLine(line)}catch{}}
      }
      guideLines=[];
    };

    const loadGuides=async()=>{
      const next:PriceGuide[]=[];
      if(mode==='futures'){
        const {data,error}=await supabase.rpc('futures_action',{p_action:'snapshot',p_payload:{}});
        if(!error&&data){
          const rows=Array.isArray((data as any).positions)?(data as any).positions:[];
          for(const p of rows.filter((x:any)=>String(x.symbol).toUpperCase()===s&&Number(x.entry_price)>0)){
            next.push({id:'entry-'+p.id,price:Number(p.entry_price),title:`${p.side==='SHORT'?'SHORT':'LONG'} 평단`,color:p.side==='SHORT'?'#ff6172':'#a8f000'});
            if(Number(p.take_profit)>0)next.push({id:'tp-'+p.id,price:Number(p.take_profit),title:'TP',color:'#38d99f'});
            if(Number(p.stop_loss)>0)next.push({id:'sl-'+p.id,price:Number(p.stop_loss),title:'SL',color:'#ff8a65'});
            if(Number(p.liquidation_price)>0)next.push({id:'liq-'+p.id,price:Number(p.liquidation_price),title:'청산가',color:'#ff3d5a'});
          }
        }
      }else{
        const {data,error}=await supabase.from('cfd_timed_trades').select('id,symbol,direction,start_price,status').eq('status','ACTIVE').eq('symbol',s);
        if(!error){
          for(const p of data||[]){
            if(Number(p.start_price)>0)next.push({id:'entry-'+p.id,price:Number(p.start_price),title:`${p.direction==='DOWN'?'DOWN':'UP'} 체결가`,color:p.direction==='DOWN'?'#ff6172':'#a8f000'});
          }
        }
      }
      if(dead)return;
      setGuides(next);
      if(!series)return;
      clearGuides();
      guideLines=next.map(g=>series!.createPriceLine({
        price:g.price,
        color:g.color,
        lineWidth:2,
        lineStyle:LineStyle.Dashed,
        axisLabelVisible:true,
        title:`${g.title} ${g.price.toLocaleString(undefined,{maximumFractionDigits:8})}`,
      }));
    };

    const init=async()=>{
      if(!host.current)return;
      chart=createChart(host.current,{
        width:host.current.clientWidth||800,
        height:host.current.clientHeight||500,
        layout:{background:{type:ColorType.Solid,color:'#0b1012'},textColor:'#8fa0a8'},
        grid:{vertLines:{color:'rgba(115,130,138,.08)'},horzLines:{color:'rgba(115,130,138,.08)'}},
        rightPriceScale:{borderColor:'#243137',autoScale:true},
        timeScale:{borderColor:'#243137',timeVisible:true,secondsVisible:false,rightOffset:6},
        crosshair:{mode:1},
        localization:{locale:'ko-KR'},
      });
      series=chart.addCandlestickSeries({
        upColor:'#25c995',downColor:'#f05264',borderVisible:false,
        wickUpColor:'#25c995',wickDownColor:'#f05264',
        priceLineVisible:false,lastValueVisible:true,
      });

      resize=new ResizeObserver(entries=>{
        const box=entries[0]?.contentRect;
        if(box&&chart)chart.applyOptions({width:Math.max(1,box.width),height:Math.max(1,box.height)});
      });
      resize.observe(host.current);

      const futures=mode==='futures';
      const url=futures
        ?`https://fapi.binance.com/fapi/v1/klines?symbol=${s}&interval=15m&limit=500`
        :`https://api.binance.com/api/v3/klines?symbol=${s}&interval=15m&limit=500`;
      try{
        const res=await fetch(url,{cache:'no-store'});
        if(res.ok){
          const rows=await res.json() as any[];
          series.setData(rows.map(r=>({time:asTime(Number(r[0])),open:Number(r[1]),high:Number(r[2]),low:Number(r[3]),close:Number(r[4])})));
          chart.timeScale().fitContent();
        }
      }catch{}

      await loadGuides();

      const base=futures?'wss://fstream.binance.com/ws':'wss://stream.binance.com:9443/ws';
      ws=new WebSocket(`${base}/${s.toLowerCase()}@kline_15m`);
      ws.onmessage=e=>{
        try{
          const k=JSON.parse(e.data)?.k;
          if(k&&series)series.update({time:asTime(Number(k.t)),open:Number(k.o),high:Number(k.h),low:Number(k.l),close:Number(k.c)});
        }catch{}
      };
      guideTimer=setInterval(loadGuides,2000);
    };

    void init();
    return()=>{
      dead=true;
      if(guideTimer)clearInterval(guideTimer);
      ws?.close();
      resize?.disconnect();
      clearGuides();
      chart?.remove();
    };
  },[symbol,mode,supabase]);

  return <div style={{position:'absolute',inset:0,background:'#0b1012'}}>
    <div ref={host} style={{position:'absolute',inset:0}}/>
    {guides.length===0&&<div style={{position:'absolute',left:12,top:10,zIndex:2,pointerEvents:'none',fontSize:10,color:'#607078'}}>열린 포지션이 있으면 평단가 · TP · SL · 청산가가 가격축에 고정 표시됩니다.</div>}
  </div>;
}
