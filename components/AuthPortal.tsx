'use client';

import Link from 'next/link';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import s from './AuthPortal.module.css';
import BrandLogo from './BrandLogo';

type Props={mode:'login'|'signup'};

function authMessage(message:string){
  const m=message.toLowerCase();
  if(m.includes('invalid login credentials'))return '로그인 정보가 올바르지 않습니다.';
  if(m.includes('user already registered'))return '이미 가입된 계정입니다.';
  if(m.includes('password should be'))return '비밀번호 조건을 확인해주세요.';
  if(m.includes('invalid_signup_code'))return '가입코드가 올바르지 않거나 비활성화된 코드입니다.';
  if(m.includes('email rate limit')||m.includes('rate limit'))return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  return message;
}

export default function AuthPortal({mode}:Props){
  const router=useRouter();
  const nextPath=()=>{
    const requested=new URLSearchParams(window.location.search).get('next')||'/';
    return requested.startsWith('/')&&!requested.startsWith('//')?requested:'/';
  };
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [signupCode,setSignupCode]=useState('');
  const [terms,setTerms]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    setError('');setMessage('');

    const cleanEmail=email.trim().toLowerCase();
    if(!cleanEmail){setError('이메일을 입력해주세요.');return}
    if(password.length<10){setError('비밀번호는 10자 이상 입력해주세요.');return}
    if(mode==='signup'&&password!==confirm){setError('비밀번호 확인이 일치하지 않습니다.');return}
    if(mode==='signup'&&!terms){setError('이용약관 및 개인정보 처리방침에 동의해주세요.');return}

    setBusy(true);
    try{
      const response=await fetch('/api/recovery-auth/'+(mode==='login'?'login':'signup'),{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:cleanEmail,password,signupCode:mode==='signup'?signupCode.trim().toUpperCase():''}),credentials:'same-origin'
      });
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'인증 처리에 실패했습니다.');
      window.dispatchEvent(new Event('bm-auth-changed'));
      router.push(nextPath());
      router.refresh();
    }catch(err){
      const text=err instanceof Error?err.message:'인증 처리 중 오류가 발생했습니다.';
      setError(authMessage(text));
    }finally{
      setBusy(false);
    }
  }

  const signup=mode==='signup';

  return <main className={s.page}>
    <section className={s.card}>
      <Link href="/" className={s.brand}><BrandLogo variant="horizontal" height={38}/></Link>
      <div className={s.heading}>
        <h1>{signup?'회원 가입':'로그인'}</h1>
        <p>{signup?'BITMATE 계정을 만들고 거래를 시작하세요.':'BITMATE 계정에 로그인하세요.'}</p>
      </div>

      <form onSubmit={submit} className={s.form}>
        <label>
          <span>이메일</span>
          <input type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={e=>setEmail(e.target.value)} required/>
        </label>

        <label>
          <span>비밀번호</span>
          <input type="password" autoComplete={signup?'new-password':'current-password'} placeholder="10자 이상 입력" value={password} onChange={e=>setPassword(e.target.value)} required/>
        </label>

        {signup&&<label>
          <span>비밀번호 확인</span>
          <input type="password" autoComplete="new-password" placeholder="비밀번호 다시 입력" value={confirm} onChange={e=>setConfirm(e.target.value)} required/>
        </label>}

        {signup&&<label>
          <span>총판 가입코드 <small style={{color:'#778087',fontWeight:500}}>(선택)</small></span>
          <input value={signupCode} onChange={e=>setSignupCode(e.target.value.toUpperCase())} placeholder="추천/총판 코드가 있다면 입력" autoComplete="off"/>
        </label>}

        {signup&&<label className={s.check}>
          <input type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)}/>
          <span>BITMATE 이용약관 및 개인정보 처리방침에 동의합니다.</span>
        </label>}

        {error&&<div className={s.error}>{error}</div>}
        {message&&<div className={s.success}>{message}</div>}

        <button className={s.primary} type="submit" disabled={busy}>
          {busy?'처리 중...':signup?'회원 가입':'로그인'}
        </button>
      </form>

      <p style={{fontSize:12,color:'#a9b2b7',lineHeight:1.6}}>회원 계정과 거래 내역은 BITMATE 계정으로 관리됩니다.</p>
      <div className={s.switch}>
        {signup?<>이미 계정이 있나요? <Link href="/login">로그인</Link></>:<>BITMATE가 처음이신가요? <Link href="/signup">회원 가입</Link></>}
      </div>
    </section>
  </main>;
}
