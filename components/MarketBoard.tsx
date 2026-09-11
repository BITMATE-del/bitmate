'use client';
import {useEffect,useState} from 'react';
type Row={symbol:string,price:number,changePct:number,volume:number};

const names:Record<string,string>={BTC:'Bitcoin',ETH:'Ethereum',XRP:'XRP',SOL:'Solana',DOGE:'Dogecoin'};
const marks:Record<string,string>={BTC:'₿',ETH:'Ξ',XRP:'X',SOL:'S',DOGE:'Ð'};

export default function MarketBoard(){
  const [rows,setRows]=useState<Row[]>([]);const [err,setErr]=useState('');
  useEffect(()=>{const load=()=>fetch('/api/market').then(r=>r.ok?r.json():Promise.reject()).then(d=>{setRows(d.rows);setErr('')}).catch(()=>setErr('시세 데이터를 불러오는 중입니다.'));load();const id=setInterval(load,8000);return()=>clearInterval(id)},[]);
  return <section className="market-section"><div className="section-head"><div><span className="eyebrow">MARKETS</span><h2>주요 시장</h2></div><span className="market-status"><span className="status-dot"/> 실시간</span></div>
    {err&&<div className="market-notice">{err}</div>}
    <div className="market-grid">{rows.length?rows.map(r=><div className="market-card" key={r.symbol}><div className="coin-head"><span className="coin-mark">{marks[r.symbol]||r.symbol[0]}</span><div><strong>{r.symbol}/USDT</strong><span>{names[r.symbol]||r.symbol}</span></div></div><div className="market-price">${r.price.toLocaleString(undefined,{maximumFractionDigits:r.price<10?4:2})}</div><div className="market-meta"><span className={r.changePct>=0?'positive':'negative'}>{r.changePct>=0?'+':''}{r.changePct.toFixed(2)}%</span><span>Vol ${(r.volume/1_000_000).toFixed(1)}M</span></div></div>):['BTC','ETH','XRP','SOL','DOGE'].map(s=><div className="market-card skeleton-card" key={s}><div className="coin-head"><span className="coin-mark">{marks[s]}</span><div><strong>{s}/USDT</strong><span>{names[s]}</span></div></div><div className="skeleton-line wide"/><div className="skeleton-line"/></div>)}</div>
  </section>
}
