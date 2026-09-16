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

export async function GET(){
  try{
    const r=await fetch('https://api.binance.com/api/v3/ticker/24hr',{cache:'no-store'});
    if(!r.ok)throw new Error(`BINANCE_${r.status}`);
    const rows=(await r.json()) as BinanceTicker[];
    const markets=rows
      .filter(x=>x.symbol.endsWith('USDT')&&!/(UP|DOWN|BULL|BEAR)USDT$/.test(x.symbol))
      .map(x=>({
        symbol:x.symbol,
        base:x.symbol.slice(0,-4),
        displayName:`${x.symbol.slice(0,-4)}/USDT`,
        lastPrice:Number(x.lastPrice),
        priceChange:Number(x.priceChange),
        changePct:Number(x.priceChangePercent),
        high24h:Number(x.highPrice),
        low24h:Number(x.lowPrice),
        volume:Number(x.volume),
        quoteVolume:Number(x.quoteVolume),
        bid:Number(x.bidPrice),
        ask:Number(x.askPrice)
      }))
      .filter(x=>Number.isFinite(x.lastPrice)&&x.lastPrice>0)
      .sort((a,b)=>b.quoteVolume-a.quoteVolume);
    return NextResponse.json({markets,ts:Date.now()},{headers:{'Cache-Control':'no-store, max-age=0'}});
  }catch(error){
    return NextResponse.json({markets:[],error:'MARKET_FEED_UNAVAILABLE'},{status:503});
  }
}
