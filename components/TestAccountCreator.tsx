'use client';
import {useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';

export default function TestAccountCreator(){
 const supabase=createBrowserSupabase();
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [success,setSuccess]=useState(false);
 async function create(e:React.FormEvent){
   e.preventDefault();setBusy(true);setMessage('');setSuccess(false);
   try{
     const {data:{session}}=await supabase.auth.getSession();
     if(!session){setMessage('로그인 세션이 만료되었습니다. 다시 로그인하세요.');return}
     const response=await fetch('/api/internal/test-account',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({email,password})});
     const result=await response.json();
     if(!response.ok){setMessage(result.error||'발급에 실패했습니다.');return}
     setMessage('테스트 계정이 생성됐습니다. 이메일 인증 없이 로그인할 수 있습니다.');
     setSuccess(true);setEmail('');setPassword('');
   }catch{setMessage('요청 중 오류가 발생했습니다.')}
   finally{setBusy(false)}
 }
 return <section style={{padding:20,margin:'20px 0',background:'#11191b',border:'1px solid #344044',borderRadius:14,color:'#eef3f4'}}>
  <h2 style={{margin:'0 0 8px',fontSize:18}}>테스트 계정 발급</h2>
  <p style={{fontSize:12,color:'#a3b0b5',lineHeight:1.6,margin:'0 0 16px'}}>일반 회원 가입 정책은 변경하지 않습니다. 테스트 계정만 이메일 인증 없이 생성되며 발급 이력이 기록됩니다. 총판은 자신의 코드에만 연결됩니다.</p>
  <form onSubmit={create} style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'end'}}>
   <label style={{display:'grid',gap:6,flex:'1 1 210px',fontSize:12}}>테스트 이메일
    <input type="email" autoComplete="off" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="test@example.com" style={{width:'100%',padding:'12px',borderRadius:8,border:'1px solid #3a484d',background:'#0a1113',color:'#fff'}}/>
   </label>
   <label style={{display:'grid',gap:6,flex:'1 1 210px',fontSize:12}}>초기 비밀번호 (12자 이상)
    <input type="password" required minLength={12} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="12자 이상" style={{width:'100%',padding:'12px',borderRadius:8,border:'1px solid #3a484d',background:'#0a1113',color:'#fff'}}/>
   </label>
   <button type="submit" disabled={busy} style={{padding:'12px 18px',border:0,borderRadius:8,background:'#b9ff31',color:'#111',fontWeight:800,cursor:'pointer',minHeight:44}}>{busy?'발급 중...':'테스트 계정 생성'}</button>
  </form>
  {message&&<p role="status" style={{fontSize:12,color:success?'#b9ff31':'#ff8c93',margin:'12px 0 0'}}>{message}</p>}
 </section>
}
