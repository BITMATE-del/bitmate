'use client';
import Link from 'next/link';
import {useState} from 'react';

const coreNav=[
  {href:'/ai-trading',label:'AI Trading'},
  {href:'/cfd-margin',label:'CFD Margin'},
  {href:'/crypto-etf',label:'Crypto ETF'},
  {href:'/crypto-mining',label:'Crypto Mining'},
];

export default function ExchangeHeader(){
  const [mobileOpen,setMobileOpen]=useState(false);
  return <header className="xtHeader">
    <div className="xtShell xtHeaderInner">
      <Link className="xtBrand" href="/"><span className="xtLogo">B</span><b>BITMATE</b></Link>
      <button className="mobileToggle" onClick={()=>setMobileOpen(v=>!v)} aria-label="Toggle menu">☰</button>
      <nav className={mobileOpen?'mobileOpen':''}>
        {coreNav.map(item=><Link key={item.href} href={item.href} onClick={()=>setMobileOpen(false)}>{item.label}</Link>)}
        <Link href="/#markets" onClick={()=>setMobileOpen(false)}>Markets</Link>
        <Link href="/more" onClick={()=>setMobileOpen(false)}>More <span>⌄</span></Link>
      </nav>
      <div className="xtHeaderTools"><button className="searchPill">⌕ BTC/USDT</button><Link className="loginLink" href="/login">Log in</Link><Link className="limeBtn headerBtn" href="/signup">Sign up</Link><button className="iconBtn">↓</button><button className="iconBtn">◎</button></div>
    </div>
  </header>
}
