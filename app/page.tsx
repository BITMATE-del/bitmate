const marketCards = [
  {kicker:'Crypto', title:'Spot markets', body:'BTC, ETH, SOL, XRP 등 주요 디지털자산을 한 화면에서 확인하는 시장 구조.'},
  {kicker:'Automation', title:'AI-assisted workflows', body:'전략 선택과 위험 설정을 분리해 설계하는 자동화 거래 워크플로우.'},
  {kicker:'Practice', title:'Demo environment', body:'실제 자산과 분리된 연습 환경에서 주문과 리스크 관리 흐름을 익히는 구조.'},
  {kicker:'Portfolio', title:'Unified account view', body:'잔액, 거래 내역, 손익, 전략 상태를 한 계정에서 확인하도록 설계.'},
];

const controls = [
  {eyebrow:'ORDER MANAGEMENT', title:'주문 동작을 더 세밀하게 제어', body:'시장가·지정가·손절·익절·일괄 종료 같은 주문 제어 흐름을 한 곳에 모으는 구조입니다.', side:'left'},
  {eyebrow:'TRANSPARENT MARKET VIEW', title:'호가와 체결 흐름을 한눈에', body:'활성 매수·매도 호가와 최근 체결을 분리해 보여주고, 빠르게 판단할 수 있는 밀도를 지향합니다.', side:'right'},
  {eyebrow:'ADVANCED CHARTING', title:'차트 중심의 분석 환경', body:'차트, 지표, 주문 패널을 서로 떨어뜨리지 않고 하나의 작업 공간처럼 느껴지도록 설계합니다.', side:'left'},
  {eyebrow:'RISK CONTROL', title:'포지션과 위험 한도를 계정 단위로 관리', body:'포지션 규모, 전략 할당액, 손실 제한을 분리해 보여주고 실제 자산 변경은 서버에서만 처리하는 방향입니다.', side:'right'},
];

const faqs = [
  ['BITMATE는 어떤 플랫폼인가요?','디지털자산 시장 확인, 주문, 전략 운용, 자산 관리를 하나의 환경으로 통합하는 것을 목표로 하는 트레이딩 플랫폼입니다.'],
  ['초보자도 사용할 수 있나요?','기능 밀도는 유지하되 주문과 자산 흐름은 단순하게 이해할 수 있도록 설계합니다.'],
  ['DEMO 계정이 있나요?','현재 개발 단계에서는 실제 자산과 분리된 DEMO 환경을 우선 적용하는 방향입니다.'],
  ['실거래 기능은 바로 켜지나요?','아닙니다. 실거래·출금 등은 보안, 운영, 법률 검토가 완료된 뒤 별도 활성화하는 구조입니다.'],
];

function TerminalMock(){
  return <div className="terminalMock">
    <div className="terminalTop"><span>BITMATE Terminal</span><span className="liveTag">DEMO</span></div>
    <div className="terminalTabs"><b>BTC / USDT</b><span>Chart</span><span>Order book</span><span>Positions</span></div>
    <div className="terminalBody">
      <div className="chartPane">
        <div className="chartHeader"><span>BTCUSDT</span><b>77,259.40</b><em>-0.02%</em></div>
        <div className="fakeChart"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div>
        <div className="chartAxis"><span>09:00</span><span>12:00</span><span>15:00</span><span>18:00</span></div>
      </div>
      <div className="orderPane">
        <div className="orderTabs"><b>Order</b><span>Market</span><span>Limit</span></div>
        <label>Amount</label>
        <div className="inputMock">₩ 300,000</div>
        <label>Risk preset</label>
        <div className="choiceRow"><span>Low</span><span className="active">Balanced</span><span>High</span></div>
        <button>Place demo order</button>
      </div>
    </div>
    <div className="terminalBottom"><span>Open orders 0</span><span>Positions 0</span><span>Available ₩10,000,000</span></div>
  </div>
}

function MiniBook(){
  return <div className="miniBook">
    <div className="bookHead"><span>Price</span><span>Amount</span></div>
    {[4,3,2,1].map(n=><div className="ask" key={`a${n}`}><span>77,26{n}.2</span><span>{(n*0.17).toFixed(2)}</span></div>)}
    <strong>77,259.4</strong>
    {[1,2,3,4].map(n=><div className="bid" key={`b${n}`}><span>77,25{9-n}.8</span><span>{(n*0.21).toFixed(2)}</span></div>)}
  </div>
}

