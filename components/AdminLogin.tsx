'use client';

import {FormEvent,useEffect,useMemo,useState} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import UiIcon from './UiIcon';
import s from './AdminLogin.module.css';

export default function AdminLogin(){
  const supabase=useMemo(()=>createBrowserSupabase(),[]);
  const router=useRouter();
  const params=useSearchParams();
  const next=params.get('next')||'/admin';
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState('');

  async function establish(accessToken:string){
    const r=await fetch('/api/admin/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({access_token:accessToken})});
    if(!r.ok){const body=await r.json().catch(()=>({}));throw new Error(body?.error==='admin_required'?'관리자 권한이 없는 계정입니다.':'관리자 세션을 만들 수 없습니다.')}
    router.replace(next.startsWith('/admin')?next:'/admin');
    router.refresh();
  }

  useEffect(()=>{
    (async()=>{
      const {data}=await supabase.auth.getSession();
      const session=data.session;
      const role=String(session?.user?.app_metadata?.role||'').toLowerCase();
      if(session?.access_token&&(role==='admin'||role==='superadmin'||session.user.app_metadata?.superadmin===true)){
        try{await establish(session.access_token)}catch{}
      }
    })();
  },[]);

  async function submit(e:FormEvent){
    e.preventDefault();setBusy(true);setMsg('');
    const {data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
    if(error||!data.session){setBusy(false);setMsg('이메일 또는 비밀번호를 확인하세요.');return}
    try{await establish(data.session.access_token)}
    catch(err:any){await supabase.auth.signOut();setBusy(false);setMsg(err?.message||'관리자 로그인을 완료할 수 없습니다.')}
  }

  return <main className={s.page}>
    <section className={s.panel}>
      <div className={s.brand}><span>B</span><div><b>BITMATE</b><small>ADMIN CONSOLE</small></div></div>
      <div className={s.secure}><UiIcon name="security" size={16}/> 관리자 전용 접근</div>
      <h1>관리자 로그인</h1>
      <p>공개 사이트와 분리된 운영 콘솔입니다. 관리자 또는 슈퍼어드민 계정만 접근할 수 있습니다.</p>
      <form onSubmit={submit}>
        <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" required/></label>
        <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/></label>
        <button disabled={busy}>{busy?'권한 확인 중...':'Admin Sign in'}</button>
      </form>
      {msg&&<div className={s.error}>{msg}</div>}
      <div className={s.rules}><span>HttpOnly admin session</span><span>Server-side role check</span><span>No index / no cache</span></div>
    </section>
  </main>;
}
