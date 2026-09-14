'use client';
import Link from 'next/link';
import {useState} from 'react';

const coreNav=[
  {href:'/cfd-margin',label:'CFD Margin'},
  {href:'/crypto-etf',label:'Crypto ETF'},
];

export default function ExchangeHeader(){
  const [mobileOpen,setMobileOpen]=useState(false);
  const [miningOpen,setMiningOpen]=useState(false);
  const [aiOpen,setAiOpen]=useState(false);
  const [copyOpen,setCopyOpen]=useState(false);
  const closeMenus=()=>{setMobileOpen(false);setMiningOpen(false);setAiOpen(false);setCopyOpen(false)};

  return <header className="xtHeader">
    <div className="xtShell xtHeaderInner">
      <Link className="xtBrand" href="/" onClick={closeMenus}><span className="xtLogo">B</span><b>BITMATE</b></Link>
      <button className="mobileToggle" onClick={()=>setMobileOpen(v=>!v)} aria-label="Toggle menu">☰</button>
      <nav className={mobileOpen?'mobileOpen':''}>
        <div className="navDropdown" onMouseEnter={()=>setAiOpen(true)} onMouseLeave={()=>setAiOpen(false)}>
          <button className={aiOpen?'navDropButton active':'navDropButton'} onClick={()=>setAiOpen(v=>!v)} aria-expanded={aiOpen}>AI Trading <span>⌄</span></button>
          <div className={aiOpen?'tradeDropdown open':'tradeDropdown'}>
            <Link className="tradeMenuItem" href="/ai-core" onClick={closeMenus}><span className="tradeIcon">◉</span><span><b>AI CORE</b><small>AI 전략 선택, Risk Engine, 실시간 PnL과 Agent 상태</small></span><em>›</em></Link>
            <Link className="tradeMenuItem" href="/ai-core/portfolio" onClick={closeMenus}><span className="tradeIcon">⌁</span><span><b>My AI Portfolio</b><small>AI 세션, 포지션, PnL, 운용 History 확인</small></span><em>›</em></Link>
          </div>
        </div>
        <div className="navDropdown" onMouseEnter={()=>setCopyOpen(true)} onMouseLeave={()=>setCopyOpen(false)}>
          <button className={copyOpen?'navDropButton active':'navDropButton'} onClick={()=>setCopyOpen(v=>!v)} aria-expanded={copyOpen}>Copy Trading <span>⌄</span></button>
          <div className={copyOpen?'tradeDropdown open':'tradeDropdown'}>
            <Link className="tradeMenuItem" href="/copy-trading" onClick={closeMenus}><span className="tradeIcon">◎</span><span><b>Copy Trading</b><small>트레이더 탐색, 실제 성과와 리스크 비교, 카피 시작</small></span><em>›</em></Link>
            <Link className="tradeMenuItem" href="/my-copy" onClick={closeMenus}><span className="tradeIcon">◫</span><span><b>My Copy</b><small>카피 투자금, 포지션, 손익과 카피 상태 관리</small></span><em>›</em></Link>
            <Link className="tradeMenuItem" href="/copy-trading/history" onClick={closeMenus}><span className="tradeIcon">↺</span><span><b>Copy History</b><small>원본 주문과 연결된 카피 주문 내역 확인</small></span><em>›</em></Link>
          </div>
        </div>
        {coreNav.map(item=><Link key={item.href} href={item.href} onClick={closeMenus}>{item.label}</Link>)}
        <div className="navDropdown" onMouseEnter={()=>setMiningOpen(true)} onMouseLeave={()=>setMiningOpen(false)}>
          <button className={miningOpen?'navDropButton active':'navDropButton'} onClick={()=>setMiningOpen(v=>!v)} aria-expanded={miningOpen}>Mining <span>⌄</span></button>
          <div className={miningOpen?'tradeDropdown open':'tradeDropdown'}>
            <Link className="tradeMenuItem" href="/mining" onClick={closeMenus}><span className="tradeIcon">⛏</span><span><b>Mining Home</b><small>채굴기 가동, Mining Power, 오늘 예상 보상 확인</small></span><em>›</em></Link>
            <Link className="tradeMenuItem" href="/my-mining" onClick={closeMenus}><span className="tradeIcon">◫</span><span><b>My Mining</b><small>내 Position, 누적 보상, Mining History 확인</small></span><em>›</em></Link>
          </div>
        </div>
        <Link href="/#markets" onClick={closeMenus}>Markets</Link>
        <Link href="/more" onClick={closeMenus}>More <span>⌄</span></Link>
      </nav>
      <div className="xtHeaderTools"><button className="searchPill">⌕ BTC/USDT</button><Link className="loginLink" href="/login">Log in</Link><Link className="limeBtn headerBtn" href="/signup">Sign up</Link><button className="iconBtn">↓</button><button className="iconBtn">◎</button></div>
    </div>
  </header>
}
