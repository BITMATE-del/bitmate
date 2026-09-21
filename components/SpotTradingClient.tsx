'use client';

import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import s from './SpotTrading.module.css';

type Market={symbol:string;price:number;changePct:number;volume:number};
type Balance={asset:string;available:number;locked:number};
type Order={id:string;symbol:string;side:'BUY'|'SELL';quote_amount:number;execution_price:number;base_quantity:number;status:string;created_at:string};
type Snapshot={balances:Balance[];orders:Order[];mode:string};

const SUPPORTED=['BTC','ETH','SOL','XRP'];
const fmt=(v:number,d=2)=>Number(v||0).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d});
const priceDigits=(v:number)=>v>=1000?2:v>=1?4:6;

export default function SpotTradingClient(){
 const supabase=useMemo(()=>createBrowserSupabase(),[]);
 const [markets,setMarkets]=useState<Market[]>([]);
 const [symbol,setSymbol]=useState('BTC');
 const [side,setSide]=useState<'BUY'|'SELL'>('BUY');
 const [amount,setAmount]=useState('100');
 const [snap,setSnap]=useState<Snapshot|null>(null);
 const [msg,setMsg]=useState('');
 const [busy,setBusy]=useState(false);

 const market=markets.find(m=>m.symbol===symbol)||null;
 const balances=useMemo(()=>new Map((snap?.balances||[]).map(b=>[b.asset,b])),[snap]);
 const usdt=Number(balances.get('USDT')?.available||0);
 const base=Number(balances.get(symbol)?.available||0);

 async function loadMarket(){
  try{
   const r=await fetch('/api/market',{cache:'no-store'});
   const j=await r.json();
   const rows=(Array.isArray(j?.rows)?j.rows:[]).filter((x:Market)=>SUPPORTED.includes(x.symbol));
   setMarkets(rows);
  }catch{}
 }

 async function loadAccount(){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setSnap(null);return}
  const {data,error}=await supabase.rpc('spot_virtual_snapshot');
  if(!error&&data)setSnap(data as Snapshot);
 }

 useEffect(()=>{loadMarket();loadAccount();const a=setInterval(loadMarket,2500),b=setInterval(loadAccount,3500);return()=>{clearInterval(a);clearInterval(b)}},[]);

 const numeric=Number(amount)||0;
 const estBase=side==='BUY'&&market?.price?numeric/market.price:numeric;
 const estQuote=side==='SELL'&&market?.price?numeric*market.price:numeric;

 const max=()=>{
  if(side==='BUY')setAmount(usdt.toFixed(2));
  else setAmount(base.toFixed(8).replace(/0+$/,'').replace(/\.$/,''));
 };

 async function submit(){
  setMsg('');
  if(!snap){setMsg('로그인이 필요합니다.');return}
  if(!market?.price){setMsg('현재 시세를 확인하는 중입니다.');return}
  if(numeric<=0){setMsg('주문 수량을 확인하세요.');return}
  setBusy(true);
  try{
   const id=crypto.randomUUID();
   const {data,error}=await supabase.rpc('spot_virtual_market_order',{
    p_symbol:symbol+'USDT',
    p_side:side,
    p_amount:numeric,
    p_client_order_id:id
   });
   if(error)throw error;
   const fill=data as any;
   setMsg(`${symbol}/USDT ${side==='BUY'?'매수':'매도'} 체결 · ${fmt(Number(fill.execution_price),priceDigits(Number(fill.execution_price)))}`);
   await loadAccount();
  }catch(e:any){
   const m=String(e?.message||'ORDER_FAILED');
   const map:Record<string,string>={
    LOGIN_REQUIRED:'로그인이 필요합니다.',
    SPOT_TRADING_DISABLED:'현재 현물 거래가 비활성화되어 있습니다.',
    INSUFFICIENT_USDT:'USDT 잔액이 부족합니다.',
    INSUFFICIENT_ASSET:`${symbol} 잔액이 부족합니다.`,
    PRICE_UNAVAILABLE:'체결 기준 시세를 확인할 수 없습니다.'
   };
   setMsg(map[m]||m);
  }finally{setBusy(false)}
 }

 return <main className={s.page}>
  {msg&&<div className={s.toast}>{msg}</div>}
  <section className={s.header}>
   <div className={s.pairs}>{SUPPORTED.map(x=>{const m=markets.find(v=>v.symbol===x);return <button key={x} onClick={()=>setSymbol(x)} className={symbol===x?s.activePair:''}><b>{x}/USDT</b><span>{m?fmt(m.price,priceDigits(m.price)):'—'}</span><em className={(m?.changePct||0)>=0?s.up:s.down}>{m?((m.changePct>=0?'+':'')+m.changePct.toFixed(2)+'%'):'—'}</em></button>})}</div>
  </section>

  <section className={s.workspace}>
   <div className={s.chart}>
    <div className={s.chartTop}><div><small>SPOT</small><h1>{symbol}/USDT</h1></div><div><strong>{market?fmt(market.price,priceDigits(market.price)):'—'}</strong><span className={(market?.changePct||0)>=0?s.up:s.down}>{market?((market.changePct>=0?'+':'')+market.changePct.toFixed(2)+'%'):'—'}</span></div></div>
    <div className={s.chartGrid}><svg viewBox="0 0 600 260" preserveAspectRatio="none"><defs><linearGradient id="spotFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b9ff31" stopOpacity=".2"/><stop offset="100%" stopColor="#b9ff31" stopOpacity="0"/></linearGradient></defs><path d="M0 210 C45 190 58 160 95 175 S145 205 180 148 S235 85 275 105 S330 160 370 116 S430 62 465 76 S530 48 600 28 L600 260 L0 260 Z" fill="url(#spotFill)"/><path d="M0 210 C45 190 58 160 95 175 S145 205 180 148 S235 85 275 105 S330 160 370 116 S430 62 465 76 S530 48 600 28" fill="none" stroke="#b9ff31" strokeWidth="3"/></svg></div>
    <div className={s.marketStats}><span>24H Volume <b>{market?new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(market.volume):'—'} USDT</b></span><span>Execution <b>BITMATE Internal</b></span></div>
   </div>

   <aside className={s.orderPanel}>
    <div className={s.sideTabs}><button className={side==='BUY'?s.buyActive:''} onClick={()=>setSide('BUY')}>Buy</button><button className={side==='SELL'?s.sellActive:''} onClick={()=>setSide('SELL')}>Sell</button></div>
    <div className={s.orderType}><b>Market</b><span>즉시 체결</span></div>
    <div className={s.balance}><span>Available</span><b>{side==='BUY'?fmt(usdt,2)+' USDT':fmt(base,8)+' '+symbol}</b></div>
    <label><span>{side==='BUY'?'Spend':'Amount'}</span><div><input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal"/><em>{side==='BUY'?'USDT':symbol}</em></div></label>
    <button className={s.max} onClick={max}>MAX</button>
    <div className={s.preview}><span>현재가 <b>{market?fmt(market.price,priceDigits(market.price)):'—'} USDT</b></span><span>{side==='BUY'?'예상 수량':'예상 수령'} <b>{side==='BUY'?fmt(estBase,8)+' '+symbol:fmt(estQuote,2)+' USDT'}</b></span></div>
    <button className={side==='BUY'?s.buyButton:s.sellButton} disabled={busy||!market} onClick={submit}>{busy?'처리 중...':side==='BUY'?'Buy '+symbol:'Sell '+symbol}</button>
   </aside>
  </section>

  <section className={s.bottom}>
   <div className={s.balanceCards}>{['USDT',...SUPPORTED].map(a=><div key={a}><span>{a}</span><b>{fmt(Number(balances.get(a)?.available||0),a==='USDT'?2:8)}</b></div>)}</div>
   <div className={s.history}><h2>Order History</h2><div className={s.tableHead}><span>Time</span><span>Pair</span><span>Side</span><span>Price</span><span>Qty</span><span>Status</span></div>{(snap?.orders||[]).length?(snap?.orders||[]).slice(0,20).map(o=><div className={s.row} key={o.id}><span>{new Date(o.created_at).toLocaleString()}</span><span>{o.symbol.replace('USDT','/USDT')}</span><span className={o.side==='BUY'?s.up:s.down}>{o.side}</span><span>{fmt(o.execution_price,priceDigits(o.execution_price))}</span><span>{fmt(o.base_quantity,8)}</span><span>{o.status}</span></div>):<div className={s.empty}>주문 내역이 없습니다.</div>}</div>
  </section>
 </main>
}
