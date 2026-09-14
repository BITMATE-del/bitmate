import Link from 'next/link';

const faq=[
 ['1. 레퍼럴 프로그램은 어떻게 이용하나요?','로그인 후 개인 추천 링크 또는 추천 코드를 발급받아 지인을 초대할 수 있습니다. 커미션과 지급 조건은 현재 운영 정책에 따라 적용됩니다.'],
 ['2. 기간 한정 이벤트는 어떻게 확인하나요?','진행 중인 이벤트가 있을 경우 본 페이지의 Limited-time Event 영역에 기간과 참여 조건이 표시됩니다.'],
 ['3. 레퍼럴 커미션은 어떻게 계산되나요?','유효한 추천 관계와 정책상 인정되는 거래·활동을 기준으로 서버에서 계산하며, 임의 수익률이나 임의 보상 수치는 표시하지 않습니다.'],
 ['4. 리워드는 언제 반영되나요?','지급 주기와 확정 시점은 각 프로그램 정책에 따라 달라질 수 있으며, 확정된 내역만 계정에 반영됩니다.'],
 ['5. Reward Hub는 누구나 이용할 수 있나요?','아닙니다. Reward Hub는 별도로 승인된 레퍼럴 파트너 회원만 이용할 수 있습니다.'],
];

export default function ReferralPage(){
 return <main style={{minHeight:'calc(100vh - 72px)',background:'#050607',color:'#f5f7f8'}}>
  <div className="xtShell" style={{paddingTop:18}}>
   <div style={{display:'flex',gap:30,borderBottom:'1px solid #202326',fontSize:13}}>
    <span style={{padding:'0 0 14px',borderBottom:'2px solid #f5f7f8',fontWeight:800}}>Invitation to referral</span>
    <a href="#events" style={{padding:'0 0 14px',color:'#8e969b'}}>Limited-time Event</a>
   </div>

   <section style={{display:'grid',gridTemplateColumns:'minmax(0,1.05fr) minmax(360px,.95fr)',gap:50,alignItems:'center',minHeight:440,padding:'48px 0 54px'}}>
    <div>
     <span style={{display:'inline-block',color:'#b9ff31',fontSize:12,fontWeight:800,letterSpacing:'.12em',marginBottom:16}}>BITMATE REFERRAL PROGRAM</span>
     <h1 style={{fontSize:'clamp(44px,5.4vw,74px)',lineHeight:1.02,letterSpacing:'-.055em',margin:'0 0 22px'}}>Refer friends.<br/>Earn rewards together.</h1>
     <p style={{maxWidth:700,color:'#9aa2a7',fontSize:16,lineHeight:1.75,margin:0}}>친구를 초대하고, 현재 운영 중인 레퍼럴 정책에 따라 인정된 활동과 거래를 기준으로 리워드를 받을 수 있습니다. 커미션율과 지급 조건은 계정 및 파트너 정책에 따라 적용됩니다.</p>
     <div style={{display:'flex',gap:12,marginTop:30,alignItems:'center',flexWrap:'wrap'}}>
      <Link href="/login" style={{minWidth:230,minHeight:48,borderRadius:8,background:'#9bea12',color:'#0d1207',fontWeight:900,display:'inline-flex',alignItems:'center',justifyContent:'center'}}>Get referral link</Link>
      <div style={{width:48,height:48,border:'1px solid #34393d',borderRadius:8,display:'grid',placeItems:'center',color:'#b8c0c4'}}>▦</div>
     </div>
     <small style={{display:'block',marginTop:12,color:'#646d72'}}>추천 링크와 추천 코드는 로그인 후 계정에 발급됩니다.</small>
    </div>

    <div aria-hidden="true" style={{position:'relative',height:320,display:'grid',placeItems:'center'}}>
     <div style={{position:'absolute',width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle, rgba(166,255,34,.18), rgba(166,255,34,0) 68%)'}}/>
     <div style={{position:'relative',width:280,height:190,borderRadius:26,border:'1px solid #5f6a56',background:'linear-gradient(145deg,#282c2f,#0e1011 62%)',boxShadow:'0 30px 70px rgba(0,0,0,.45), inset 0 0 32px rgba(185,255,49,.06)',display:'grid',placeItems:'center',transform:'rotate(-3deg)'}}>
      <div style={{fontSize:66,fontWeight:900,letterSpacing:'-.06em',color:'#e6e9ea'}}>REF</div>
      <div style={{position:'absolute',bottom:18,right:22,fontSize:12,color:'#b9ff31',fontWeight:800}}>INVITE · TRADE · REWARD</div>
     </div>
    </div>
   </section>

   <section style={{border:'1px solid #25292c',background:'#0d0f10',borderRadius:12,padding:'28px 24px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:18,marginBottom:58}}>
    {[['1','Invite friend(s) to sign up','추천 링크 또는 코드로 친구를 초대합니다.'],['2','Trade','초대된 회원의 정책상 인정되는 거래·활동을 집계합니다.'],['3','Reward','확정된 조건을 충족한 리워드를 계정에 반영합니다.']].map(([n,t,d])=><div key={n} style={{padding:'6px 18px',textAlign:'center'}}><div style={{display:'flex',gap:10,justifyContent:'center',alignItems:'center',fontWeight:900,fontSize:18}}><span style={{width:25,height:25,borderRadius:'50%',display:'grid',placeItems:'center',background:'#b9ff31',color:'#101308',fontSize:12}}>{n}</span>{t}</div><p style={{color:'#8f979c',lineHeight:1.6,fontSize:13,margin:'20px 0 0'}}>{d}</p></div>)}
   </section>

   <section id="events" style={{padding:'10px 0 58px'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'end',gap:16,marginBottom:18}}><div><span style={{fontSize:12,color:'#778086',letterSpacing:'.12em',fontWeight:800}}>LIMITED-TIME EVENT</span><h2 style={{fontSize:30,margin:'8px 0 0'}}>Referral Events</h2></div><Link href="/more/notice" style={{color:'#b9ff31',fontSize:13,fontWeight:800}}>View notices ›</Link></div>
    <div style={{minHeight:150,border:'1px solid #25292c',borderRadius:12,background:'#0d0f10',padding:26,display:'flex',alignItems:'center',justifyContent:'space-between',gap:20}}><div><b style={{fontSize:18}}>현재 공개된 기간 한정 이벤트가 없습니다.</b><p style={{margin:'8px 0 0',color:'#7f888d',fontSize:14}}>이벤트가 등록되면 기간, 참여 조건, 리워드 지급 기준이 이 영역에 표시됩니다.</p></div><span style={{padding:'8px 12px',borderRadius:999,border:'1px solid #343a3d',color:'#7e878c',fontSize:12}}>No active event</span></div>
   </section>

   <section style={{padding:'10px 0 90px'}}><h2 style={{fontSize:30,margin:'0 0 24px'}}>FAQ</h2><div style={{display:'grid',gap:12}}>{faq.map(([q,a])=><details key={q} style={{border:'1px solid #25292c',borderRadius:9,background:'#0d0f10',padding:'0 22px'}}><summary style={{cursor:'pointer',listStyle:'none',padding:'22px 0',fontWeight:800,fontSize:16}}>{q}</summary><p style={{margin:'0 0 22px',color:'#8f979c',fontSize:14,lineHeight:1.7}}>{a}</p></details>)}</div></section>
  </div>
 </main>
}
