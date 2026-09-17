import MarketBoard from '@/components/MarketBoard';
import HeroArtwork from '@/components/HeroArtwork';
import UiIcon,{type UiIconName} from '@/components/UiIcon';
import {DesktopTradingPreview,MobileAccessPreview} from '@/components/LandingProductPreview';

const promos=[
  {tag:'NEW',title:'Trading Access',copy:'시장 확인부터 주문과 자산 관리까지 하나의 흐름으로 빠르게 이용하세요.',meta:'Markets · Orders · Portfolio'},
  {tag:'AI',title:'Strategy Lab',copy:'전략 성격과 위험 수준을 비교하고 나에게 맞는 운용 흐름을 설계합니다.',meta:'SAFE · BALANCED · ACTIVE'},
  {tag:'MARKET',title:'Major Assets',copy:'BTC, ETH, XRP, SOL, DOGE 등 주요 자산의 실시간 흐름을 한눈에 확인하세요.',meta:'Live market feed'},
];

const products:{icon:UiIconName;title:string;copy:string}[]=[
  {icon:'spot',title:'Spot',copy:'주요 디지털자산을 빠르게 확인하고 간편 주문 흐름으로 연결합니다.'},
  {icon:'margin',title:'CFD Margin',copy:'레버리지, 증거금, 손익과 리스크 상태를 한 화면에서 관리합니다.'},
  {icon:'bot',title:'AI Trading',copy:'전략 선택, 리스크 설정, 로그 확인을 분리한 자동화 운용 경험을 제공합니다.'},
  {icon:'copy',title:'Copy Trading',copy:'트레이더 성과와 위험지표를 확인하고 설정한 한도 안에서 카피 운용을 관리합니다.'},
  {icon:'etf',title:'Crypto ETF',copy:'여러 디지털자산을 정해진 비중으로 구성한 BITMATE INDEX를 제공합니다.'},
  {icon:'mining',title:'Mining',copy:'채굴 상품, 운용 상태, 보상 내역을 하나의 화면에서 관리합니다.'},
];

const stats=[['5','Live market assets'],['5','Core product lines'],['24/7','Market monitoring'],['100%','Server-side controls']];

