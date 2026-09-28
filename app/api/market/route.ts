import {NextResponse} from 'next/server';

const pinned=['BTC','ETH','XRP','SOL','DOGE'];
const excludedBases=new Set(['USDC','FDUSD','TUSD','USDP','DAI','EUR','TRY','BRL','BIDR','UAH','PLN','RON','ARS','AEUR','EURI']);
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

function normalizeRows(data:any[]){
  const rows=data
    .filter((x:any)=>typeof x?.symbol==='string'&&x.symbol.endsWith('USDT')&&!x.symbol.includes('_')&&Number(x.lastPrice)>0)
    .map((x:any)=>{
      const symbol=String(x.symbol).replace(/USDT$/,'');
      return {
        symbol,
        price:Number(x.lastPrice),
        changePct:Number(x.priceChangePercent||0),
        volume:Number(x.quoteVolume||0)
      };
    })
    .filter((x:any)=>!excludedBases.has(x.symbol)&&Number.isFinite(x.price)&&x.price>0&&Number.isFinite(x.volume))
    .sort((a:any,b:any)=>b.volume-a.volume)
    .slice(0,30);

  const bySymbol=new Map(rows.map((x:any)=>[x.symbol,x]));
  const pinnedRows=pinned.map(s=>bySymbol.get(s)).filter(Boolean);
  const rest=rows.filter((x:any)=>!pinned.includes(x.symbol));
  return [...pinnedRows,...rest].slice(0,30);
}

async function fromSpot(){
  const errors:string[]=[];
  for(const base of spotBases){
    try{
      const data=await fetchJson(base,'/api/v3/ticker/24hr');
      if(!Array.isArray(data))throw new Error('invalid payload');
      const rows=normalizeRows(data);
      if(!rows.length)throw new Error('empty spot rows');
      return {provider:'binance-spot',source:base,rows};
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
      const rows=normalizeRows(data);
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
