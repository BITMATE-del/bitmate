import Link from 'next/link';
import {notFound} from 'next/navigation';

const pages:Record<string,{title:string;kicker:string;desc:string;items:string[];cta?:string}>={
 notice:{title:'Notice',kicker:'SYSTEM & SERVICE',desc:'BITMATE 서비스 운영, 시스템 업데이트, 점검 및 주요 정책 안내를 확인합니다.',items:['서비스 공지 및 업데이트','점검 일정과 완료 안내','상품·정책 변경 공지','보안 및 운영 관련 안내']},
 referral:{title:'Referral Program',kicker:'PARTNER PROGRAM',desc:'초대 링크를 통해 추천 현황과 파트너 활동을 관리하는 레퍼럴 프로그램입니다.',items:['개인 추천 링크 관리','추천 가입자 현황','파트너 등급 및 조건','커미션 내역 및 지급 상태'],cta:'Referral Dashboard'},
 'reward-hub':{title:'Reward Hub',kicker:'PARTNER & DISTRIBUTION',desc:'레퍼럴 파트너와 총판 운영을 위한 리워드·성과 관리 허브입니다.',items:['하위 파트너 구조 관리','파트너별 실적 현황','리워드 및 커미션 요약','기간별 성과 리포트'],cta:'Open Reward Hub'},
 academy:{title:'Academy',kicker:'BITMATE GUIDE',desc:'플랫폼과 각 상품을 처음 사용하는 회원을 위한 사용설명서와 가이드입니다.',items:['회원가입·보안 설정','입출금 및 자산 관리','AI Trading / Copy Trading 사용법','CFD / Crypto ETF / Mining 가이드'],cta:'Start Learning'},
 'mining-boost':{title:'Mining Boost',kicker:'MINING POWER',desc:'Mining Power와 채굴 효율을 강화하는 부스트 프로그램입니다. 실제 적용률과 조건은 서버 정책에 따라 표시됩니다.',items:['현재 Mining Power 확인','적용 가능한 Boost 목록','Boost 적용 기간과 상태','Boost 이력 및 효과 확인'],cta:'View Mining Boost'},
 'lucky-draw':{title:'Lucky Draw',kicker:'EVENTS',desc:'BITMATE 프로모션과 추첨 이벤트를 확인하고 참여할 수 있는 이벤트 공간입니다.',items:['진행중 이벤트','참여 조건 및 기간','내 응모 현황','당첨 결과 및 지급 상태'],cta:'View Events'},
};

export default async function MoreDetailPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params; const page=pages[slug]; if(!page)notFound();
 return <main style={{minHeight:'calc(100vh - 72px)',background:'#0b0c0e',padding:'62px 0 90px'}}><div className="xtShell">
  <Link href="/more" style={{display:'inline-block',color:'#8b9398',fontSize:13,marginBottom:26}}>← More</Link>
  <section style={{display:'grid',gridTemplateColumns:'1.1fr .9fr',gap:22,alignItems:'stretch'}}>
   <div style={{padding:'34px 0'}}><span style={{color:'#b9ff31',fontSize:12,fontWeight:800,letterSpacing:'.14em'}}>{page.kicker}</span><h1 style={{fontSize:'clamp(42px,6vw,72px)',letterSpacing:'-.05em',margin:'14px 0 18px'}}>{page.title}</h1><p style={{maxWidth:700,color:'#949ca1',fontSize:17,lineHeight:1.8}}>{page.desc}</p>{page.cta&&<button style={{marginTop:28,minHeight:44,padding:'0 20px',border:0,borderRadius:9,background:'#b9ff31',color:'#10120c',fontWeight:800}}>{page.cta}</button>}</div>
   <aside style={{padding:24,border:'1px solid #272b2e',background:'#121416',borderRadius:18}}><span style={{color:'#727b80',fontSize:11,letterSpacing:'.12em',fontWeight:800}}>OVERVIEW</span><div style={{display:'grid',gap:10,marginTop:16}}>{page.items.map((x,i)=><div key={x} style={{display:'grid',gridTemplateColumns:'34px 1fr',gap:12,alignItems:'center',padding:'15px 14px',borderRadius:11,background:'#191c1e',border:'1px solid #23272a'}}><b style={{color:'#b9ff31',fontSize:12}}>{String(i+1).padStart(2,'0')}</b><span style={{fontSize:14}}>{x}</span></div>)}</div></aside>
  </section>
 </div></main>
}