export default function Home(){
  return <main>
    <section className="xtHero" id="home"><div className="xtShell xtHeroGrid">
      <div className="xtHeroCopy"><div className="xtEyebrow"><span/> DIGITAL ASSET EXPERIENCE</div><h1>Explore markets.<br/>Trade with clarity.</h1><p>BITMATE는 시장 확인부터 주문, 전략, 자산 관리까지 끊김 없이 이어지는 디지털자산 거래 경험을 지향합니다.</p>
      <a href="#campaigns" style={{display:'inline-flex',alignItems:'center',gap:9,marginTop:28,fontSize:15,fontWeight:800,color:'#f5f6f7'}}><span aria-hidden="true" style={{width:28,height:28,borderRadius:8,display:'grid',placeItems:'center',background:'rgba(185,255,49,.08)',color:'#b9ff31'}}><UiIcon name="gift" size={16}/></span><span>신규 사용자는 <b style={{color:'#b9ff31'}}>이벤트를 확인하세요</b></span></a>
      <div style={{display:'flex',maxWidth:570,marginTop:16,border:'1px solid #34393d',borderRadius:18,padding:5,background:'#101315'}}><div style={{flex:1,display:'flex',alignItems:'center',padding:'0 16px',color:'#777f84',fontSize:14}}>전화번호/이메일</div><a href="/signup" style={{minWidth:132,height:48,borderRadius:14,background:'#f5f6f7',color:'#111',display:'inline-flex',alignItems:'center',justifyContent:'center',fontWeight:800}}>회원 가입</a></div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginTop:18}}><a href="/login?provider=google" aria-label="Google 로그인" style={{width:44,height:44,border:'1px solid #34393d',borderRadius:'50%',background:'#111416',display:'grid',placeItems:'center'}}><svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.38Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.39l-3.23-2.51c-.9.6-2.04.95-3.39.95-2.6 0-4.81-1.76-5.6-4.13H3.07v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.92A5.98 5.98 0 0 1 6.08 12c0-.67.12-1.32.32-1.92v-2.6H3.07A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.52l3.33-2.6Z"/><path fill="#EA4335" d="M12 5.95c1.47 0 2.79.51 3.83 1.51l2.87-2.87A9.62 9.62 0 0 0 12 2 10 10 0 0 0 3.07 7.48l3.33 2.6c.79-2.37 3-4.13 5.6-4.13Z"/></svg></a><a href="/login?provider=apple" aria-label="Apple 로그인" style={{width:44,height:44,border:'1px solid #34393d',borderRadius:'50%',background:'#111416',color:'#fff',display:'grid',placeItems:'center'}}><svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.7 12.9c0-2.1 1.7-3.1 1.8-3.2-1-1.5-2.5-1.7-3-1.8-1.3-.1-2.4.8-3 .8-.6 0-1.5-.8-2.6-.7-1.3 0-2.6.8-3.3 2-.8 1.4-.2 3.6.6 4.8.4.6.9 1.3 1.6 1.2.6 0 .9-.4 1.8-.4.8 0 1.1.4 1.8.4.7 0 1.2-.6 1.6-1.2.5-.7.7-1.4.7-1.5 0 0-1.9-.7-1.9-2.4Zm-2.1-6.2c.3-.4.6-1 .5-1.6-.5 0-1.1.4-1.4.8-.3.3-.6.9-.5 1.5.6 0 1.1-.3 1.4-.7Z"/></svg></a><a href="#app" aria-label="앱 다운로드" style={{width:44,height:44,border:'1px solid #34393d',borderRadius:'50%',background:'#111416',color:'#fff',display:'grid',placeItems:'center'}}><UiIcon name="download" size={19}/></a></div>
      <div className="trustChips"><span><UiIcon name="verification" size={14}/> 실시간 시세</span><span><UiIcon name="security" size={14}/> 서버 기준 잔액 처리</span><span><UiIcon name="insurance" size={14}/> 보안 중심 설계</span></div></div>
      <HeroArtwork/>
    </div></section>

    <section className="noticeStrip"><div className="xtShell"><b style={{display:'inline-grid',placeItems:'center'}}><UiIcon name="market" size={14}/></b><span>BITMATE market systems online</span><span className="noticeSep">•</span><span>Market data and risk controls are monitored continuously</span><a href="#markets" style={{display:'inline-flex',alignItems:'center',gap:6}}>View markets <UiIcon name="chevronRight" size={13}/></a></div></section>

    <section className="promoSection" id="campaigns"><div className="xtShell promoGrid">{promos.map(p=><article key={p.title}><span>{p.tag}</span><h3>{p.title}</h3><p>{p.copy}</p><small>{p.meta}</small><i style={{display:'grid',placeItems:'center'}}><UiIcon name="external" size={16}/></i></article>)}</div></section>

    <MarketBoard/>

    <section className="productSection" id="trade"><div className="xtShell"><div className="sectionTitle"><span>PRODUCTS</span><h2>Trade your way</h2><p>시장 확인, 거래, 자동화, 자산 관리를 하나의 플랫폼 경험으로 구성합니다.</p></div><div className="productGrid">{products.map(p=><article key={p.title}><div className="productIcon"><UiIcon name={p.icon} size={23}/></div><div><h3>{p.title}</h3><p>{p.copy}</p></div><span className="arrowLink" style={{display:'grid',placeItems:'center'}}><UiIcon name="chevronRight" size={16}/></span></article>)}</div></div></section>

    <section className="featureBand" id="tools"><div className="xtShell featureBandGrid"><div className="featureCopy"><span className="sectionLabel">ADVANCED TOOLS</span><h2>One screen.<br/>More control.</h2><p>차트, 주문, 포지션, 자산 정보가 서로 떨어지지 않도록 하나의 트레이딩 워크스페이스처럼 설계합니다.</p><ul><li>Live price monitoring</li><li>Order & risk controls</li><li>Position & asset visibility</li><li>AI strategy status</li></ul><a className="limeBtn compact" href="/futures">Explore platform</a></div><DesktopTradingPreview/></div></section>

    <section className="statsSection"><div className="xtShell statsGrid">{stats.map(([n,l])=><div key={l}><strong>{n}</strong><span>{l}</span></div>)}</div></section>

    <section className="appSection" id="app"><div className="xtShell appGrid"><MobileAccessPreview/><div className="appCopy"><span className="sectionLabel">TRADE ANYWHERE</span><h2>Keep the market close.</h2><p>모바일에서도 시장, 포지션, 자산, 전략 상태를 빠르게 확인하고 필요한 기능으로 바로 이동할 수 있도록 구성합니다.</p><div className="storeRow"><a href="/markets">Open Web App</a><a href="/futures">Open Trading</a></div><small>별도 앱 설치 없이 모바일 브라우저에서 BITMATE를 이용할 수 있습니다.</small></div></div></section>

    <section className="safetySection" id="finance"><div className="xtShell safetyGrid"><div><span className="sectionLabel">TRUST & CONTROL</span><h2>Built around transparency.</h2></div><div className="safetyCards"><article><b>01</b><h3>Account segregation</h3><p>상품별 운용금, 사용 가능 잔액, 주문 상태를 분리해 관리합니다.</p></article><article><b>02</b><h3>Server-side ledger</h3><p>잔액 변경은 프론트 화면이 아니라 서버와 ledger 기록을 기준으로 처리합니다.</p></article><article><b>03</b><h3>Risk controls</h3><p>주문, 포지션, 출금 등 주요 기능은 권한과 상태 검증을 거쳐 처리합니다.</p></article></div></div></section>
  </main>
}
