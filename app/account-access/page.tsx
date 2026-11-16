'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';

type Identity={id:string;email:string;role:string};
export default function AccountAccessPage(){
 const [user,setUser]=useState<Identity|null>(null);
 const [loading,setLoading]=useState(true);
 const [demoWallet,setDemoWallet]=useState<{available:string|number;locked:string|number;is_test_account:boolean}|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{
   let live=true;
   fetch('/api/recovery-auth/session',{cache:'no-store',credentials:'same-origin'})
     .then(async r=>{if(!r.ok)throw new Error('로그인이 필요합니다.');return r.json()})
     .then(async data=>{if(!live)return;setUser(data.user);try{const r=await fetch('/api/recovery-auth/wallet',{cache:'no-store'});if(r.ok){const wallet=await r.json();if(live)setDemoWallet(wallet.wallet)}}catch{}})
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
 {loading?<p>인증 상태를 확인하는 중...</p>:user?<><p style={{color:'#b9ff31',fontWeight:800}}>로그인 성공</p><p>{user.email}</p><p style={{fontSize:13,color:'#9baeb4',lineHeight:1.7}}>새 인증 시스템에 로그인되었습니다. 아래 금액은 테스트 전용 가상잔액이며 실제 USDT가 아닙니다. 실거래, 입출금, CFD·선물 정산은 아직 연결되지 않았습니다.</p>{demoWallet&&<div style={{background:'#1a2528',padding:16,borderRadius:10,border:'1px solid #374a4f',marginBottom:16}}><div style={{color:'#adbec2',fontSize:12}}>테스트 가상잔액 · 실자산 아님</div><div style={{fontSize:25,fontWeight:850,margin:'7px 0'}}>{Number(demoWallet.available).toLocaleString('ko-KR')} <span style={{fontSize:12,color:'#a7b7ba'}}>가상 단위</span></div><div style={{fontSize:11,color:'#a7b7ba'}}>보유금 {Number(demoWallet.locked).toLocaleString('ko-KR')}</div></div>}{user.role==='admin'&&<p><Link href="/admin" style={{color:'#b9ff31'}}>어드민 관리센터</Link></p>}{user.role==='dealer'&&<p><Link href="/dealer" style={{color:'#b9ff31'}}>총판 관리센터</Link></p>}<button onClick={logout} style={{border:0,borderRadius:8,padding:'11px 18px',background:'#b9ff31',color:'#111',fontWeight:800,cursor:'pointer'}}>로그아웃</button></>:<><p style={{color:'#f8a1a6'}}>{error}</p><Link href="/login" style={{color:'#b9ff31'}}>로그인으로 이동</Link></>}
 </div></main>;
}
