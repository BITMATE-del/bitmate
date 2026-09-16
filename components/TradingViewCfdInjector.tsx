'use client';

import {useEffect} from 'react';

const normalizeTradingViewSymbol=(raw:string)=>{
  const symbol=raw.toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(symbol.endsWith('USDT'))return `BINANCE:${symbol}`;
  return 'BINANCE:BTCUSDT';
};

export default function TradingViewCfdInjector(){
  useEffect(()=>{
    let disposed=false;
    let activeSymbol='';
    let observer:MutationObserver|null=null;
    let timer:ReturnType<typeof setInterval>|null=null;

    const find=(name:string)=>document.querySelector(`[class*="${name}"]`) as HTMLElement|null;

    const mount=()=>{
      if(disposed)return;
      const stage=find('chartStage');
      if(!stage)return;

      const tvSymbol=normalizeTradingViewSymbol(stage.dataset.symbol||'BTCUSDT');
      const existing=stage.querySelector('[data-bitmate-tradingview="true"]') as HTMLElement|null;
      if(existing&&activeSymbol===tvSymbol)return;

      activeSymbol=tvSymbol;
      existing?.remove();

      const overlay=document.createElement('div');
      overlay.dataset.bitmateTradingview='true';
      overlay.className='tradingview-widget-container';
      Object.assign(overlay.style,{position:'absolute',inset:'0',zIndex:'20',width:'100%',height:'100%',background:'#0b1012',overflow:'hidden'});

      const widget=document.createElement('div');
      widget.className='tradingview-widget-container__widget';
      widget.style.width='100%';
      widget.style.height='100%';
      overlay.appendChild(widget);

      const script=document.createElement('script');
      script.type='text/javascript';
      script.src='https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.async=true;
      script.innerHTML=JSON.stringify({
        autosize:true,
        symbol:tvSymbol,
        interval:'15',
        timezone:'Asia/Seoul',
        theme:'dark',
        style:'1',
        locale:'kr',
        backgroundColor:'rgba(11, 16, 18, 1)',
        gridColor:'rgba(115, 130, 138, 0.10)',
        allow_symbol_change:false,
        save_image:false,
        calendar:false,
        support_host:'https://www.tradingview.com',
        hide_top_toolbar:false,
        hide_legend:false,
        hide_side_toolbar:false,
        withdateranges:true,
        details:false,
        hotlist:false
      });
      overlay.appendChild(script);
      stage.appendChild(overlay);
    };

    const start=()=>{
      mount();
      timer=setInterval(mount,750);
      observer=new MutationObserver(mount);
      observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-symbol']});
    };

    const raf=requestAnimationFrame(start);
    return()=>{
      disposed=true;
      cancelAnimationFrame(raf);
      if(timer)clearInterval(timer);
      observer?.disconnect();
      document.querySelector('[data-bitmate-tradingview="true"]')?.remove();
    };
  },[]);

  return null;
}
