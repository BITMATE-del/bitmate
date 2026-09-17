import Link from 'next/link';

const tracks=[
 ['처음 시작하기','회원가입, 보안설정, 입출금, 지갑 구조','4 lessons','초급'],
 ['Futures','Long/Short, Mark Price, Funding, Cross/Isolated, TP/SL','8 lessons','초급 → 중급'],
 ['CFD Margin','UP/DOWN 구조, 거래시간, 지급구조, 정산방식','6 lessons','초급'],
 ['AI Trading','전략 선택, 위험설정, 세션, PnL 확인','7 lessons','중급'],
 ['Copy Trading','트레이더 선택, 리스크, 카피금액, 종료','6 lessons','초급 → 중급'],
 ['Mining','Mining Power, 보상, Boost, History','5 lessons','초급'],
 ['보안','2FA, 피싱 방지, 출금보안, 계정 보호','5 lessons','필수'],
 ['Crypto Loan','담보, LTV, 이자, 마진콜, 청산','6 lessons','중급'],
];
const popular=[
 ['Futures에서 Mark Price가 중요한 이유','5 min'],['Cross와 Isolated 차이','6 min'],['TP/SL 주문을 안전하게 사용하는 법','7 min'],['입금 네트워크를 잘못 선택하면 어떻게 되나요?','4 min'],['Copy Trading에서 ROI만 보면 안 되는 이유','8 min'],['LTV와 청산가격 이해하기','6 min']
];
export default function AcademyPage(){return <main style={{minHeight:'calc(100vh - 72px)',background:'#08090a',color:'#f4f6f7',padding:'44px 0 90px'}}><div className="xtShell">
 <section style={{display:'grid',gridTemplateColumns:'1.05fr .95fr',gap:28,alignItems:'center',padding:'28px 0 44px'}}>
  <div><span style={{fontSize:11,color:'#b9ff31',fontWeight:900,letterSpacing:'.14em'}}>BITMATE ACADEMY</span><h1 style={{fontSize:'clamp(42px,6vw,72px)',letterSpacing:'-.055em',lineHeight:1.02,margin:'12px 0 18px'}}>Learn before<br/>you trade.</h1><p style={{maxWidth:720,color:'#90989d',fontSize:16,lineHeight:1.75}}>BITMATE 기능과 거래 구조를 초보자도 단계적으로 이해할 수 있도록 구성한 학습 허브입니다. 기능 설명, 리스크, 주문 구조, 보안까지 한 번에 확인하세요.</p><div style={{display:'flex',gap:10,marginTop:24,flexWrap:'wrap'}}><Link href="#tracks" style={{height:44,padding:'0 18px',borderRadius:8,background:'#b9ff31',color:'#0e1209',fontWeight:900,display:'inline-flex',alignItems:'center'}}>학습 시작</Link><Link href="/more/notice" style={{height:44,padding:'0 18px',borderRadius:8,border:'1px solid #34393d',display:'inline-flex',alignItems:'center',fontWeight:800}}>공지센터</Link></div></div>
  <div style={{border:'1px solid #2b3033',borderRadius:18,background:'linear-gradient(145deg,#171a1c,#0d0f10)',padding:24,minHeight:260,display:'grid',alignContent:'center',gap:12}}><small style={{color:'#757e83',fontWeight:900,letterSpacing:'.12em'}}>RECOMMENDED PATH</small>{[['01','계정·보안'],['02','입출금'],['03','거래 기본'],['04','상품별 리스크'],['05','실전 기능']].map(([n,t])=><div key={n} style={{display:'grid',gridTemplateColumns:'44px 1fr',alignItems:'center',padding:'11px 12px',border:'1px solid #24282b',background:'#121416',borderRadius:10}}><b style={{color:'#b9ff31',fontSize:12}}>{n}</b><span style={{fontWeight:800}}>{t}</span></div>)}</div>
 </section>
 <section id="tracks"><div style={{display:'flex',justifyContent:'space-between',alignItems:'end',marginBottom:18}}><div><small style={{color:'#737c81',fontWeight:900,letterSpacing:'.12em'}}>LEARNING TRACKS</small><h2 style={{fontSize:30,margin:'7px 0 0'}}>학습 코스</h2></div><span style={{color:'#737c81',fontSize:12}}>{tracks.length} tracks</span></div>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:14}}>{tracks.map(([t,d,l,lv])=><article key={t} style={{minHeight:190,border:'1px solid #25292c',background:'#111315',borderRadius:14,padding:20,display:'flex',flexDirection:'column'}}><small style={{color:'#b9ff31',fontSize:10,fontWeight:900,letterSpacing:'.1em'}}>{lv}</small><h3 style={{fontSize:20,margin:'10px 0 8px'}}>{t}</h3><p style={{fontSize:13,color:'#81898e',lineHeight:1.65,margin:0,flex:1}}>{d}</p><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:16,borderTop:'1px solid #222629',marginTop:16}}><span style={{fontSize:12,color:'#70787d'}}>{l}</span><b style={{fontSize:12}}>Start ›</b></div></article>)}</div>
 </section>
 <section style={{marginTop:42,display:'grid',gridTemplateColumns:'1.15fr .85fr',gap:16}}>
  <div style={{border:'1px solid #25292c',background:'#0e1011',borderRadius:14,padding:22}}><h2 style={{fontSize:24,margin:'0 0 16px'}}>인기 강의</h2><div style={{display:'grid',gap:3}}>{popular.map(([t,time],i)=><div key={t} style={{display:'grid',gridTemplateColumns:'36px 1fr 70px',alignItems:'center',padding:'14px 4px',borderBottom:'1px solid #1f2325'}}><b style={{color:'#697277',fontSize:12}}>{String(i+1).padStart(2,'0')}</b><span style={{fontSize:14,fontWeight:800}}>{t}</span><small style={{color:'#788086',textAlign:'right'}}>{time}</small></div>)}</div></div>
  <aside style={{display:'grid',gap:14}}><div style={{border:'1px solid #25292c',background:'#111315',borderRadius:14,padding:22}}><small style={{color:'#b9ff31',fontWeight:900}}>GLOSSARY</small><h3 style={{fontSize:21,margin:'10px 0'}}>거래 용어사전</h3><p style={{color:'#7f888d',fontSize:13,lineHeight:1.7}}>Mark Price, Funding, ROE, LTV, Maker/Taker 등 자주 쓰는 용어를 빠르게 확인합니다.</p></div><div style={{border:'1px solid #25292c',background:'#111315',borderRadius:14,padding:22}}><small style={{color:'#b9ff31',fontWeight:900}}>QUIZ & REWARD</small><h3 style={{fontSize:21,margin:'10px 0'}}>학습 퀴즈</h3><p style={{color:'#7f888d',fontSize:13,lineHeight:1.7}}>퀴즈/보상 기능은 Reward Hub 정책과 연결 가능한 구조로 확장합니다. 실제 보상은 운영 정책이 활성화된 경우에만 지급됩니다.</p><Link href="/more/reward-hub" style={{color:'#b9ff31',fontSize:12,fontWeight:900}}>Reward Hub ›</Link></div></aside>
 </section>
 </div></main>}
