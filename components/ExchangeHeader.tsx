'use client';
import Link from 'next/link';
import {useState} from 'react';

const coreNav=[
  {href:'/ai-trading',label:'AI Trading'},
  {href:'/cfd-margin',label:'CFD Margin'},
  {href:'/crypto-etf',label:'Crypto ETF'},
];

export default function ExchangeHeader(){
  const [mobileOpen,setMobileOpen]=useState(false);
  const [miningOpen,setMiningOpen]=useState(false);

  const closeMenus=()=>{setMobileOpen(false);setMiningOpen(false)};

  return <header className="xtHeader">
    <div className="xtShell xtHeaderInner">
      <Link className="xtBrand" href="/" onClick={closeMenus}><span className="xtLogo">B</span><b>BITMATE</b></Link>
      <button className="mobileToggle" onClick={()=>setMobileOpen(v=>!v)} aria-label="Toggle menu">☰</button>
      <nav className={mobileOpen?'mobileOpen':''}>
        {coreNav.map(item=><Link key={item.href} href={item.href} onClick={closeMenus}>{item.label}</Link>)}

        <div className="navDropdown" onMouseEnter={()=>setMiningOpen(true)} onMouseLeave={()=>setMiningOpen(false)}>
          <button className={miningOpen?'navDropButton active':'navDropButton'} onClick={()=>setMiningOpen(v=>!v)} aria-expanded={miningOpen}>
            Mining <span>⌄</span>
          </button>
          <div className={miningOpen?'tradeDropdown open':'tradeDropdown'}>
            <Link className="tradeMenuItem" href="/mining" onClick={closeMenus}>
              <span className="tradeIcon">⛏</span>
              <span><b>Mining Home</b><small>채굴기 가동, Mining Power, 오늘 예상 보상 확인</small></span>
              <em>›</em>
            </Link>
            <Link className="tradeMenuItem" href="/my-mining" onClick={closeMenus}>
              <span className="tradeIcon">◫</span>
              <span><b>My Mining</b><small>내 Position, 누적 보상, Mining History 확인</small></span>
              <em>›</em>
            </Link>
          </div>
        </div>

        <Link href="/#markets" onClick={closeMenus}>Markets</Link>
        <Link href="/more" onClick={closeMenus}>More <span>⌄</span></Link>
      </nav>
      <div className="xtHeaderTools"><button className="searchPill">⌕ BTC/USDT</button><Link className="loginLink" href="/login">Log in</Link><Link className="limeBtn headerBtn" href="/signup">Sign up</Link><button className="iconBtn">↓</button><button className="iconBtn">◎</button></div>
    </div>
  </header>
}
