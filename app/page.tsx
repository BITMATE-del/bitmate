import MarketBoard from '@/components/MarketBoard';
import HeroArtwork from '@/components/HeroArtwork';

const promos=[
  {tag:'NEW',title:'Trading Access',copy:'시장 확인부터 주문과 자산 관리까지 하나의 흐름으로 빠르게 이용하세요.',meta:'Markets · Orders · Portfolio'},
  {tag:'AI',title:'Strategy Lab',copy:'전략 성격과 위험 수준을 비교하고 나에게 맞는 운용 흐름을 설계합니다.',meta:'SAFE · BALANCED · ACTIVE'},
  {tag:'MARKET',title:'Major Assets',copy:'BTC, ETH, XRP, SOL, DOGE 등 주요 자산의 실시간 흐름을 한눈에 확인하세요.',meta:'Live market feed'},
];

const products=[
  {icon:'↗',title:'Spot',copy:'주요 디지털자산을 빠르게 확인하고 간편 주문 흐름으로 연결합니다.'},
  {icon:'∞',title:'CFD Margin',copy:'레버리지, 증거금, 손익과 리스크 상태를 한 화면에서 관리합니다.'},
  {icon:'◎',title:'AI Trading',copy:'전략 선택, 리스크 설정, 로그 확인을 분리한 자동화 운용 경험을 제공합니다.'},
  {icon:'⚡',title:'Copy Trading',copy:'트레이더 성과와 위험지표를 확인하고 설정한 한도 안에서 카피 운용을 관리합니다.'},
  {icon:'◈',title:'Crypto ETF',copy:'여러 디지털자산을 정해진 비중으로 구성한 BITMATE INDEX를 제공합니다.'},
  {icon:'◆',title:'Mining',copy:'채굴 상품, 운용 상태, 보상 내역을 하나의 화면에서 관리합니다.'},
];

const stats=[['5','Live market assets'],['5','Core product lines'],['24/7','Market monitoring'],['100%','Server-side controls']];

