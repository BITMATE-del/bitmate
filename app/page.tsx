import MarketBoard from '@/components/MarketBoard';

const promos=[
  {tag:'NEW',title:'DEMO Trading Week',copy:'첫 거래 흐름부터 자산 확인까지 연습 환경에서 빠르게 익혀보세요.',meta:'Practice · No deposit'},
  {tag:'AI',title:'Strategy Lab',copy:'전략 성격과 위험 수준을 비교하고 나에게 맞는 운용 흐름을 설계합니다.',meta:'SAFE · BALANCED · ACTIVE'},
  {tag:'MARKET',title:'Major Assets',copy:'BTC, ETH, XRP, SOL, DOGE 등 주요 자산의 실시간 흐름을 한눈에 확인하세요.',meta:'Live market feed'},
];

const products=[
  {icon:'↗',title:'Spot',copy:'주요 디지털자산을 빠르게 확인하고 간편 주문 흐름으로 연결합니다.'},
  {icon:'∞',title:'Futures-ready',copy:'향후 파생상품 확장을 고려한 시장·포지션 중심 인터페이스 구조입니다.'},
  {icon:'◎',title:'AI Trading',copy:'전략 선택, 리스크 설정, 로그 확인을 분리한 자동화 운용 경험을 제공합니다.'},
  {icon:'⚡',title:'Quick Trade',copy:'금액 프리셋과 단순한 액션 중심으로 빠른 체험이 가능한 거래 UX입니다.'},
  {icon:'◈',title:'Asset Center',copy:'잔액, 손익, 전략 할당액, 최근 활동을 하나의 자산 화면에서 확인합니다.'},
  {icon:'◆',title:'Demo Mode',copy:'실제 자산과 완전히 분리된 연습 환경에서 거래 흐름을 익힙니다.'},
];

const stats=[['5','Live market assets'],['3','AI strategy profiles'],['24/7','Market monitoring'],['100%','Demo-first onboarding']];

