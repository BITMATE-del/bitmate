import {NextResponse} from 'next/server';
const symbols=['BTCUSDT','ETHUSDT','XRPUSDT','SOLUSDT','DOGEUSDT'];
export const revalidate=0;
export async function GET(){try{const q=encodeURIComponent(JSON.stringify(symbols));const r=await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${q}`,{cache:'no-store'});if(!r.ok)throw new Error('market provider unavailable');const data=await r.json();const rows=data.map((x:any)=>({symbol:x.symbol.replace('USDT',''),price:Number(x.lastPrice),changePct:Number(x.priceChangePercent),volume:Number(x.quoteVolume)}));return NextResponse.json({provider:'binance',rows,ts:new Date().toISOString()})}catch{return NextResponse.json({error:'MARKET_UNAVAILABLE',rows:[]},{status:503})}}
