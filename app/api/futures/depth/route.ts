import {NextRequest,NextResponse} from 'next/server';

export const dynamic='force-dynamic';
export const revalidate=0;

const bases=['https://www.binance.com','https://fapi.binance.com','https://fapi1.binance.com','https://fapi2.binance.com','https://fapi3.binance.com','https://fapi4.binance.com'];

async function getJson<T>(path:string):Promise<T>{
  const errors:string[]=[];
  for(const base of bases){
    try{
      const r=await fetch(`${base}${path}`,{cache:'no-store',headers:{Accept:'application/json','User-Agent':'Mozilla/5.0'}});
      if(!r.ok){errors.push(`${base}:${r.status}`);continue}
      return await r.json() as T;
    }catch(e:any){errors.push(`${base}:${String(e?.message||e)}`)}
  }
  throw new Error(errors.join(' | '));
}

export async function GET(req:NextRequest){
  const symbol=(req.nextUrl.searchParams.get('symbol')||'BTCUSDT').toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(!symbol.endsWith('USDT'))return NextResponse.json({error:'INVALID_SYMBOL'},{status:400});
  try{
    const [depth,trades]=await Promise.all([
      getJson<{lastUpdateId:number;bids:[string,string][];asks:[string,string][]}>(`/fapi/v1/depth?symbol=${encodeURIComponent(symbol)}&limit=20`),
      getJson<Array<{a:number;p:string;q:string;T:number;m:boolean}>>(`/fapi/v1/aggTrades?symbol=${encodeURIComponent(symbol)}&limit=20`)
    ]);
    return NextResponse.json({symbol,depth,trades,ts:Date.now()},{headers:{'Cache-Control':'no-store, max-age=0'}});
  }catch(error:any){
    console.error('FUTURES_DEPTH_FEED_ERROR',symbol,String(error?.message||error));
    return NextResponse.json({error:'FUTURES_DEPTH_FEED_UNAVAILABLE',detail:String(error?.message||error)},{status:503});
  }
}
