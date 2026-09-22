import {NextResponse} from 'next/server';

export const dynamic='force-dynamic';

export async function GET(){
  try{
    const res=await fetch('https://api.upbit.com/v1/ticker?markets=KRW-USDT',{
      cache:'no-store',
      headers:{Accept:'application/json'},
    });
    if(!res.ok)throw new Error('upbit_fx_unavailable');
    const rows=await res.json() as Array<{trade_price?:number;timestamp?:number}>;
    const rate=Number(rows?.[0]?.trade_price||0);
    if(!Number.isFinite(rate)||rate<=0)throw new Error('invalid_fx_rate');
    return NextResponse.json({pair:'USDT/KRW',rate,source:'Upbit',timestamp:rows?.[0]?.timestamp||Date.now()},{
      headers:{'Cache-Control':'no-store, max-age=0'}
    });
  }catch{
    return NextResponse.json({pair:'USDT/KRW',rate:0,source:'unavailable',timestamp:Date.now()},{status:503});
  }
}
