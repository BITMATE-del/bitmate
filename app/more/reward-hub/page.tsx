'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';

type Partner={partner_code:string;status:string;tier:string;joined_at:string};

export default function RewardHubPage(){
 const supabase=useMemo(()=>createBrowserSupabase(),[]);
 const [loading,setLoading]=useState(true);
 const [partner,setPartner]=useState<Partner|null>(null);
 const [loggedIn,setLoggedIn]=useState(false);

 useEffect(()=>{
  let cancelled=false;
  (async()=>{
   const {data:{user}}=await supabase.auth.getUser();
   if(cancelled)return;
   if(!user){setLoggedIn(false);setLoading(false);return;}
   setLoggedIn(true);
   const {data}=await supabase.from('referral_partners').select('partner_code,status,tier,joined_at').eq('user_id',user.id).eq('status','ACTIVE').maybeSingle();
   if(cancelled)return;
   setPartner((data as Partner|null)||null);
   setLoading(false);
  })();
  return()=>{cancelled=true};
 },[supabase]);

 if(loading)return <main style={{minHeight:'calc(100vh - 72px)',background:'#070809',display:'grid',placeItems:'center',color:'#7f888d'}}>Checking partner access…</main>;

 if(!partner)return <main style={{minHeight:'calc(100vh - 72px)',background:'#070809',color:'#f4f6f7',display:'grid',placeItems:'center',padding:24}}>
  <section style={{width:'min(640px,100%)',border:'1px solid #2a2e31',background:'#111315',borderRadius:18,padding:'42px 34px',textAlign:'center',boxShadow:'0 28px 80px rgba(0,0,0,.38)'}}>
   <div style={{width:56,height:56,borderRadius:16,display:'grid',placeItems:'center',margin:'0 auto 18px',background:'#1b2117',color:'#b9ff31',fontSize:25}}>◆</div>
   <span style={{display:'inline-block',fontSize:11,fontWeight:900,letterSpacing:'.14em',color:'#777f84'}}>PARTNER ACCESS ONLY</span>
   <h1 style={{fontSize:'clamp(28px,5vw,42px)',margin:'12px 0 14px',letterSpacing:'-.04em'}}>Reward Hub</h1>
   <p style={{fontSize:17,lineHeight:1.7,color:'#b3babd',margin:'0 auto',maxWidth:480}}>레퍼럴 파트너가 등록된 회원만 입장이 가능합니다.</p>
   <p style={{fontSize:13,lineHeight:1.7,color:'#737c81',margin:'10px auto 0',maxWidth:520}}>파트너 승인이 완료된 계정은 자동으로 접근 권한이 활성화됩니다.</p>
   <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap',marginTop:28}}>
    {!loggedIn&&<Link href="/login" style={{minHeight:44,padding:'0 20px',borderRadius:8,display:'inline-flex',alignItems:'center',background:'#b9ff31',color:'#0d1207',fontWeight:900}}>Log in</Link>}
    <Link href="/more/referral" style={{minHeight:44,padding:'0 20px',borderRadius:8,display:'inline-flex',alignItems:'center',border:'1px solid #34393d',color:'#e7eaeb',fontWeight:800}}>Referral Program</Link>
   </div>
  </section>
 </main>;

 return <main style={{minHeight:'calc(100vh - 72px)',background:'#08090a',color:'#f4f6f7',padding:'46px 0 90px'}}><div className="xtShell">
  <div style={{display:'flex',justifyContent:'space-between',gap:22,alignItems:'flex-end',flexWrap:'wrap',paddingBottom:24,borderBottom:'1px solid #212427'}}>
   <div><span style={{fontSize:11,color:'#777f84',fontWeight:900,letterSpacing:'.14em'}}>REFERRAL PARTNER</span><h1 style={{fontSize:'clamp(38px,5vw,62px)',letterSpacing:'-.045em',margin:'8px 0 8px'}}>Reward Hub</h1><p style={{margin:0,color:'#899196'}}>파트너 성과, 커미션 및 하위 파트너 운영을 관리합니다.</p></div>
   <div style={{padding:'12px 16px',borderRadius:10,background:'#121517',border:'1px solid #2a2e31',minWidth:220}}><small style={{display:'block',color:'#747c81',marginBottom:5}}>Partner Code</small><b style={{fontSize:18,color:'#b9ff31'}}>{partner.partner_code}</b><small style={{display:'block',color:'#747c81',marginTop:7}}>{partner.tier} · {partner.status}</small></div>
  </div>

  <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:14,marginTop:24}}>
   {[['Referral Performance','추천 회원과 유효 활동 성과를 확인합니다.'],['Commission Summary','확정된 커미션과 지급 상태를 확인합니다.'],['Partner Network','하위 파트너 구조와 상태를 관리합니다.'],['Reports','기간별 성과와 지급 내역을 확인합니다.']].map(([t,d])=><div key={t} style={{minHeight:150,border:'1px solid #25292c',background:'#111315',borderRadius:14,padding:22}}><span style={{display:'block',color:'#b9ff31',fontSize:11,fontWeight:900,letterSpacing:'.12em',marginBottom:12}}>PARTNER</span><b style={{fontSize:18}}>{t}</b><p style={{color:'#7f888d',fontSize:13,lineHeight:1.65,margin:'10px 0 0'}}>{d}</p></div>)}
  </section>

  <section style={{marginTop:22,border:'1px solid #25292c',borderRadius:14,background:'#0e1011',padding:24}}><div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}><div><b style={{fontSize:18}}>Partner access verified</b><p style={{color:'#7f888d',fontSize:13,lineHeight:1.65,margin:'7px 0 0'}}>가입일 {new Date(partner.joined_at).toLocaleDateString('ko-KR')} · 실제 성과/커미션 데이터는 확정된 운영 기록 기준으로만 표시됩니다.</p></div><Link href="/more/referral" style={{color:'#b9ff31',fontWeight:800,fontSize:13}}>Referral Program ›</Link></div></section>
 </div></main>
}