export default function Home(){
  return <main>
    <section className="xtHero" id="home"><div className="xtShell xtHeroGrid">
      <div className="xtHeroCopy"><div className="xtEyebrow"><span/> DIGITAL ASSET EXPERIENCE</div><h1>Explore markets.<br/>Trade with clarity.</h1><p>BITMATE는 시장 확인부터 주문, 전략, 자산 관리까지 끊김 없이 이어지는 디지털자산 거래 경험을 지향합니다.</p><div className="signupBar"><div className="signupField"><span>이메일 또는 휴대폰</span></div><a className="limeBtn" href="#markets">Get Started</a></div><div className="altRow"><span>또는</span><button aria-label="Google">G</button><button aria-label="Apple">●</button><a href="#app">App Download</a></div><div className="trustChips"><span>✓ DEMO 우선</span><span>✓ 실시간 시세</span><span>✓ 보안 중심 설계</span></div></div>
      <div className="heroArt" aria-hidden="true"><div className="orbit orbitOne"/><div className="orbit orbitTwo"/><div className="deviceCard deviceMain"><div className="deviceTop"><span>BTC/USDT</span><b>DEMO</b></div><div className="devicePrice">77,259.40</div><div className="deviceChange">-0.02%</div><div className="microChart">{[34,42,31,48,57,44,62,66,58,73,70,82,77,90].map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div><div className="deviceActions"><span>Buy</span><span>Sell</span></div></div><div className="coin coinA">₿</div><div className="coin coinB">Ξ</div><div className="coin coinC">S</div><div className="floatBadge badgeA"><span>Portfolio</span><b>₩10,000,000</b></div><div className="floatBadge badgeB"><span>Mode</span><b>DEMO</b></div></div>
    </div></section>

    <section className="noticeStrip"><div className="xtShell"><b>●</b><span>BITMATE DEMO market environment is live</span><span className="noticeSep">•</span><span>Real-money features remain disabled by default</span><a href="#markets">View markets →</a></div></section>

    <section className="promoSection" id="campaigns"><div className="xtShell promoGrid">{promos.map(p=><article key={p.title}><span>{p.tag}</span><h3>{p.title}</h3><p>{p.copy}</p><small>{p.meta}</small><i>↗</i></article>)}</div></section>

    <MarketBoard/>

    <section className="productSection" id="trade"><div className="xtShell"><div className="sectionTitle"><span>PRODUCTS</span><h2>Trade your way</h2><p>시장 확인, 거래, 자동화, 자산 관리를 하나의 플랫폼 경험으로 구성합니다.</p></div><div className="productGrid">{products.map(p=><article key={p.title}><div className="productIcon">{p.icon}</div><div><h3>{p.title}</h3><p>{p.copy}</p></div><span className="arrowLink">→</span></article>)}</div></div></section>

    <section className="featureBand" id="tools"><div className="xtShell featureBandGrid"><div className="featureCopy"><span className="sectionLabel">ADVANCED TOOLS</span><h2>One screen.<br/>More control.</h2><p>차트, 주문, 포지션, 자산 정보가 서로 떨어지지 않도록 하나의 트레이딩 워크스페이스처럼 설계합니다.</p><ul><li>Live price monitoring</li><li>Order & risk controls</li><li>Portfolio overview</li><li>AI strategy status</li></ul><a className="limeBtn compact" href="#app">Explore platform</a></div><div className="workspaceMock"><div className="workspaceTop"><span>BTC/USDT</span><span>Market</span><span>Order book</span><span>Positions</span></div><div className="workspaceBody"><div className="workspaceChart"><div className="chartLabel"><b>77,259.40</b><span>-0.02%</span></div><svg viewBox="0 0 600 220" preserveAspectRatio="none"><polyline points="0,170 40,160 80,166 120,139 160,145 200,117 240,126 280,92 320,104 360,80 400,87 440,54 480,67 520,42 560,50 600,25" fill="none" stroke="currentColor" strokeWidth="3"/></svg></div><div className="workspaceOrder"><b>Place order</b><label>Amount</label><div>₩ 300,000</div><label>Mode</label><div>DEMO</div><button>Buy BTC</button></div></div></div></div></section>

    <section className="statsSection"><div className="xtShell statsGrid">{stats.map(([n,l])=><div key={l}><strong>{n}</strong><span>{l}</span></div>)}</div></section>

    <section className="appSection" id="app"><div className="xtShell appGrid"><div className="appVisual"><div className="phone"><div className="phoneTop">BITMATE</div><div className="phoneBalance"><span>Total assets</span><b>₩10,000,000</b></div><div className="phoneRows">{['BTC','ETH','SOL','XRP'].map((x,i)=><div key={x}><span>{x}</span><b>{['77,259','2,499','100.49','1.36'][i]}</b></div>)}</div></div><div className="qrMock">▦<small>Scan to open</small></div></div><div className="appCopy"><span className="sectionLabel">TRADE ANYWHERE</span><h2>Keep the market close.</h2><p>모바일에서도 시장 확인, DEMO 거래, 전략 상태, 자산 현황을 빠르게 확인할 수 있는 구조를 지향합니다.</p><div className="storeRow"><span>● App Store</span><span>▶ Google Play</span></div><small>모바일 앱은 향후 제공 예정입니다.</small></div></div></section>

    <section className="safetySection" id="finance"><div className="xtShell safetyGrid"><div><span className="sectionLabel">TRUST & CONTROL</span><h2>Built around transparency.</h2></div><div className="safetyCards"><article><b>01</b><h3>Demo separation</h3><p>DEMO와 실제 자산을 데이터·잔액·주문 흐름에서 분리합니다.</p></article><article><b>02</b><h3>Server-side ledger</h3><p>잔액 변경은 프론트 화면이 아니라 서버와 ledger 기록을 기준으로 처리합니다.</p></article><article><b>03</b><h3>Feature flags</h3><p>실거래·출금 등 민감 기능은 운영 검토 전 기본 비활성화합니다.</p></article></div></div></section>
  </main>
}
