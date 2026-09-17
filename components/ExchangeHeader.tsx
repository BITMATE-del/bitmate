'use client';
import Link from 'next/link';
import {useEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import HeaderUserTools from './HeaderUserTools';

const desktopMenuStyle={whiteSpace:'nowrap',flexShrink:0} as const;
const dropdownStyle={width:'360px',maxWidth:'calc(100vw - 24px)',boxSizing:'border-box',padding:'14px'} as const;
const dropdownRightStyle={...dropdownStyle,left:'auto',right:0} as const;
const itemStyle={gridTemplateColumns:'28px minmax(0,1fr) 12px',width:'100%',minWidth:0} as const;
const copyStyle={minWidth:0,whiteSpace:'normal'} as const;
const descStyle={display:'block',whiteSpace:'normal',wordBreak:'keep-all',overflowWrap:'break-word',lineHeight:1.5} as const;

type MarketRow={symbol:string;price:number;changePct:number;volume:number};
type TraderRow={id:string;nickname:string;risk_level:string};
type TraderPerf={trader_id:string;roi_30d:number|null};

const baseQuickLinks=[
 {href:'/ai-core',icon:'◉',label:'AI Trading',sub:'AI 자동운용'},
 {href:'/copy-trading',icon:'◎',label:'Copy Trading',sub:'트레이더 카피'},
 {href:'/cfd',icon:'↗',label:'CFD Margin',sub:'레버리지 거래'},
 {href:'/crypto-etf',icon:'◈',label:'Crypto ETF',sub:'BITMATE INDEX'},
 {href:'/mining',icon:'⛏',label:'Mining',sub:'Digital Mining'},
 {href:'/crypto-loan',icon:'◫',label:'Crypto Loan',sub:'암호화폐 담보 대출'},
 {href:'/#markets',icon:'▦',label:'Markets',sub:'실시간 시장'},
];

const panelStyle:CSSProperties={position:'absolute',right:0,top:'48px',width:'480px',maxWidth:'calc(100vw - 32px)',maxHeight:'calc(100vh - 86px)',overflowY:'auto',background:'#181a1c',border:'1px solid #26292c',borderRadius:'20px',boxShadow:'0 28px 80px rgba(0,0,0,.55)',padding:'22px 20px',zIndex:240};
const sectionTitleStyle={fontSize:'13px',fontWeight:800,color:'#f3f5f6',margin:'8px 0 14px'} as const;

export default function ExchangeHeader(){
  const supabase=useMemo(()=>createBrowserSupabase(),[]);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [miningOpen,setMiningOpen]=useState(false);
  const [aiOpen,setAiOpen]=useState(false);
  const [copyOpen,setCopyOpen]=useState(false);
  const [etfOpen,setEtfOpen]=useState(false);
  const [moreOpen,setMoreOpen]=useState(false);
  const [searchOpen,setSearchOpen]=useState(false);
  const [query,setQuery]=useState('');
  const [markets,setMarkets]=useState<MarketRow[]>([]);
  const [traders,setTraders]=useState<TraderRow[]>([]);
  const [traderPerf,setTraderPerf]=useState<Record<string,TraderPerf>>({});
  const [isLoggedIn,setIsLoggedIn]=useState(false);
  const searchRef=useRef<HTMLDivElement>(null);

  const closeMenus=()=>{setMobileOpen(false);setMiningOpen(false);setAiOpen(false);setCopyOpen(false);setEtfOpen(false);setMoreOpen(false)};
  const item=(href:string,icon:string,title:string,desc:string)=><Link style={itemStyle} className="tradeMenuItem" href={href} onClick={closeMenus}><span className="tradeIcon">{icon}</span><span style={copyStyle}><b>{title}</b><small style={descStyle}>{desc}</small></span><em>›</em></Link>;

  useEffect(()=>{
    let alive=true;
    supabase.auth.getUser().then(({data:{user}})=>{if(alive)setIsLoggedIn(!!user)});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{if(alive)setIsLoggedIn(!!session?.user)});
    return()=>{alive=false;subscription.unsubscribe()};
  },[supabase]);

  useEffect(()=>{
    const onDown=(e:MouseEvent)=>{if(searchRef.current&&!searchRef.current.contains(e.target as Node))setSearchOpen(false)};
    document.addEventListener('mousedown',onDown);return()=>document.removeEventListener('mousedown',onDown);
  },[]);

  useEffect(()=>{
    if(!searchOpen)return;
    let cancelled=false;
    Promise.all([
      fetch('/api/market',{cache:'no-store'}).then(r=>r.ok?r.json():{rows:[]}).catch(()=>({rows:[]})),
      supabase.from('copy_traders').select('id,nickname,risk_level').eq('visible',true).eq('status','ACTIVE').eq('data_mode','LIVE').limit(4),
      supabase.from('copy_trader_performance').select('trader_id,roi_30d').limit(50),
    ]).then(([m,t,p])=>{
      if(cancelled)return;
      setMarkets((m?.rows||[]) as MarketRow[]);
      setTraders((t.data||[]) as TraderRow[]);
      const map:Record<string,TraderPerf>={};(p.data||[]).forEach((x:TraderPerf)=>map[x.trader_id]=x);setTraderPerf(map);
    });
    return()=>{cancelled=true};
  },[searchOpen,supabase]);

  const quickLinks=isLoggedIn?[...baseQuickLinks,{href:'/more/btmt-membership',icon:'◆',label:'BTMT Membership',sub:'BTMT 스테이킹 멤버십'}]:baseQuickLinks;
  const q=query.trim().toLowerCase();
  const filteredLinks=quickLinks.filter(x=>!q||`${x.label} ${x.sub}`.toLowerCase().includes(q));
  const filteredMarkets=markets.filter(x=>!q||`${x.symbol} usdt`.toLowerCase().includes(q));
  const filteredTraders=traders.filter(x=>!q||x.nickname.toLowerCase().includes(q));
  const hotSymbol=markets[0]?.symbol||'BTC';

  return <header className="xtHeader"><div className="xtShell xtHeaderInner" style={{width:'100%',maxWidth:'none',margin:0,padding:'0 24px',gap:'22px',boxSizing:'border-box'}}>
    <Link className="xtBrand" href="/" onClick={closeMenus} style={{flexShrink:0}}><span className="xtLogo">B</span><b>BITMATE</b></Link>
    <button className="mobileToggle" onClick={()=>setMobileOpen(v=>!v)} aria-label="Toggle menu">☰</button>
    <nav className={mobileOpen?'mobileOpen':''} style={{flex:'0 1 auto',flexWrap:'nowrap',minWidth:0}}>
      <Link style={desktopMenuStyle} href="/futures" onClick={closeMenus}>Futures</Link>
      <Link style={desktopMenuStyle} href="/cfd" onClick={closeMenus}>CFD Margin</Link>

      <div className="navDropdown" onMouseEnter={()=>setAiOpen(true)} onMouseLeave={()=>setAiOpen(false)}>
        <button style={desktopMenuStyle} className={aiOpen?'navDropButton active':'navDropButton'} onClick={()=>setAiOpen(v=>!v)} aria-expanded={aiOpen}>AI Trading <span>⌄</span></button>
        <div style={dropdownStyle} className={aiOpen?'tradeDropdown open':'tradeDropdown'}>{item('/ai-core','◉','AI CORE','AI 전략 선택, Risk Engine, 실시간 PnL과 Agent 상태')}{item('/ai-core/portfolio','⌁','My AI Portfolio','AI 세션, 포지션, PnL, 운용 History 확인')}</div>
      </div>

      <div className="navDropdown" onMouseEnter={()=>setEtfOpen(true)} onMouseLeave={()=>setEtfOpen(false)}>
        <button style={desktopMenuStyle} className={etfOpen?'navDropButton active':'navDropButton'} onClick={()=>setEtfOpen(v=>!v)} aria-expanded={etfOpen}>Crypto ETF <span>⌄</span></button>
        <div style={dropdownRightStyle} className={etfOpen?'tradeDropdown open':'tradeDropdown'}>{item('/crypto-etf','◈','BITMATE INDEX','여러 디지털자산을 정해진 비중으로 나눠 담는 바스켓형 분산투자')}{item('/crypto-etf/portfolio','◫','My INDEX','보유 Basket, 평가손익, 구성자산과 매도 관리')}</div>
      </div>

      <div className="navDropdown" onMouseEnter={()=>setCopyOpen(true)} onMouseLeave={()=>setCopyOpen(false)}>
        <button style={desktopMenuStyle} className={copyOpen?'navDropButton active':'navDropButton'} onClick={()=>setCopyOpen(v=>!v)} aria-expanded={copyOpen}>Copy Trading <span>⌄</span></button>
        <div style={dropdownStyle} className={copyOpen?'tradeDropdown open':'tradeDropdown'}>{item('/copy-trading','◎','Copy Trading','트레이더 탐색, 실제 성과와 리스크 비교, 카피 시작')}{item('/my-copy','◫','My Copy','카피 투자금, 포지션, 손익과 카피 상태 관리')}{item('/copy-trading/history','↺','Copy History','원본 주문과 연결된 카피 주문 내역 확인')}</div>
      </div>

      <div className="navDropdown" onMouseEnter={()=>setMiningOpen(true)} onMouseLeave={()=>setMiningOpen(false)}>
        <button style={desktopMenuStyle} className={miningOpen?'navDropButton active':'navDropButton'} onClick={()=>setMiningOpen(v=>!v)} aria-expanded={miningOpen}>Mining <span>⌄</span></button>
        <div style={dropdownRightStyle} className={miningOpen?'tradeDropdown open':'tradeDropdown'}>{item('/mining','⛏','Mining Home','채굴기 가동, Mining Power, 오늘 예상 보상 확인')}{item('/my-mining','◫','My Mining','내 Position, 누적 보상, Mining History 확인')}</div>
      </div>

      <Link style={desktopMenuStyle} href="/#markets" onClick={closeMenus}>Markets</Link>
      <Link style={desktopMenuStyle} href="/p2p-markets" onClick={closeMenus}>P2P Markets</Link>

      <div className="navDropdown" onMouseEnter={()=>setMoreOpen(true)} onMouseLeave={()=>setMoreOpen(false)}>
        <button style={desktopMenuStyle} className={moreOpen?'navDropButton active':'navDropButton'} onClick={()=>setMoreOpen(v=>!v)} aria-expanded={moreOpen}>More <span>⌄</span></button>
        <div style={{...dropdownRightStyle,width:'390px',maxHeight:'calc(100vh - 100px)',overflowY:'auto'}} className={moreOpen?'tradeDropdown open':'tradeDropdown'}>
          {item('/more/notice','▣','Notice','서비스 공지, 시스템 업데이트 및 점검 안내')}
          {item('/more/referral','↗','Referral Program','초대 링크, 추천 현황 및 커미션 프로그램')}
          {item('/more/reward-hub','◆','Reward Hub','레퍼럴 파트너·총판 성과와 리워드 관리')}
          {item('/more/academy','▤','Academy','플랫폼 사용법, 상품 가이드 및 시작 안내')}
          {item('/more/mining-boost','⚡','Mining Boost','Mining Power 및 채굴 효율 부스트 프로그램')}
          {item('/lucky-draw','✦','Lucky Draw','행운볼 획득, 서버 추첨 및 보상 내역')}
          {item('/crypto-loan','◫','Crypto Loan','보유 암호화폐를 담보로 하는 자산담보 대출')}
          {isLoggedIn&&item('/more/btmt-membership','◆','BTMT Membership','BTMT 스테이킹 등급과 거래금액 리워드')}
        </div>
      </div>
    </nav>

    <div className="xtHeaderTools" style={{marginLeft:'auto',flexShrink:0,gap:'14px',height:'100%'}}>
      <div ref={searchRef} style={{position:'relative'}}>
        <button className="searchPill" onClick={()=>setSearchOpen(v=>!v)} aria-expanded={searchOpen} style={{height:'40px',width:'172px',minWidth:'172px',borderRadius:'11px',border:'1px solid #4a4e52',background:'#25272a',color:'#9ea4aa',padding:'0 13px',display:'flex',alignItems:'center',gap:'7px',fontSize:'14px',cursor:'pointer'}}><span style={{fontSize:'15px',lineHeight:1}}>⌕</span><span style={{fontSize:'13px'}}>🔥</span><span>{hotSymbol}/USDT</span></button>
        {searchOpen&&<div style={panelStyle}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',height:'44px',padding:'0 13px',background:'#25272a',border:'1px solid #45494d',borderRadius:'11px',marginBottom:'20px'}}><span style={{color:'#8e959a',fontSize:'18px'}}>⌕</span><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="코인 또는 기능 검색" style={{width:'100%',border:0,outline:0,background:'transparent',color:'#f5f6f7',fontSize:'14px'}}/>{query&&<button onClick={()=>setQuery('')} style={{border:0,background:'transparent',color:'#8e959a',cursor:'pointer'}}>×</button>}</div>
          {filteredLinks.length>0&&<section><div style={sectionTitleStyle}>Common Functions</div><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',marginBottom:'22px'}}>{filteredLinks.map(x=><Link key={x.href} href={x.href} onClick={()=>setSearchOpen(false)} style={{minHeight:'82px',borderRadius:'12px',padding:'12px 10px',background:'#202326',display:'flex',flexDirection:'column',justifyContent:'center',gap:'5px',color:'#f1f3f4'}}><span style={{fontSize:'20px',color:'#b9ff31'}}>{x.icon}</span><b style={{fontSize:'12px'}}>{x.label}</b><small style={{fontSize:'10px',color:'#7f878c'}}>{x.sub}</small></Link>)}</div></section>}
          {filteredMarkets.length>0&&<section><div style={{...sectionTitleStyle,display:'flex',justifyContent:'space-between',alignItems:'center'}}><span>Trending Markets</span><Link href="/#markets" onClick={()=>setSearchOpen(false)} style={{color:'#747c81'}}>›</Link></div><div style={{display:'grid',gap:'2px',marginBottom:'22px'}}>{filteredMarkets.slice(0,5).map((m,i)=><Link href="/cfd" key={m.symbol} onClick={()=>setSearchOpen(false)} style={{display:'grid',gridTemplateColumns:'1fr 110px 82px',alignItems:'center',minHeight:'42px',padding:'0 5px',fontSize:'13px'}}><span><b>{i+1} {m.symbol}</b><em style={{fontStyle:'normal',color:'#697176'}}> / USDT</em> <small style={{color:'#f5a623'}}>🔥</small></span><b style={{textAlign:'right',fontVariantNumeric:'tabular-nums'}}>{Number(m.price).toLocaleString(undefined,{maximumFractionDigits:m.price<1?6:2})}</b><b style={{textAlign:'right',color:m.changePct>=0?'#b9ff31':'#ff5368'}}>{m.changePct>=0?'+':''}{Number(m.changePct).toFixed(2)}%</b></Link>)}</div></section>}
          {filteredTraders.length>0&&<section><div style={{...sectionTitleStyle,display:'flex',justifyContent:'space-between',alignItems:'center'}}><span>Copy Trading</span><Link href="/copy-trading" onClick={()=>setSearchOpen(false)} style={{color:'#747c81'}}>›</Link></div><div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'9px'}}>{filteredTraders.map(t=>{const roi=traderPerf[t.id]?.roi_30d;return <Link key={t.id} href={`/copy-trading/${t.id}`} onClick={()=>setSearchOpen(false)} style={{padding:'12px',borderRadius:'12px',background:'#202326',display:'grid',gap:'7px'}}><div style={{display:'flex',alignItems:'center',gap:'8px'}}><span style={{width:'28px',height:'28px',borderRadius:'50%',display:'grid',placeItems:'center',background:'#2a2e31',fontWeight:800}}>{t.nickname.slice(0,1).toUpperCase()}</span><b style={{fontSize:'12px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.nickname}</b></div><strong style={{fontSize:'18px',color:roi==null?'#9aa1a5':roi>=0?'#b9ff31':'#ff5368'}}>{roi==null?'—':`${roi>=0?'+':''}${Number(roi).toFixed(2)}%`}</strong><small style={{color:'#70787d'}}>30D ROI · {t.risk_level}</small></Link>})}</div></section>}
          {filteredLinks.length===0&&filteredMarkets.length===0&&filteredTraders.length===0&&<div style={{padding:'32px 8px',textAlign:'center',color:'#7e868b',fontSize:'13px'}}>검색 결과가 없습니다.</div>}
        </div>}
      </div>
      {isLoggedIn?<HeaderUserTools/>:<>
        <Link className="loginLink" href="/login" style={{fontSize:'14px',fontWeight:700,color:'#fff',padding:'0 2px',whiteSpace:'nowrap'}}>Log in</Link>
        <Link className="headerBtn" href="/signup" style={{height:'40px',minHeight:'40px',padding:'0 17px',borderRadius:'8px',background:'#f5f5f5',color:'#111',fontSize:'14px',fontWeight:700,display:'inline-flex',alignItems:'center',justifyContent:'center',whiteSpace:'nowrap'}}>Sign up</Link>
        <button className="iconBtn" aria-label="Download app" style={{width:'30px',height:'40px',padding:0,display:'grid',placeItems:'center'}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 19h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" strokeLinejoin="miter"/></svg></button>
        <button className="iconBtn" aria-label="Language" style={{width:'32px',height:'40px',padding:0,display:'grid',placeItems:'center'}}><svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M3.5 12h17M12 3c2.1 2.3 3.2 5.3 3.2 9S14.1 18.7 12 21M12 3C9.9 5.3 8.8 8.3 8.8 12S9.9 18.7 12 21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg></button>
      </>}
    </div>
  </div></header>
}
