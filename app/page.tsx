import Link from 'next/link';
import MarketBoard from '@/components/MarketBoard';

const productCards=[
  {title:'AI Strategy Desk',text:'SAFE · BALANCED · ACTIVE 전략을 한 화면에서 비교하고 DEMO로 바로 시작합니다.',href:'/ai-trading',tag:'AI 자동운용'},
  {title:'Quick Trade',text:'큰 버튼과 금액 프리셋으로 초보자도 빠르게 방향성 거래 UX를 체험합니다.',href:'/quick-trade',tag:'DEMO 전용'},
  {title:'Spot Market',text:'주요 코인 매수/매도 흐름과 시장 데이터 구조를 직관적으로 제공합니다.',href:'/spot',tag:'현물거래'},
  {title:'Asset Center',text:'총자산, 운용중 자산, 손익, 보유 코인을 대시보드 형태로 정리합니다.',href:'/assets',tag:'포트폴리오'}
];

const marketGroups=[
  'BTC · ETH · XRP · SOL 등 주요 디지털자산',
  'USDT 기준 시세와 변동률 요약',
  'DEMO 계좌 기반 전략 테스트',
  '향후 지수/원자재/외환 확장 가능한 구조'
];

const advantages=[
  {title:'DEMO 우선 운영',body:'신규 사용자는 1천만원 DEMO 자산으로 전략과 주문 흐름을 먼저 익힙니다.'},
  {title:'실거래 Feature Flag',body:'규제·보안 검토 전에는 REAL 주문, 출금, 퀵트레이드 실거래를 비활성화합니다.'},
  {title:'Ledger 중심 자산관리',body:'잔액은 화면이 아니라 서버와 ledger 기록을 통해 계산되는 구조를 기본으로 둡니다.'},
  {title:'4050 친화 UX',body:'큰 글자, 명확한 버튼, 복잡도를 낮춘 동선으로 접근 장벽을 낮춥니다.'}
];

export default function Home(){
  return <main>
    <section className="heroShell">
      <div className="wrap heroGrid">
        <div className="heroCopy">
          <div className="eyebrow">DEMO-FIRST DIGITAL ASSET PLATFORM</div>
          <h1>거래소다운 밀도,<br/>처음 써도 쉬운 구조.</h1>
          <p className="lead">BITMATE는 복잡한 기능을 무작정 나열하지 않고, 시장 확인 → 전략 선택 → 주문 체험 → 자산 확인 흐름을 명확하게 설계한 디지털자산 트레이딩 플랫폼입니다.</p>
          <div className="heroActions">
            <Link className="btn" href="/demo">무료 DEMO 시작</Link>
            <Link className="btn secondary" href="/spot">시장 보기</Link>
          </div>
          <div className="trustRow">
            <div className="trustBox"><b>₩10,000,000</b><span>신규 DEMO 자산</span></div>
            <div className="trustBox"><b>3개</b><span>AI 전략 라인업</span></div>
            <div className="trustBox"><b>24/7</b><span>운영/모니터링 구조</span></div>
          </div>
        </div>
        <div className="heroPanel glass">
          <div className="panelHead"><div><div className="panelLabel">계정 요약</div><h3>DEMO Dashboard</h3></div><span className="statusDot">LIVE UI</span></div>
          <div className="summaryValue">₩10,000,000</div>
          <div className="summarySub">신규 가입 시 지급되는 기본 DEMO 자산 예시</div>
          <div className="miniGrid">
            <div className="miniCard"><span>운용 모드</span><b>DEMO</b></div>
            <div className="miniCard"><span>실거래</span><b>기본 OFF</b></div>
            <div className="miniCard"><span>주요 자산</span><b>BTC / ETH</b></div>
            <div className="miniCard"><span>리스크 정책</span><b>서버 제어</b></div>
          </div>
          <div className="actionStrip"><Link href="/ai-trading" className="ghostLink">AI 전략 보기</Link><Link href="/quick-trade" className="ghostLink">Quick Trade 체험</Link></div>
        </div>
      </div>
    </section>
    <MarketBoard/>
    <section className="wrap sectionSpace">
      <div className="sectionHeader"><div><div className="eyebrow">CORE PRODUCTS</div><h2>핵심 기능을 바로 진입하는 구조</h2></div><p className="sectionDesc">랜딩에서 바로 AI·Spot·Quick Trade·Assets로 이동할 수 있도록 거래소형 구조를 적용했습니다.</p></div>
      <div className="featureGrid fourCols">{productCards.map(item=><Link href={item.href} className="featureCard glass" key={item.title}><span className="cardTag">{item.tag}</span><h3>{item.title}</h3><p>{item.text}</p><span className="cardLink">바로가기 →</span></Link>)}</div>
    </section>
    <section className="wrap sectionSpace splitSection">
      <div className="glass splitCard"><div className="eyebrow">WHY BITMATE</div><h2>화려함보다 신뢰와 흐름을 우선합니다.</h2><p className="sectionDesc">거래소형 정보 밀도와 명확한 행동 구조를 참고하되, 문구·레이아웃·브랜드 표현은 독자적으로 구성했습니다.</p><ul className="checkList">{advantages.map(a=><li key={a.title}><b>{a.title}</b><span>{a.body}</span></li>)}</ul></div>
      <div className="glass splitCard"><div className="eyebrow">MARKETS & EXPANSION</div><h2>디지털자산 중심, 멀티마켓 확장 구조</h2><div className="bulletGrid">{marketGroups.map(g=><div className="bulletCard" key={g}>{g}</div>)}</div><div className="riskBox"><b>리스크 고지</b><p>본 프로젝트는 현재 DEMO 중심 MVP입니다. 실제 수익률·승률·자산 보장은 제공하지 않으며, 시장 데이터 공급이 불안정하면 신규 주문을 제한하는 방향으로 설계합니다.</p></div></div>
    </section>
    <section className="wrap sectionSpace"><div className="ctaPanel glass"><div><div className="eyebrow">START WITH PRACTICE</div><h2>실전 전에 DEMO로 먼저 익히세요.</h2><p className="sectionDesc">AI 전략 선택, 빠른 거래, 현물 거래 흐름, 자산 대시보드까지 실제 서비스처럼 익힐 수 있도록 구성했습니다.</p></div><div className="ctaButtons"><Link href="/demo" className="btn">DEMO 시작</Link><Link href="/assets" className="btn secondary">자산 보기</Link></div></div></section>
  </main>
}