export default function Home(){
  return <main>
    <section className="xtHero" id="home"><div className="xtShell xtHeroGrid">
      <div className="xtHeroCopy"><div className="xtEyebrow"><span/> DIGITAL ASSET EXPERIENCE</div><h1>Explore markets.<br/>Trade with clarity.</h1><p>BITMATE는 시장 확인부터 주문, 전략, 자산 관리까지 끊김 없이 이어지는 디지털자산 거래 경험을 지향합니다.</p>
      <div style={{marginTop:28,fontSize:15,fontWeight:800,color:'#f5f6f7'}}>🎁 신규 사용자 전용 <b style={{color:'#b9ff31'}}>$8,888</b> 보너스!</div>
      <div style={{display:'flex',maxWidth:570,marginTop:16,border:'1px solid #34393d',borderRadius:18,padding:5,background:'#101315'}}><div style={{flex:1,display:'flex',alignItems:'center',padding:'0 16px',color:'#777f84',fontSize:14}}>전화번호/이메일</div><a href="/signup" style={{minWidth:132,height:48,borderRadius:14,background:'#f5f6f7',color:'#111',display:'inline-flex',alignItems:'center',justifyContent:'center',fontWeight:800}}>회원 가입</a></div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginTop:18}}><button aria-label="Google" style={{width:44,height:44,border:'1px solid #34393d',borderRadius:'50%',background:'#111416',color:'#fff',fontWeight:800}}>G</button><button aria-label="Apple" style={{width:44,height:44,border:'1px solid #34393d',borderRadius:'50%',background:'#111416',color:'#fff',fontSize:18}}>●</button><a href="#app" aria-label="App download" style={{width:44,height:44,border:'1px solid #34393d',borderRadius:'50%',background:'#111416',color:'#fff',display:'grid',placeItems:'center',fontSize:18}}>↓</a></div>
      <div className="trustChips"><span>✓ 실시간 시세</span><span>✓ 서버 기준 잔액 처리</span><span>✓ 보안 중심 설계</span></div></div>
      <HeroArtwork/>
    </div></section>

    <section className="noticeStrip"><div className="xtShell"><b>●</b><span>BITMATE market systems online</span><span className="noticeSep">•</span><span>Market data and risk controls are monitored continuously</span><a href="#markets">View markets →</a></div></section>

    <section className="promoSection" id="campaigns"><div className="xtShell promoGrid">{promos.map(p=><article key={p.title}><span>{p.tag}</span><h3>{p.title}</h3><p>{p.copy}</p><small>{p.meta}</small><i>↗</i></article>)}</div></section>

    <MarketBoard/>

    <section className="productSection" id="trade"><div className="xtShell"><div className="sectionTitle"><span>PRODUCTS</span><h2>Trade your way</h2><p>시장 확인, 거래, 자동화, 자산 관리를 하나의 플랫폼 경험으로 구성합니다.</p></div><div className="productGrid">{products.map(p=><article key={p.title}><div className="productIcon">{p.icon}</div><div><h3>{p.title}</h3><p>{p.copy}</p></div><span className="arrowLink">→</span></article>)}</div></div></section>

    <section className="featureBand" id="tools"><div className="xtShell featureBandGrid"><div className="featureCopy"><span className="sectionLabel">ADVANCED TOOLS</span><h2>One screen.<br/>More control.</h2><p>차트, 주문, 포지션, 자산 정보가 서로 떨어지지 않도록 하나의 트레이딩 워크스페이스처럼 설계합니다.</p><ul><li>Live price monitoring</li><li>Order & risk controls</li><li>Portfolio overview</li><li>AI strategy status</li></ul><a className="limeBtn compact" href="#app">Explore platform</a></div><div className="workspaceMock"><div className="workspaceTop"><span>BTC/USDT</span><span>Market</span><span>Order book</span><span>Positions</span></div><div className="workspaceBody"><div className="workspaceChart"><div className="chartLabel"><b>77,259.40</b><span>-0.02%</span></div><svg viewBox="0 0 600 220" preserveAspectRatio="none"><polyline points="0,170 40,160 80,166 120,139 160,145 200,117 240,126 280,92 320,104 360,80 400,87 440,54 480,67 520,42 560,50 600,25" fill="none" stroke="currentColor" strokeWidth="3"/></svg></div><div className="workspaceOrder"><b>Place order</b><label>Amount</label><div>₩ 300,000</div><label>Mode</label><div>Market</div><button>Buy BTC</button></div></div></div></div></section>

    <section className="statsSection"><div className="xtShell statsGrid">{stats.map(([n,l])=><div key={l}><strong>{n}</strong><span>{l}</span></div>)}</div></section>

    <section className="appSection" id="app"><div className="xtShell appGrid"><div className="appVisual"><div className="phone"><div className="phoneTop">BITMATE</div><div className="phoneBalance"><span>Total assets</span><b>₩10,000,000</b></div><div className="phoneRows">{['BTC','ETH','SOL','XRP'].map((x,i)=><div key={x}><span>{x}</span><b>{['77,259','2,499','100.49','1.36'][i]}</b></div>)}</div></div><div className="qrMock">▦<small>Scan to open</small></div></div><div className="appCopy"><span className="sectionLabel">TRADE ANYWHERE</span><h2>Keep the market close.</h2><p>모바일에서도 시장 확인, 주문 상태, 전략 상태, 자산 현황을 빠르게 확인할 수 있는 구조를 지향합니다.</p><div className="storeRow"><span>● App Store</span><span>▶ Google Play</span></div><small>모바일 앱은 향후 제공 예정입니다.</small></div></div></section>

    <section className="safetySection" id="finance"><div className="xtShell safetyGrid"><div><span className="sectionLabel">TRUST & CONTROL</span><h2>Built around transparency.</h2></div><div className="safetyCards"><article><b>01</b><h3>Account segregation</h3><p>상품별 운용금, 사용 가능 잔액, 주문 상태를 분리해 관리합니다.</p></article><article><b>02</b><h3>Server-side ledger</h3><p>잔액 변경은 프론트 화면이 아니라 서버와 ledger 기록을 기준으로 처리합니다.</p></article><article><b>03</b><h3>Risk controls</h3><p>주문, 포지션, 출금 등 주요 기능은 권한과 상태 검증을 거쳐 처리합니다.</p></article></div></div></section>
  </main>
}
