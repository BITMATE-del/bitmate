import {NextResponse} from 'next/server';

export const dynamic='force-dynamic';
export const revalidate=0;

type BinanceTicker={
  symbol:string;
  lastPrice:string;
  priceChange:string;
  priceChangePercent:string;
  highPrice:string;
  lowPrice:string;
  volume:string;
  quoteVolume:string;
  bidPrice:string;
  askPrice:string;
};

type BinanceExchangeInfo={
  symbols:Array<{
    symbol:string;
    status:string;
    baseAsset:string;
    quoteAsset:string;
    isSpotTradingAllowed?:boolean;
  }>;
};

export async function GET(){
  try{
    const [tickerRes,infoRes]=await Promise.all([
      fetch('https://api.binance.com/api/v3/ticker/24hr',{cache:'no-store'}),
      fetch('https://api.binance.com/api/v3/exchangeInfo',{cache:'no-store'})
    ]);
    if(!tickerRes.ok)throw new Error(`BINANCE_TICKER_${tickerRes.status}`);
    if(!infoRes.ok)throw new Error(`BINANCE_INFO_${infoRes.status}`);

    const rows=(await tickerRes.json()) as BinanceTicker[];
    const info=(await infoRes.json()) as BinanceExchangeInfo;
    const tradable=new Map(
      info.symbols
        .filter(x=>x.status==='TRADING'&&x.quoteAsset==='USDT'&&x.isSpotTradingAllowed!==false&&!/(UP|DOWN|BULL|BEAR)$/.test(x.baseAsset))
        .map(x=>[x.symbol,x])
    );

    const markets=rows
      .filter(x=>tradable.has(x.symbol))
      .map(x=>{
        const meta=tradable.get(x.symbol)!;
        return {
          symbol:x.symbol,
          base:meta.baseAsset,
          displayName:`${meta.baseAsset}/USDT`,
          tradingViewSymbol:`BINANCE:${x.symbol}`,
          lastPrice:Number(x.lastPrice),
          priceChange:Number(x.priceChange),
          changePct:Number(x.priceChangePercent),
          high24h:Number(x.highPrice),
          low24h:Number(x.lowPrice),
          volume:Number(x.volume),
          quoteVolume:Number(x.quoteVolume),
          bid:Number(x.bidPrice),
          ask:Number(x.askPrice)
        };
      })
      .filter(x=>Number.isFinite(x.lastPrice)&&x.lastPrice>0)
      .sort((a,b)=>b.quoteVolume-a.quoteVolume);

    return NextResponse.json({markets,count:markets.length,ts:Date.now()},{headers:{'Cache-Control':'no-store, max-age=0'}});
  }catch(error){
    return NextResponse.json({markets:[],count:0,error:'MARKET_FEED_UNAVAILABLE'},{status:503});
  }
}
