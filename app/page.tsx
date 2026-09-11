import Link from 'next/link';
import MarketBoard from '@/components/MarketBoard';

const strategies=[
  {name:'SAFE',label:'안정형',risk:'낮음',desc:'변동성 필터와 분할 운용 중심',assets:'BTC · ETH'},
  {name:'BALANCED',label:'균형형',risk:'보통',desc:'추세·DCA·모멘텀 조합',assets:'BTC · ETH · XRP · SOL'},
  {name:'ACTIVE',label:'적극형',risk:'높음',desc:'단기 추세와 높은 거래 빈도',assets:'주요 코인'}
];

export default function Home(){return <main>
  <section className="hero-shell"><div className="page-shell hero-grid">
    <div className="hero-copy"><span className="eyebrow">AI-POWERED DIGITAL ASSET PLATFORM</span><h1>복잡한 거래는 줄이고,<br/>판단은 더 선명하게.</h1><p>실시간 시장 데이터, 현물 거래, AI 전략 운용을 하나의 계정에서. 처음 쓰는 사람도 이해하기 쉬운 구조로 설계했습니다.</p><div className="hero-actions"><Link className="primary-btn" href="/demo">10,000,000원 DEMO 시작</Link><Link className="ghost-btn" href="/spot">시장 둘러보기</Link></div><div className="trust-row"><span>실거래 기능 기본 OFF</span><span>DEMO/REAL 분리</span><span>가짜 수익률 미표시</span></div></div>
    <div className="hero-terminal"><div className="terminal-top"><span>BITMATE OVERVIEW</span><span className="live-chip"><span className="status-dot"/> LIVE</span></div><div className="balance-panel"><span>DEMO 총 자산</span><strong>₩10,000,000</strong><small>실제 자산과 완전히 분리된 모의 자산입니다.</small></div><div className="quick-actions"><Link href="/spot"><span>현물 거래</span><strong>Spot</strong></Link><Link href="/ai-trading"><span>전략 운용</span><strong>AI Trading</strong></Link><Link href="/quick-trade"><span>간편 체험</span><strong>Quick Trade</strong></Link></div><div className="terminal-footer"><span>REAL 거래</span><strong>비활성화</strong></div></div>
  </div></section>

  <div className="page-shell"><MarketBoard/>

  <section className="feature-grid section-block"><Link href="/spot" className="feature-panel feature-large"><div><span className="eyebrow">SPOT</span><h2>한눈에 보고,<br/>바로 거래하세요.</h2><p>간편 주문부터 전문 거래 화면까지 확장 가능한 현물 거래 경험.</p></div><div className="mini-orderbook"><div><span>가격(USDT)</span><span>수량</span></div><p className="ask"><span>112,482.6</span><span>0.128</span></p><p className="ask"><span>112,476.1</span><span>0.083</span></p><strong>112,470.4</strong><p className="bid"><span>112,463.8</span><span>0.214</span></p><p className="bid"><span>112,458.2</span><span>0.162</span></p></div></Link>
    <Link href="/quick-trade" className="feature-panel"><span className="eyebrow">QUICK TRADE</span><h3>3번의 탭으로<br/>DEMO 거래</h3><p>금액 선택 → 방향 선택 → 결과 확인.</p><div className="direction-row"><span className="up-box">↑ 상승</span><span className="down-box">↓ 하락</span></div></Link>
  </section>

  <section className="section-block"><div className="section-head"><div><span className="eyebrow">AI STRATEGIES</span><h2>위험 성향에 맞춰 선택</h2></div><Link href="/ai-trading" className="text-link">전체 전략 보기 →</Link></div><div className="strategy-grid">{strategies.map((s,i)=><Link href="/ai-trading" className="strategy-card" key={s.name}><div className="strategy-top"><span className={`risk-dot risk-${i}`}/><span>위험도 {s.risk}</span></div><h3>{s.name}</h3><strong>{s.label}</strong><p>{s.desc}</p><div className="strategy-foot"><span>{s.assets}</span><span>DEMO →</span></div></Link>)}</div></section>

  <section className="asset-summary section-block"><div><span className="eyebrow">ONE ACCOUNT</span><h2>거래와 자산을 한 곳에서</h2><p>Spot, Quick Trade, AI Trading의 기록과 자산 흐름을 하나의 계정에서 관리하는 구조입니다.</p></div><div className="asset-kpis"><div><span>DEMO 잔액</span><strong>₩10.0M</strong></div><div><span>운용 전략</span><strong>0</strong></div><div><span>실거래 기능</span><strong>OFF</strong></div></div></section>

  <section className="bottom-cta section-block"><div><span className="eyebrow">START WITH ZERO RISK</span><h2>실제 돈 없이 먼저 익혀보세요.</h2></div><Link className="primary-btn" href="/demo">무료 DEMO 시작</Link></section>
  </div>
</main>}
