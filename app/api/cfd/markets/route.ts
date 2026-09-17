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

const endpoints=[
  'https://data-api.binance.vision/api/v3/ticker/24hr',
  'https://api1.binance.com/api/v3/ticker/24hr',
  'https://api2.binance.com/api/v3/ticker/24hr',
  'https://api3.binance.com/api/v3/ticker/24hr',
  'https://api4.binance.com/api/v3/ticker/24hr',
  'https://api.binance.com/api/v3/ticker/24hr'
];

async function fetchTickers(){
  const errors:string[]=[];
  for(const url of endpoints){
    try{
      const r=await fetch(url,{cache:'no-store',headers:{'Accept':'application/json','User-Agent':'Mozilla/5.0'}});
      if(!r.ok){errors.push(`${url}:${r.status}`);continue;}
      const rows=await r.json();
      if(Array.isArray(rows)&&rows.length)return {rows:rows as BinanceTicker[],source:url};
      errors.push(`${url}:EMPTY`);
    }catch(e:any){
      errors.push(`${url}:${String(e?.message||e)}`);
    }
  }
  throw new Error(errors.join(' | '));
}

export async function GET(){
  try{
    const {rows,source}=await fetchTickers();
    const markets=rows
      .filter(x=>x.symbol.endsWith('USDT')&&!/(UP|DOWN|BULL|BEAR)USDT$/.test(x.symbol))
      .map(x=>({
        symbol:x.symbol,
        base:x.symbol.slice(0,-4),
        displayName:`${x.symbol.slice(0,-4)}/USDT`,
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
      }))
      .filter(x=>Number.isFinite(x.lastPrice)&&x.lastPrice>0)
      .sort((a,b)=>b.quoteVolume-a.quoteVolume);

    return NextResponse.json(
      {markets,count:markets.length,source,ts:Date.now()},
      {headers:{'Cache-Control':'no-store, max-age=0'}}
    );
  }catch(error:any){
    console.error('CFD_MARKET_FEED_ERROR',String(error?.message||error));
    return NextResponse.json({markets:[],count:0,error:'MARKET_FEED_UNAVAILABLE',detail:String(error?.message||error)},{status:503});
  }
}
