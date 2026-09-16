'use client';

import Link from 'next/link';
import {useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import s from './AuthPortal.module.css';

type Props={mode:'login'|'signup'};
type Method='email'|'phone';

const countryCodes=[
  {label:'KR +82',value:'+82'},
  {label:'US +1',value:'+1'},
  {label:'JP +81',value:'+81'},
  {label:'SG +65',value:'+65'},
  {label:'HK +852',value:'+852'},
];

function normalizePhone(code:string,input:string){
  const digits=input.replace(/\D/g,'');
  if(!digits)return '';
  const local=code==='+82'&&digits.startsWith('0')?digits.slice(1):digits;
  return `${code}${local}`;
}

function authMessage(message:string){
  const m=message.toLowerCase();
  if(m.includes('invalid login credentials'))return '로그인 정보가 올바르지 않습니다.';
  if(m.includes('user already registered'))return '이미 가입된 계정입니다.';
  if(m.includes('password should be'))return '비밀번호 조건을 확인해주세요.';
  if(m.includes('phone provider is disabled'))return '휴대폰 가입이 아직 활성화되지 않았습니다. 관리자에게 문의해주세요.';
  if(m.includes('email rate limit'))return '이메일 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  if(m.includes('sms')&&m.includes('rate'))return '인증번호 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  return message;
}

export default function AuthPortal({mode}:Props){
  const supabase=useMemo(()=>createBrowserSupabase(),[]);
  const router=useRouter();
  const [method,setMethod]=useState<Method>('email');
  const [email,setEmail]=useState('');
  const [countryCode,setCountryCode]=useState('+82');
  const [phone,setPhone]=useState('');
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [terms,setTerms]=useState(false);
  const [otp,setOtp]=useState('');
  const [otpPending,setOtpPending]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    setError('');setMessage('');
    if(password.length<8){setError('비밀번호는 8자 이상 입력해주세요.');return;}
    if(mode==='signup'&&password!==confirm){setError('비밀번호 확인이 일치하지 않습니다.');return;}
    if(mode==='signup'&&!terms){setError('이용약관 및 개인정보 처리방침에 동의해주세요.');return;}

    setBusy(true);
    try{
      if(method==='email'){
        const cleanEmail=email.trim().toLowerCase();
        if(!cleanEmail){setError('이메일을 입력해주세요.');return;}
        if(mode==='login'){
          const {error}=await supabase.auth.signInWithPassword({email:cleanEmail,password});
          if(error)throw error;
          router.push('/');router.refresh();
        }else{
          const {data,error}=await supabase.auth.signUp({email:cleanEmail,password});
          if(error)throw error;
          if(data.session){router.push('/');router.refresh();}
          else setMessage('가입 확인 이메일을 전송했습니다. 이메일 인증 후 로그인해주세요.');
        }
      }else{
        const fullPhone=normalizePhone(countryCode,phone);
        if(fullPhone.length<8){setError('휴대폰 번호를 확인해주세요.');return;}
        if(mode==='login'){
          const {error}=await supabase.auth.signInWithPassword({phone:fullPhone,password});
          if(error)throw error;
          router.push('/');router.refresh();
        }else{
          const {data,error}=await supabase.auth.signUp({phone:fullPhone,password});
          if(error)throw error;
          if(data.session){router.push('/');router.refresh();}
          else{setOtpPending(true);setMessage('휴대폰으로 전송된 6자리 인증번호를 입력해주세요.');}
        }
      }
    }catch(err){
      const text=err instanceof Error?err.message:'인증 처리 중 오류가 발생했습니다.';
      setError(authMessage(text));
    }finally{setBusy(false);}
  }

  async function verifyPhone(){
    setError('');setMessage('');
    const fullPhone=normalizePhone(countryCode,phone);
    if(otp.replace(/\D/g,'').length!==6){setError('6자리 인증번호를 입력해주세요.');return;}
    setBusy(true);
    const {error}=await supabase.auth.verifyOtp({phone:fullPhone,token:otp.replace(/\D/g,''),type:'sms'});
    setBusy(false);
    if(error){setError(authMessage(error.message));return;}
    router.push('/');router.refresh();
  }

  const signup=mode==='signup';
  return <main className={s.page}>
    <section className={s.card}>
      <Link href="/" className={s.brand}><span>B</span><b>BITMATE</b></Link>
      <div className={s.heading}><h1>{signup?'회원 가입':'로그인'}</h1><p>{signup?'BITMATE 계정을 만들고 거래를 시작하세요.':'BITMATE 계정에 로그인하세요.'}</p></div>

      <div className={s.methodTabs} role="tablist">
        <button type="button" className={method==='email'?s.active:''} onClick={()=>{setMethod('email');setOtpPending(false);setError('');setMessage('')}}>이메일</button>
        <button type="button" className={method==='phone'?s.active:''} onClick={()=>{setMethod('phone');setOtpPending(false);setError('');setMessage('')}}>휴대폰</button>
      </div>

      <form onSubmit={submit} className={s.form}>
        {method==='email'?<label><span>이메일</span><input type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={e=>setEmail(e.target.value)} required/></label>:
        <label><span>휴대폰 번호</span><div className={s.phoneRow}><select value={countryCode} onChange={e=>setCountryCode(e.target.value)}>{countryCodes.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select><input type="tel" inputMode="tel" autoComplete="tel" placeholder="010 1234 5678" value={phone} onChange={e=>setPhone(e.target.value)} required/></div></label>}

        <label><span>비밀번호</span><input type="password" autoComplete={signup?'new-password':'current-password'} placeholder="8자 이상 입력" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
        {signup&&<label><span>비밀번호 확인</span><input type="password" autoComplete="new-password" placeholder="비밀번호 다시 입력" value={confirm} onChange={e=>setConfirm(e.target.value)} required/></label>}

        {otpPending&&method==='phone'&&<div className={s.otpBox}><label><span>SMS 인증번호</span><input maxLength={6} inputMode="numeric" placeholder="6자리 인증번호" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))}/></label><button type="button" onClick={verifyPhone} disabled={busy}>{busy?'확인 중...':'인증 완료'}</button></div>}

        {signup&&<label className={s.check}><input type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)}/><span>BITMATE 이용약관 및 개인정보 처리방침에 동의합니다.</span></label>}
        {error&&<div className={s.error}>{error}</div>}
        {message&&<div className={s.success}>{message}</div>}
        {!otpPending&&<button className={s.primary} type="submit" disabled={busy}>{busy?'처리 중...':signup?'회원 가입':'로그인'}</button>}
      </form>

      <div className={s.switch}>{signup?<>이미 계정이 있나요? <Link href="/login">로그인</Link></>:<>BITMATE가 처음이신가요? <Link href="/signup">회원 가입</Link></>}</div>
      <div className={s.security}><span>암호화 통신</span><span>세션 보호</span><span>Supabase Auth</span></div>
    </section>
  </main>;
}
