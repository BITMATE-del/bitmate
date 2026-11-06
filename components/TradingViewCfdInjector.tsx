'use client';

import {useEffect} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';

declare global{
  interface Window{
    TradingView?:any;
    __bitmateTvLoader?:Promise<void>;
  }
}

const normalizeTradingViewSymbol=(raw:string,perpetual:boolean)=>{
  const symbol=raw.toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(symbol.endsWith('USDT'))return perpetual?`BINANCE:${symbol}.P`:`BINANCE:${symbol}`;
  return perpetual?'BINANCE:BTCUSDT.P':'BINANCE:BTCUSDT';
};

const loadTradingView=()=>{
  if(window.TradingView?.widget)return Promise.resolve();
  if(window.__bitmateTvLoader)return window.__bitmateTvLoader;
  const pending=new Promise<void>((resolve,reject)=>{
    let script=document.querySelector('script[data-bitmate-tvjs="true"]') as HTMLScriptElement|null;
    if(script&&!window.TradingView?.widget){
      // An old stalled loader must not block every future chart attempt.
      script.remove();
      script=null;
    }
    const next=document.createElement('script');
    next.src='https://s3.tradingview.com/tv.js';
    next.async=true;
    next.dataset.bitmateTvjs='true';
    const timeout=window.setTimeout(()=>{next.remove();reject(new Error('tradingview_timeout'))},12000);
    next.onload=()=>{
      clearTimeout(timeout);
      if(window.TradingView?.widget)resolve();
      else {next.remove();reject(new Error('tradingview_widget_missing'))}
    };
    next.onerror=()=>{clearTimeout(timeout);next.remove();reject(new Error('tradingview_load_failed'))};
    document.head.appendChild(next);
  });
  window.__bitmateTvLoader=pending.catch(error=>{
    // Retry is possible after network errors; never cache a rejected promise.
    window.__bitmateTvLoader=undefined;
    throw error;
  });
  return window.__bitmateTvLoader;
};

type EntryLine={id:string;price:number;label:string;color:string};

