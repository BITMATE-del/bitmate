'use client';

import {useEffect} from 'react';

const normalizeTradingViewSymbol=(raw:string)=>{
  const symbol=raw.toUpperCase().replace(/[^A-Z0-9]/g,'');
  const map:Record<string,string>={
    BTCUSDT:'BINANCE:BTCUSDT',
    ETHUSDT:'BINANCE:ETHUSDT',
    XRPUSDT:'BINANCE:XRPUSDT',
    SOLUSDT:'BINANCE:SOLUSDT',
    DOGEUSDT:'BINANCE:DOGEUSDT',
    BNBUSDT:'BINANCE:BNBUSDT',
    XAUUSD:'OANDA:XAUUSD',
    GOLD:'TVC:GOLD',
    NASDAQ:'NASDAQ:NDX',
    NDX:'NASDAQ:NDX',
    US100:'OANDA:NAS100USD',
    NAS100:'OANDA:NAS100USD'
  };
  return map[symbol]||`BINANCE:${symbol||'BTCUSDT'}`;
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
      const symbolNode=document.querySelector('[class*="priceBox"] span') as HTMLElement|null;
      if(!stage||!symbolNode)return;

      const tvSymbol=normalizeTradingViewSymbol(symbolNode.textContent||'BTCUSDT');
      const existing=stage.querySelector('[data-bitmate-tradingview="true"]') as HTMLElement|null;
      if(existing&&activeSymbol===tvSymbol)return;

      activeSymbol=tvSymbol;
      existing?.remove();

      const overlay=document.createElement('div');
      overlay.dataset.bitmateTradingview='true';
      Object.assign(overlay.style,{
        position:'absolute',inset:'0',zIndex:'20',background:'#0b1012',overflow:'hidden'
      });

      const widget=document.createElement('div');
      widget.className='tradingview-widget-container__widget';
      widget.style.width='100%';
      widget.style.height='100%';
      overlay.appendChild(widget);

      const script=document.createElement('script');
      script.type='text/javascript';
      script.src='https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.async=true;
      script.text=JSON.stringify({
        autosize:true,
        symbol:tvSymbol,
        interval:'15',
        timezone:'Asia/Seoul',
        theme:'dark',
        style:'1',
        locale:'kr',
        backgroundColor:'#0b1012',
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

      const timeframe=find('timeframes');
      const header=find('chartHeader');
      const foot=find('chartFoot');
      if(timeframe)timeframe.style.display='none';
      if(header)header.style.display='none';
      if(foot)foot.style.display='none';
    };

    const start=()=>{
      mount();
      timer=setInterval(mount,1000);
      observer=new MutationObserver(mount);
      observer.observe(document.body,{subtree:true,childList:true,characterData:true});
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
