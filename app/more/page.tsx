import Link from 'next/link';

const services=[
 {href:'/more/notice',icon:'▣',title:'Notice',desc:'서비스 공지, 시스템 업데이트 및 점검 안내'},
 {href:'/more/referral',icon:'↗',title:'Referral Program',desc:'초대 링크, 추천 현황 및 커미션 프로그램'},
 {href:'/more/reward-hub',icon:'◆',title:'Reward Hub',desc:'레퍼럴 파트너·총판 성과와 리워드 관리'},
 {href:'/more/academy',icon:'▤',title:'Academy',desc:'플랫폼 사용법, 상품별 가이드 및 시작 안내'},
 {href:'/more/mining-boost',icon:'⚡',title:'Mining Boost',desc:'Mining Power 및 채굴 효율 부스트 프로그램'},
 {href:'/lucky-draw',icon:'✦',title:'Lucky Draw',desc:'행운볼 획득, 서버 추첨 및 보상 내역'},
 {href:'/crypto-loan',icon:'◫',title:'Crypto Loan',desc:'보유 암호화폐를 담보로 하는 자산담보 대출'},
];

export default function MorePage(){
 return <main style={{minHeight:'calc(100vh - 72px)',background:'#0b0c0e',padding:'64px 0 90px'}}><div className="xtShell">
  <div style={{maxWidth:760,marginBottom:34}}><span style={{color:'#7e878c',fontSize:12,fontWeight:800,letterSpacing:'.14em'}}>BITMATE SERVICES</span><h1 style={{fontSize:'clamp(38px,5vw,64px)',letterSpacing:'-.045em',margin:'12px 0'}}>More</h1><p style={{color:'#939ba0',fontSize:16,lineHeight:1.75}}>공지, 파트너 프로그램, 리워드, 사용 가이드, Mining Boost, Lucky Draw와 Crypto Loan을 한 곳에서 확인합니다.</p></div>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:14}}>{services.map(x=><Link key={x.href} href={x.href} style={{minHeight:145,padding:24,border:'1px solid #25292c',background:'#121416',borderRadius:16,display:'grid',gridTemplateColumns:'48px 1fr 18px',gap:15,alignItems:'start'}}><span style={{width:46,height:46,borderRadius:12,display:'grid',placeItems:'center',background:'#1d211b',color:'#b9ff31',fontSize:20}}>{x.icon}</span><span><b style={{display:'block',fontSize:18,marginBottom:8}}>{x.title}</b><small style={{display:'block',color:'#838b90',fontSize:13,lineHeight:1.6}}>{x.desc}</small></span><em style={{fontStyle:'normal',color:'#687076',alignSelf:'center'}}>›</em></Link>)}</div>
 </div></main>
}