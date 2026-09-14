'use client';
import Link from 'next/link';
import {useState} from 'react';

const coreNav=[{href:'/cfd',label:'CFD Margin'}];
const desktopMenuStyle={whiteSpace:'nowrap',flexShrink:0} as const;
const dropdownStyle={width:'360px',maxWidth:'calc(100vw - 24px)',boxSizing:'border-box',padding:'14px'} as const;
const dropdownRightStyle={...dropdownStyle,left:'auto',right:0} as const;
const itemStyle={gridTemplateColumns:'28px minmax(0,1fr) 12px',width:'100%',minWidth:0} as const;
const copyStyle={minWidth:0,whiteSpace:'normal'} as const;
const descStyle={display:'block',whiteSpace:'normal',wordBreak:'keep-all',overflowWrap:'break-word',lineHeight:1.5} as const;

export default function ExchangeHeader(){
  const [mobileOpen,setMobileOpen]=useState(false);
  const [miningOpen,setMiningOpen]=useState(false);
  const [aiOpen,setAiOpen]=useState(false);
  const [copyOpen,setCopyOpen]=useState(false);
  const [etfOpen,setEtfOpen]=useState(false);
  const closeMenus=()=>{setMobileOpen(false);setMiningOpen(false);setAiOpen(false);setCopyOpen(false);setEtfOpen(false)};
  const item=(href:string,icon:string,title:string,desc:string)=><Link style={itemStyle} className="tradeMenuItem" href={href} onClick={closeMenus}><span className="tradeIcon">{icon}</span><span style={copyStyle}><b>{title}</b><small style={descStyle}>{desc}</small></span><em>›</em></Link>;

  return <header className="xtHeader"><div className="xtShell xtHeaderInner">
    <Link className="xtBrand" href="/" onClick={closeMenus}><span className="xtLogo">B</span><b>BITMATE</b></Link>
    <button className="mobileToggle" onClick={()=>setMobileOpen(v=>!v)} aria-label="Toggle menu">☰</button>
    <nav className={mobileOpen?'mobileOpen':''} style={{flexWrap:'nowrap',minWidth:0}}>
      <div className="navDropdown" onMouseEnter={()=>setAiOpen(true)} onMouseLeave={()=>setAiOpen(false)}>
        <button style={desktopMenuStyle} className={aiOpen?'navDropButton active':'navDropButton'} onClick={()=>setAiOpen(v=>!v)} aria-expanded={aiOpen}>AI Trading <span>⌄</span></button>
        <div style={dropdownStyle} className={aiOpen?'tradeDropdown open':'tradeDropdown'}>
          {item('/ai-core','◉','AI CORE','AI 전략 선택, Risk Engine, 실시간 PnL과 Agent 상태')}
          {item('/ai-core/portfolio','⌁','My AI Portfolio','AI 세션, 포지션, PnL, 운용 History 확인')}
        </div>
      </div>
      <div className="navDropdown" onMouseEnter={()=>setCopyOpen(true)} onMouseLeave={()=>setCopyOpen(false)}>
        <button style={desktopMenuStyle} className={copyOpen?'navDropButton active':'navDropButton'} onClick={()=>setCopyOpen(v=>!v)} aria-expanded={copyOpen}>Copy Trading <span>⌄</span></button>
        <div style={dropdownStyle} className={copyOpen?'tradeDropdown open':'tradeDropdown'}>
          {item('/copy-trading','◎','Copy Trading','트레이더 탐색, 실제 성과와 리스크 비교, 카피 시작')}
          {item('/my-copy','◫','My Copy','카피 투자금, 포지션, 손익과 카피 상태 관리')}
          {item('/copy-trading/history','↺','Copy History','원본 주문과 연결된 카피 주문 내역 확인')}
        </div>
      </div>
      {coreNav.map(item=><Link style={desktopMenuStyle} key={item.href} href={item.href} onClick={closeMenus}>{item.label}</Link>)}
      <div className="navDropdown" onMouseEnter={()=>setEtfOpen(true)} onMouseLeave={()=>setEtfOpen(false)}>
        <button style={desktopMenuStyle} className={etfOpen?'navDropButton active':'navDropButton'} onClick={()=>setEtfOpen(v=>!v)} aria-expanded={etfOpen}>Crypto ETF <span>⌄</span></button>
        <div style={dropdownRightStyle} className={etfOpen?'tradeDropdown open':'tradeDropdown'}>
          {item('/crypto-etf','◈','BITMATE INDEX','여러 디지털자산을 정해진 비중으로 나눠 담는 바스켓형 분산투자')}
          {item('/crypto-etf/portfolio','◫','My INDEX','보유 Basket, 평가손익, 구성자산과 매도 관리')}
        </div>
      </div>
      <div className="navDropdown" onMouseEnter={()=>setMiningOpen(true)} onMouseLeave={()=>setMiningOpen(false)}>
        <button style={desktopMenuStyle} className={miningOpen?'navDropButton active':'navDropButton'} onClick={()=>setMiningOpen(v=>!v)} aria-expanded={miningOpen}>Mining <span>⌄</span></button>
        <div style={dropdownRightStyle} className={miningOpen?'tradeDropdown open':'tradeDropdown'}>
          {item('/mining','⛏','Mining Home','채굴기 가동, Mining Power, 오늘 예상 보상 확인')}
          {item('/my-mining','◫','My Mining','내 Position, 누적 보상, Mining History 확인')}
        </div>
      </div>
      <Link style={desktopMenuStyle} href="/#markets" onClick={closeMenus}>Markets</Link>
      <Link style={desktopMenuStyle} href="/more" onClick={closeMenus}>More <span>⌄</span></Link>
    </nav>
    <div className="xtHeaderTools" style={{flexShrink:0,gap:'14px',height:'100%'}}>
      <button className="searchPill" style={{height:'40px',width:'172px',minWidth:'172px',borderRadius:'11px',border:'1px solid #4a4e52',background:'#25272a',color:'#9ea4aa',padding:'0 13px',display:'flex',alignItems:'center',gap:'7px',fontSize:'14px'}}><span style={{fontSize:'15px',lineHeight:1}}>⌕</span><span style={{fontSize:'13px'}}>🔥</span><span>BTC/USDT</span></button>
      <Link className="loginLink" href="/login" style={{fontSize:'14px',fontWeight:700,color:'#fff',padding:'0 2px',whiteSpace:'nowrap'}}>Log in</Link>
      <Link className="headerBtn" href="/signup" style={{height:'40px',minHeight:'40px',padding:'0 17px',borderRadius:'8px',background:'#f5f5f5',color:'#111',fontSize:'14px',fontWeight:700,display:'inline-flex',alignItems:'center',justifyContent:'center',whiteSpace:'nowrap'}}>Sign up</Link>
      <button className="iconBtn" aria-label="Download app" style={{width:'30px',height:'40px',padding:0,display:'grid',placeItems:'center'}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 19h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" strokeLinejoin="miter"/></svg></button>
      <button className="iconBtn" aria-label="Language" style={{width:'32px',height:'40px',padding:0,display:'grid',placeItems:'center'}}><svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M3.5 12h17M12 3c2.1 2.3 3.2 5.3 3.2 9S14.1 18.7 12 21M12 3C9.9 5.3 8.8 8.3 8.8 12S9.9 18.7 12 21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg></button>
    </div>
  </div></header>
}
