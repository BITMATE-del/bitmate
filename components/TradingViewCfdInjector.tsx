'use client';

import {useEffect} from 'react';
import {ColorType,LineStyle,createChart,type IChartApi,type ISeriesApi,type UTCTimestamp} from 'lightweight-charts';
import {createBrowserSupabase} from '@/lib/supabase-browser';

type Candle={time:UTCTimestamp;open:number;high:number;low:number;close:number};
type PositionLine={id:string;price:number;title:string;color:string};

const cleanSymbol=(raw:string)=>raw.toUpperCase().replace(/[^A-Z0-9]/g,'')||'BTCUSDT';

export default function TradingViewCfdInjector(){
  useEffect(()=>{
    const supabase=createBrowserSupabase();
    let disposed=false;
    let activeSymbol='';
    let chart:IChartApi|null=null;
    let series:ISeriesApi<'Candlestick'>|null=null;
    let container:HTMLDivElement|null=null;
    let resize:ResizeObserver|null=null;
    let mutation:MutationObserver|null=null;
    let symbolTimer:ReturnType<typeof setInterval>|null=null;
    let lineTimer:ReturnType<typeof setInterval>|null=null;
    let klineWs:WebSocket|null=null;
    let currentLines:any[]=[];

    const findStage=()=>document.querySelector('[class*="chartStage"]') as HTMLElement|null;

    const clearLines=()=>{
      if(series){
        for(const line of currentLines){
          try{series.removePriceLine(line)}catch{}
        }
      }
      currentLines=[];
    };

    const loadPositionLines=async(rawSymbol:string):Promise<PositionLine[]>=>{
      const symbol=cleanSymbol(rawSymbol);
      if(window.location.pathname.startsWith('/futures')){
        const {data,error}=await supabase.rpc('futures_action',{p_action:'snapshot',p_payload:{}});
        if(error||!data)return [];
        const rows=Array.isArray((data as any).positions)?(data as any).positions:[];
        return rows
          .filter((p:any)=>String(p.symbol).toUpperCase()===symbol&&Number(p.entry_price)>0)
          .map((p:any)=>({
            id:String(p.id),
            price:Number(p.entry_price),
            title:`${p.side==='SHORT'?'SHORT':'LONG'} 평단 ${Number(p.entry_price).toLocaleString(undefined,{maximumFractionDigits:8})}`,
            color:p.side==='SHORT'?'#ff6678':'#9cff21'
          }));
      }

      const {data,error}=await supabase
        .from('cfd_timed_trades')
        .select('id,symbol,direction,start_price,expires_at,status')
        .eq('status','ACTIVE')
        .eq('symbol',symbol);
      if(error)return [];
      return (data||[])
        .filter((p:any)=>Number(p.start_price)>0)
        .map((p:any)=>({
          id:String(p.id),
          price:Number(p.start_price),
          title:`${p.direction==='DOWN'?'DOWN':'UP'} 체결가 ${Number(p.start_price).toLocaleString(undefined,{maximumFractionDigits:8})}`,
          color:p.direction==='DOWN'?'#ff6678':'#9cff21'
        }));
    };

    const refreshLines=async(rawSymbol:string)=>{
      if(!series)return;
      const lines=await loadPositionLines(rawSymbol);
      if(disposed||!series)return;
      clearLines();
      currentLines=lines.map(line=>series!.createPriceLine({
        price:line.price,
        color:line.color,
        lineWidth:2,
        lineStyle:LineStyle.Dashed,
        axisLabelVisible:true,
        title:line.title,
      }));
    };

    const loadCandles=async(rawSymbol:string)=>{
      const symbol=cleanSymbol(rawSymbol);
      const futures=window.location.pathname.startsWith('/futures');
      const url=futures
        ?`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=15m&limit=500`
        :`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=15m&limit=500`;
      const response=await fetch(url,{cache:'no-store'});
      if(!response.ok)throw new Error('kline_fetch_failed');
      const rows=await response.json() as any[];
      return rows.map(r=>({
        time:Math.floor(Number(r[0])/1000) as UTCTimestamp,
        open:Number(r[1]),high:Number(r[2]),low:Number(r[3]),close:Number(r[4]),
      })) as Candle[];
    };

    const connectKline=(rawSymbol:string)=>{
      klineWs?.close();
      const symbol=cleanSymbol(rawSymbol).toLowerCase();
      const futures=window.location.pathname.startsWith('/futures');
      const base=futures?'wss://fstream.binance.com/ws':'wss://stream.binance.com:9443/ws';
      klineWs=new WebSocket(`${base}/${symbol}@kline_15m`);
      klineWs.onmessage=ev=>{
        try{
          const x=JSON.parse(ev.data);
          const k=x.k;
          if(!k||!series)return;
          series.update({
            time:Math.floor(Number(k.t)/1000) as UTCTimestamp,
            open:Number(k.o),high:Number(k.h),low:Number(k.l),close:Number(k.c),
          });
        }catch{}
      };
    };

    const destroy=()=>{
      clearLines();
      klineWs?.close();klineWs=null;
      resize?.disconnect();resize=null;
      chart?.remove();chart=null;series=null;
      container?.remove();container=null;
    };

    const mount=async()=>{
      if(disposed)return;
      const stage=findStage();
      if(!stage)return;
      const raw=stage.dataset.symbol||'BTCUSDT';
      const symbol=cleanSymbol(raw);
      if(chart&&activeSymbol===symbol)return;

      destroy();
      activeSymbol=symbol;
      stage.querySelector('[data-bitmate-tradingview="true"]')?.remove();
      stage.style.position='relative';

      container=document.createElement('div');
      container.dataset.bitmatePriceChart='true';
      Object.assign(container.style,{position:'absolute',inset:'0',zIndex:'20',background:'#0b1012'});
      stage.appendChild(container);

      chart=createChart(container,{
        width:container.clientWidth||800,
        height:container.clientHeight||500,
        layout:{background:{type:ColorType.Solid,color:'#0b1012'},textColor:'#8fa0a8'},
        grid:{vertLines:{color:'rgba(115,130,138,.08)'},horzLines:{color:'rgba(115,130,138,.08)'}},
        rightPriceScale:{borderColor:'#243137'},
        timeScale:{borderColor:'#243137',timeVisible:true,secondsVisible:false},
        crosshair:{mode:1},
        localization:{locale:'ko-KR'},
      });
      series=chart.addCandlestickSeries({
        upColor:'#25c995',downColor:'#f05264',borderVisible:false,
        wickUpColor:'#25c995',wickDownColor:'#f05264',
        priceLineVisible:false,
      });

      resize=new ResizeObserver(entries=>{
        const box=entries[0]?.contentRect;
        if(box&&chart)chart.applyOptions({width:Math.max(1,box.width),height:Math.max(1,box.height)});
      });
      resize.observe(container);

      try{
        const candles=await loadCandles(symbol);
        if(disposed||!series||activeSymbol!==symbol)return;
        series.setData(candles);
        chart.timeScale().fitContent();
        connectKline(symbol);
        await refreshLines(symbol);
      }catch{}
    };

    const watch=()=>{
      void mount();
      symbolTimer=setInterval(()=>void mount(),700);
      lineTimer=setInterval(()=>{if(activeSymbol)void refreshLines(activeSymbol)},2000);
      mutation=new MutationObserver(()=>void mount());
      mutation.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-symbol']});
    };

    const raf=requestAnimationFrame(watch);
    return()=>{
      disposed=true;
      cancelAnimationFrame(raf);
      if(symbolTimer)clearInterval(symbolTimer);
      if(lineTimer)clearInterval(lineTimer);
      mutation?.disconnect();
      destroy();
    };
  },[]);

  return null;
}
