'use client';
import Link from 'next/link';
import {useState} from 'react';

const tradeItems=[
  {href:'/trade/spot',icon:'◉',title:'Spot',desc:'Trade popular crypto assets anytime'},
  {href:'/trade/etf',icon:'▥',title:'ETF',desc:'Leveraged token products with no liquidation risk'},
  {href:'/trade/margin',icon:'⇅',title:'Margin',desc:'Trade with flexible leverage and borrowing controls'},
  {href:'/trade/rwa',icon:'◎',title:'RWA Zone',desc:'Explore tokenized real-world asset markets'},
  {href:'/trade/mining',icon:'⛏',title:'Mining Zone',desc:'Discover mining-related digital asset products'},
  {href:'/trade/pre-market',icon:'▣',title:'Pre-market',desc:'Explore selected assets before wider listing'},
];

const mainNav=[
  {href:'/#markets',label:'Markets'},
  {href:'/futures',label:'Futures'},
  {href:'/tools',label:'Tools'},
  {href:'/finance',label:'Finance'},
  {href:'/campaigns',label:'Campaigns'},
  {href:'/more',label:'More'},
];

export default function ExchangeHeader(){
  const [tradeOpen,setTradeOpen]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);
  return <header className="xtHeader">
    <div className="xtShell xtHeaderInner">
      <Link className="xtBrand" href="/"><span className="xtLogo">B</span><b>BITMATE</b></Link>
      <button className="mobileToggle" onClick={()=>setMobileOpen(v=>!v)} aria-label="Toggle menu">☰</button>
      <nav className={mobileOpen?'mobileOpen':''}>
        <Link href="/#buy">Buy Crypto</Link>
        <Link href="/#markets">Markets</Link>
        <div className="navDropdown" onMouseEnter={()=>setTradeOpen(true)} onMouseLeave={()=>setTradeOpen(false)}>
          <button className={tradeOpen?'navDropButton active':'navDropButton'} onClick={()=>setTradeOpen(v=>!v)}>Trade <span>⌃</span></button>
          <div className={tradeOpen?'tradeDropdown open':'tradeDropdown'}>
            {tradeItems.map(item=><Link className="tradeMenuItem" href={item.href} key={item.href} onClick={()=>setTradeOpen(false)}>
              <span className="tradeIcon">{item.icon}</span>
              <span><b>{item.title}</b><small>{item.desc}</small></span>
              {item.title==='Pre-market'&&<em>›</em>}
            </Link>)}
          </div>
        </div>
        {mainNav.map(item=><Link key={item.href} href={item.href}>{item.label}<span>⌄</span></Link>)}
      </nav>
      <div className="xtHeaderTools"><button className="searchPill">⌕ BTC/USDT</button><Link className="loginLink" href="/login">Log in</Link><Link className="limeBtn headerBtn" href="/signup">Sign up</Link><button className="iconBtn">↓</button><button className="iconBtn">◎</button></div>
    </div>
  </header>
}
