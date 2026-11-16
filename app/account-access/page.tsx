'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';

type Identity={id:string;email:string;role:string};
export default function AccountAccessPage(){
 const [user,setUser]=useState<Identity|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{
   let live=true;
   fetch('/api/recovery-auth/session',{cache:'no-store',credentials:'same-origin'})
     .then(async r=>{if(!r.ok)throw new Error('로그인이 필요합니다.');return r.json()})
     .then(data=>{if(live)setUser(data.user)})
     .catch(e=>{if(live)setError(e instanceof Error?e.message:'인증 실패')})
     .finally(()=>{if(live)setLoading(false)});
   return()=>{live=false};
 },[]);
 async function logout(){
  await fetch('/api/recovery-auth/logout',{method:'POST',credentials:'same-origin'});
  window.location.replace('/login');
 }
 return <main style={{minHeight:'80vh',background:'#0a1012',color:'#edf2f3',padding:'70px 20px'}}>
 <div style={{maxWidth:560,margin:'0 auto',padding:32,borderRadius:16,border:'1px solid #303c40',background:'#121b1e'}}>
 <div style={{fontSize:12,color:'#b9ff31',fontWeight:800,letterSpacing:'.08em'}}>BITMATE ACCOUNT</div>
 <h1 style={{fontSize:26,margin:'12px 0'}}>계정 로그인 상태</h1>
 {loading?<p>인증 상태를 확인하는 중...</p>:user?<><p style={{color:'#b9ff31',fontWeight:800}}>로그인 성공</p><p>{user.email}</p><p style={{fontSize:13,color:'#9baeb4',lineHeight:1.7}}>새 인증 시스템에 로그인되었습니다. 거래, 지갑, 총판 및 관리자 기능은 데이터베이스 이전 작업이 완료되기 전까지 사용할 수 없습니다. 실제 금액을 입금하거나 거래를 시도하지 마세요.</p><button onClick={logout} style={{border:0,borderRadius:8,padding:'11px 18px',background:'#b9ff31',color:'#111',fontWeight:800,cursor:'pointer'}}>로그아웃</button></>:<><p style={{color:'#f8a1a6'}}>{error}</p><Link href="/login" style={{color:'#b9ff31'}}>로그인으로 이동</Link></>}
 </div></main>;
}
