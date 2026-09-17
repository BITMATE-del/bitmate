import {NextResponse} from 'next/server';

export const dynamic='force-dynamic';
export const revalidate=0;

type ExchangeInfo={symbols:Array<{symbol:string;pair:string;contractType:string;status:string;baseAsset:string;quoteAsset:string;pricePrecision:number;quantityPrecision:number}>};
type Ticker={symbol:string;lastPrice:string;priceChangePercent:string;highPrice:string;lowPrice:string;volume:string;quoteVolume:string};
type Premium={symbol:string;markPrice:string;indexPrice:string;lastFundingRate:string;nextFundingTime:number};
type Book={symbol:string;bidPrice:string;askPrice:string};

const bases=['https://www.binance.com','https://fapi.binance.com','https://fapi1.binance.com','https://fapi2.binance.com','https://fapi3.binance.com','https://fapi4.binance.com'];

async function getJson<T>(path:string):Promise<{data:T;source:string}>{
  const errors:string[]=[];
  for(const base of bases){
    try{
      const r=await fetch(`${base}${path}`,{cache:'no-store',headers:{Accept:'application/json','User-Agent':'Mozilla/5.0'}});
      if(!r.ok){errors.push(`${base}:${r.status}`);continue;}
      return {data:await r.json() as T,source:base};
    }catch(e:any){errors.push(`${base}:${String(e?.message||e)}`)}
  }
  throw new Error(errors.join(' | '));
}

export async function GET(){
  try{
    const [exchange,tickers,premiums,books]=await Promise.all([
      getJson<ExchangeInfo>('/fapi/v1/exchangeInfo'),
      getJson<Ticker[]>('/fapi/v1/ticker/24hr'),
      getJson<Premium[]>('/fapi/v1/premiumIndex'),
      getJson<Book[]>('/fapi/v1/ticker/bookTicker')
    ]);
    const allowed=new Map(exchange.data.symbols.filter(x=>x.contractType==='PERPETUAL'&&x.status==='TRADING'&&x.quoteAsset==='USDT').map(x=>[x.symbol,x]));
    const premiumMap=new Map(premiums.data.map(x=>[x.symbol,x]));
    const bookMap=new Map(books.data.map(x=>[x.symbol,x]));
    const markets=tickers.data.filter(x=>allowed.has(x.symbol)).map(x=>{
      const meta=allowed.get(x.symbol)!;const p=premiumMap.get(x.symbol);const b=bookMap.get(x.symbol);
      return {symbol:x.symbol,base:meta.baseAsset,displayName:`${meta.baseAsset}/USDT`,lastPrice:Number(x.lastPrice),changePct:Number(x.priceChangePercent),high24h:Number(x.highPrice),low24h:Number(x.lowPrice),volume:Number(x.volume),quoteVolume:Number(x.quoteVolume),markPrice:Number(p?.markPrice||x.lastPrice),indexPrice:Number(p?.indexPrice||x.lastPrice),fundingRate:Number(p?.lastFundingRate||0),nextFundingTime:Number(p?.nextFundingTime||0),bid:Number(b?.bidPrice||0),ask:Number(b?.askPrice||0),pricePrecision:meta.pricePrecision,quantityPrecision:meta.quantityPrecision,tradingViewSymbol:`BINANCE:${x.symbol}.P`};
    }).filter(x=>Number.isFinite(x.lastPrice)&&x.lastPrice>0).sort((a,b)=>b.quoteVolume-a.quoteVolume);
    return NextResponse.json({markets,count:markets.length,source:tickerersSource(tickers.source),ts:Date.now()},{headers:{'Cache-Control':'no-store, max-age=0'}});
  }catch(error:any){
    console.error('FUTURES_MARKET_FEED_ERROR',String(error?.message||error));
    return NextResponse.json({markets:[],count:0,error:'FUTURES_MARKET_FEED_UNAVAILABLE',detail:String(error?.message||error)},{status:503});
  }
}

function tickerersSource(source:string){return source}