export default function TradingViewCfdInjector(){
  useEffect(()=>{
    const supabase=createBrowserSupabase();
    let disposed=false;
    let activeSymbol='';
    let observer:MutationObserver|null=null;
    let mountTimer:ReturnType<typeof setInterval>|null=null;
    let lineTimer:ReturnType<typeof setInterval>|null=null;
    let widget:any=null;
    let chart:any=null;
    let shapeIds:any[]=[];
    let lastLineSignature='';
    let generation=0;
    let lastRetryAt=Date.now();
    let retryButton:HTMLButtonElement|null=null;
    let visibilityTimer:ReturnType<typeof setInterval>|null=null;
    let showRetry:(()=>void)|null=null;
    let visibleRangeSubscription:any=null;

    const findStage=()=>document.querySelector('[class*="chartStage"]') as HTMLElement|null;

    const clearShapes=()=>{
      if(chart?.removeEntity){
        for(const id of shapeIds){
          try{chart.removeEntity(id)}catch{}
        }
      }
      shapeIds=[];
    };

    const getEntryLines=async(rawSymbol:string):Promise<EntryLine[]>=>{
      const symbol=rawSymbol.toUpperCase().replace(/[^A-Z0-9]/g,'');
      if(window.location.pathname.startsWith('/futures')){
        const {data,error}=await supabase.rpc('futures_action',{p_action:'snapshot',p_payload:{}});
        if(error||!data)return [];
        const positions=Array.isArray((data as any).positions)?(data as any).positions:[];
        return positions
          .filter((p:any)=>String(p.symbol).toUpperCase()===symbol&&Number(p.entry_price)>0)
          .map((p:any)=>({
            id:String(p.id),
            price:Number(p.entry_price),
            label:`${p.side==='SHORT'?'SHORT':'LONG'} 평단 ${Number(p.entry_price).toLocaleString(undefined,{maximumFractionDigits:8})}`,
            color:p.side==='SHORT'?'#ff6172':'#a8f000',
          }));
      }

      const {data,error}=await supabase
        .from('cfd_timed_trades')
        .select('id,symbol,direction,start_price,status')
        .eq('status','ACTIVE')
        .eq('symbol',symbol);

      if(error)return [];
      return (data||[])
        .filter((p:any)=>Number(p.start_price)>0)
        .map((p:any)=>({
          id:String(p.id),
          price:Number(p.start_price),
          label:`${p.direction==='DOWN'?'DOWN':'UP'} 체결가 ${Number(p.start_price).toLocaleString(undefined,{maximumFractionDigits:8})}`,
          color:p.direction==='DOWN'?'#ff6172':'#a8f000',
        }));
    };

    const getVisibleTimes=()=>{
      try{
        const range=chart?.getVisibleRange?.()||chart?.getTimeScale?.()?.getVisibleRange?.();
        const now=Math.floor(Date.now()/1000);
        const from=Math.floor(Number(range?.from||now-86400));
        const to=Math.floor(Number(range?.to||now+86400));
        return {from,to};
      }catch{
        const now=Math.floor(Date.now()/1000);
        return {from:now-86400,to:now+86400};
      }
    };

    const drawNativeLine=async(line:EntryLine)=>{
      if(!chart)return null;
      const {from,to}=getVisibleTimes();

      if(chart.createMultipointShape){
        return await chart.createMultipointShape(
          [
            {time:from,price:line.price},
            {time:to,price:line.price},
          ],
          {
            shape:'trend_line',
            lock:true,
            disableSelection:true,
            disableSave:true,
            disableUndo:true,
            text:line.label,
            overrides:{
              linecolor:line.color,
              linewidth:2,
              linestyle:2,
              extendLeft:true,
              extendRight:true,
              showLabel:true,
              showPrice:true,
              textcolor:line.color,
              fontsize:11,
            },
          }
        );
      }

      if(chart.createShape){
        return await chart.createShape(
          {price:line.price},
          {
            shape:'horizontal_line',
            lock:true,
            disableSelection:true,
            disableSave:true,
            disableUndo:true,
            text:line.label,
            overrides:{
              linecolor:line.color,
              linewidth:2,
              linestyle:2,
              showPrice:true,
              textcolor:line.color,
              fontsize:11,
            },
          }
        );
      }

      return null;
    };

    const refreshEntryLines=async(force=false)=>{
      if(!activeSymbol||!chart)return;
      const raw=activeSymbol.replace(/^BINANCE:/,'').replace(/\.P$/,'');
      const lines=await getEntryLines(raw);
      if(disposed||!chart)return;

      const signature=JSON.stringify(lines.map(x=>[x.id,x.price,x.label]));
      if(!force&&signature===lastLineSignature)return;
      lastLineSignature=signature;

      clearShapes();

      for(const line of lines){
        try{
          const id=await drawNativeLine(line);
          if(id)shapeIds.push(id);
        }catch{}
      }
    };

    const subscribeRangeChanges=()=>{
      try{
        visibleRangeSubscription?.unsubscribe?.();
      }catch{}
      visibleRangeSubscription=null;

      try{
        const source=chart?.onVisibleRangeChanged?.()||chart?.getTimeScale?.()?.onVisibleRangeChanged?.();
        if(source?.subscribe){
          const cb=()=>void refreshEntryLines(true);
          source.subscribe(null,cb);
          visibleRangeSubscription=source;
        }
      }catch{}
    };

    const initWidget=async(stage:HTMLElement,tvSymbol:string,version:number)=>{
      try{
        await loadTradingView();
        if(disposed||version!==generation||!stage.isConnected||stage.dataset.chartMode==='position'||!window.TradingView?.widget)return;

        stage.querySelector('[data-bitmate-tradingview="true"]')?.remove();
        const overlay=document.createElement('div');
        overlay.dataset.bitmateTradingview='true';
        const id=`bitmate-tv-${Math.random().toString(36).slice(2)}`;
        overlay.id=id;
        Object.assign(overlay.style,{position:'absolute',inset:'0',zIndex:'20',width:'100%',height:'100%',background:'#0b1012',overflow:'hidden'});
        stage.appendChild(overlay);

        widget=new window.TradingView.widget({
          autosize:true,
          symbol:tvSymbol,
          interval:'15',
          timezone:'Asia/Seoul',
          theme:'dark',
          style:'1',
          locale:'kr',
          toolbar_bg:'#0b1012',
          enable_publishing:false,
          hide_top_toolbar:false,
          hide_legend:false,
          hide_side_toolbar:false,
          allow_symbol_change:false,
          save_image:false,
          withdateranges:true,
          details:false,
          hotlist:false,
          calendar:false,
          container_id:id,
          support_host:'https://www.tradingview.com',
        });

        const ready=async()=>{
          if(disposed||version!==generation||!stage.isConnected)return;
          try{
            chart=widget.activeChart?widget.activeChart():widget.chart?widget.chart():null;
            if(!chart)return;
            subscribeRangeChanges();
            await refreshEntryLines(true);
          }catch{}
        };

        try{
          if(widget.chartReady)await widget.chartReady().then(ready);
          else if(widget.onChartReady)widget.onChartReady(ready);
          else window.setTimeout(ready,1800);
        }catch{
          window.setTimeout(ready,1800);
        }
      }catch{
        if(disposed||version!==generation||!stage.isConnected)return;
        stage.querySelector('[data-bitmate-tradingview="true"]')?.remove();
        activeSymbol='';
        // The periodic mount check retries after transient script failures.
      }
    };

    const retry=()=>{
      const stage=findStage();
      if(!stage||disposed||stage.dataset.chartMode==='position')return;
      lastRetryAt=Date.now();
      generation++;
      try{widget?.remove?.()}catch{}
      stage.querySelector('[data-bitmate-tradingview="true"]')?.remove();
      activeSymbol='';
      chart=null;widget=null;shapeIds=[];lastLineSignature='';
      mount();
    };

    const mount=()=>{
      if(disposed)return;
      const stage=findStage();
      if(!stage)return;
      if(stage.dataset.chartMode==='position'){
        generation++;
        stage.querySelector('[data-bitmate-tradingview="true"]')?.remove();
        activeSymbol='';
        chart=null;widget=null;shapeIds=[];
        return;
      }

      const perpetual=window.location.pathname.startsWith('/futures');
      const tvSymbol=normalizeTradingViewSymbol(stage.dataset.symbol||'BTCUSDT',perpetual);
      const existing=stage.querySelector('[data-bitmate-tradingview="true"]') as HTMLElement|null;
      if(existing&&activeSymbol===tvSymbol)return;

      const version=++generation;
      activeSymbol=tvSymbol;
      lastLineSignature='';
      clearShapes();
      chart=null;
      widget=null;
      visibleRangeSubscription=null;
      stage.style.position='relative';
      void initWidget(stage,tvSymbol,version);
    };

    const start=()=>{
      mount();
      mountTimer=setInterval(()=>{
        mount();
        const stage=findStage();
        if(!stage||stage.dataset.chartMode==='position')return;
        const overlay=stage.querySelector('[data-bitmate-tradingview="true"]');
        // Chart container never acquired its iframe: retry at a bounded interval.
        if(overlay&&!overlay.querySelector('iframe')&&Date.now()-lastRetryAt>30000)retry();
      },5000);
      // Unobtrusive manual recovery for a cross-origin widget that has loaded
      // its toolbar but stopped drawing candles (cannot inspect inside iframe).
      retryButton=document.createElement('button');
      retryButton.type='button';
      retryButton.textContent='차트 다시 불러오기';
      retryButton.setAttribute('aria-label','TradingView 차트 다시 불러오기');
      Object.assign(retryButton.style,{position:'fixed',right:'16px',bottom:'104px',zIndex:'60',padding:'8px 12px',border:'1px solid #364448',borderRadius:'8px',background:'#172024',color:'#dde5e6',fontSize:'12px',cursor:'pointer',display:'none'});
      retryButton.addEventListener('click',retry);
      document.body.appendChild(retryButton);
      showRetry=()=>{
        const stage=findStage();
        const r=stage?.getBoundingClientRect();
        retryButton.style.display=stage&&stage.dataset.chartMode!=='position'&&r&&r.bottom>0&&r.top<window.innerHeight?'block':'none';
      };
      showRetry();
      visibilityTimer=setInterval(showRetry,1500);
      window.addEventListener('scroll',showRetry,{passive:true});
      window.addEventListener('resize',showRetry);
      lineTimer=setInterval(()=>void refreshEntryLines(false),2000);
      observer=new MutationObserver(mount);
      observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-symbol','data-chart-mode']});
    };

    const raf=requestAnimationFrame(start);

    return()=>{
      disposed=true;
      cancelAnimationFrame(raf);
      if(mountTimer)clearInterval(mountTimer);
      if(lineTimer)clearInterval(lineTimer);
      if(visibilityTimer)clearInterval(visibilityTimer);
      if(showRetry){window.removeEventListener('scroll',showRetry);window.removeEventListener('resize',showRetry)}
      retryButton?.remove();
      generation++;
      observer?.disconnect();
      try{visibleRangeSubscription?.unsubscribe?.()}catch{}
      clearShapes();
      document.querySelector('[data-bitmate-tradingview="true"]')?.remove();
    };
  },[]);

  return null;
}