export default function Home(){
  return <main>
    <section className="hero">
      <div className="shell heroGrid">
        <div className="heroCopy">
          <div className="eyebrow">BITMATE TRADING PLATFORM</div>
          <h1>하나의 플랫폼에서<br/>시장과 거래를 연결하세요.</h1>
          <p>디지털자산 시장 확인부터 주문, 전략, 리스크 관리까지 한 작업 공간에서 이어지는 경험을 목표로 합니다.</p>
          <div className="heroActions"><a className="primary" href="#platform">플랫폼 보기</a><a className="secondary" href="#demo">DEMO 살펴보기</a></div>
          <small>디지털자산 거래에는 원금 손실 위험이 있습니다.</small>
        </div>
        <div className="heroVisual"><TerminalMock/></div>
      </div>
    </section>

    <section className="section" id="platform">
      <div className="shell splitIntro">
        <div className="sectionCopy">
          <div className="eyebrow">POWERFUL PLATFORM</div>
          <h2>초보자에게는 직관적으로,<br/>숙련자에게는 충분히 깊게.</h2>
          <p>화면을 기능별 페이지로 흩뜨리지 않고, 실제 거래 작업 흐름에 맞춰 차트·주문·호가·포지션·자산 정보를 연결합니다.</p>
          <ul className="featureList">
            <li>시장가·지정가·손절·익절 주문 구조</li>
            <li>실시간 시세와 호가 중심 화면</li>
            <li>전략과 리스크 설정의 분리</li>
            <li>DEMO와 REAL 계정의 명확한 구분</li>
            <li>잔액 변경은 서버/ledger 기반으로 처리</li>
          </ul>
          <a className="primary small" href="#markets">시장 구성 보기</a>
        </div>
        <div className="visualPanel"><TerminalMock/></div>
      </div>
    </section>

    <section className="section markets" id="markets">
      <div className="shell">
        <div className="sectionHead"><div><div className="eyebrow">MARKETS & WORKFLOWS</div><h2>거래에 필요한 핵심 흐름을 한곳에</h2></div><span>DEMO-first architecture</span></div>
        <div className="marketGrid">{marketCards.map(card=><article key={card.title}><small>{card.kicker}</small><h3>{card.title}</h3><p>{card.body}</p><span>Explore →</span></article>)}</div>
      </div>
    </section>

    <section className="section controls">
      <div className="shell">
        <div className="centerHead"><div className="eyebrow">FULL CONTROL</div><h2>거래의 모든 중요한 조작을<br/>명확한 구조로</h2><p>필요한 기능을 한눈에 찾고, 중요한 정보는 더 가까이 배치합니다.</p></div>
        <div className="controlStack">
          {controls.map((item,idx)=><div className={`controlRow ${item.side}`} key={item.title}>
            <div className="controlText"><div className="eyebrow">{item.eyebrow}</div><h3>{item.title}</h3><p>{item.body}</p><a href="#demo">DEMO 환경에서 보기 →</a></div>
            <div className="controlVisual">{idx===1?<MiniBook/>:<TerminalMock/>}</div>
          </div>)}
        </div>
      </div>
    </section>

    <section className="section demo" id="demo">
      <div className="shell demoGrid">
        <div><div className="eyebrow">PRACTICE FIRST</div><h2>실거래 전에 DEMO 환경으로 익히세요.</h2><p>실제 자산과 분리된 환경에서 주문 방식, 위험 설정, 포지션 관리 흐름을 먼저 익히는 것을 기본 원칙으로 둡니다.</p><ul className="featureList"><li>입금 없이 바로 시작하는 연습 환경</li><li>실제 시장 UI와 동일한 흐름</li><li>초보 학습과 전략 테스트에 적합</li></ul><a className="primary" href="#top">Get started</a></div>
        <div className="demoCard"><span>DEMO ACCOUNT</span><strong>₩10,000,000</strong><p>Practice balance</p><div className="demoStats"><div><small>Mode</small><b>DEMO</b></div><div><small>Real funds</small><b>OFF</b></div></div></div>
      </div>
    </section>

    <section className="section faq" id="faq">
      <div className="shell faqGrid"><div><div className="eyebrow">FAQ</div><h2>자주 묻는 질문</h2></div><div className="faqList">{faqs.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></div>
    </section>

    <section className="finalCta"><div className="shell"><h2>새로운 BITMATE 플랫폼의<br/>기본 베이스를 여기서 시작합니다.</h2><p>이후 실제 거래 기능은 이 디자인 시스템 위에 단계적으로 다시 구현합니다.</p><a className="primary" href="#top">플랫폼 둘러보기</a></div></section>
  </main>
}
