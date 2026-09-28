import {NextResponse} from 'next/server';

const symbols=['BTCUSDT','ETHUSDT','XRPUSDT','SOLUSDT','DOGEUSDT'];
const spotBases=['https://www.binance.com','https://api.binance.com','https://api1.binance.com','https://api2.binance.com','https://api3.binance.com'];
const futuresBases=['https://www.binance.com','https://fapi.binance.com','https://fapi1.binance.com','https://fapi2.binance.com','https://fapi3.binance.com'];

export const dynamic='force-dynamic';
export const revalidate=0;

async function fetchJson(base:string,path:string){
  const r=await fetch(base+path,{
    cache:'no-store',
    headers:{Accept:'application/json','User-Agent':'Mozilla/5.0'},
    signal:AbortSignal.timeout(5000)
  });
  if(!r.ok)throw new Error(`${base} ${r.status}`);
  return r.json();
}

async function fromSpot(){
  const q=encodeURIComponent(JSON.stringify(symbols));
  const errors:string[]=[];
  for(const base of spotBases){
    try{
      const data=await fetchJson(base,`/api/v3/ticker/24hr?symbols=${q}`);
      if(!Array.isArray(data))throw new Error('invalid payload');
      return {
        provider:'binance-spot',
        source:base,
        rows:data.map((x:any)=>({
          symbol:String(x.symbol||'').replace(/USDT$/,''),
          price:Number(x.lastPrice),
          changePct:Number(x.priceChangePercent),
          volume:Number(x.quoteVolume)
        })).filter((x:any)=>symbols.includes(`${x.symbol}USDT`)&&Number.isFinite(x.price)&&x.price>0)
      };
    }catch(e:any){errors.push(String(e?.message||e))}
  }
  throw new Error(errors.join(' | '));
}

async function fromFutures(){
  const errors:string[]=[];
  for(const base of futuresBases){
    try{
      const data=await fetchJson(base,'/fapi/v1/ticker/24hr');
      if(!Array.isArray(data))throw new Error('invalid payload');
      const rows=symbols.map(symbol=>{
        const x=data.find((m:any)=>m?.symbol===symbol);
        return x?{
          symbol:symbol.replace(/USDT$/,''),
          price:Number(x.lastPrice),
          changePct:Number(x.priceChangePercent),
          volume:Number(x.quoteVolume)
        }:null;
      }).filter((x):x is {symbol:string;price:number;changePct:number;volume:number}=>!!x&&Number.isFinite(x.price)&&x.price>0);
      if(!rows.length)throw new Error('empty futures fallback');
      return {provider:'binance-futures-fallback',source:base,rows};
    }catch(e:any){errors.push(String(e?.message||e))}
  }
  throw new Error(errors.join(' | '));
}

export async function GET(){
  try{
    const result=await fromSpot();
    return NextResponse.json({...result,ts:Date.now()},{headers:{'Cache-Control':'no-store, max-age=0'}});
  }catch(spotError:any){
    try{
      const result=await fromFutures();
      return NextResponse.json({...result,fallback:true,ts:Date.now()},{headers:{'Cache-Control':'no-store, max-age=0'}});
    }catch(futuresError:any){
      console.error('MARKET_FEED_ERROR',{spot:String(spotError?.message||spotError),futures:String(futuresError?.message||futuresError)});
      return NextResponse.json({error:'MARKET_UNAVAILABLE',rows:[]},{status:503});
    }
  }
}
