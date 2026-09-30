'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import {formatKoreanPhoneInput,normalizePhoneE164} from '@/lib/phone';
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

const OTP_COOLDOWN_SECONDS=60;
const OTP_MAX_PER_HOUR=5;

function authMessage(message:string){
  const m=message.toLowerCase();
  if(m.includes('invalid login credentials'))return '로그인 정보가 올바르지 않습니다.';
  if(m.includes('user already registered'))return '이미 가입된 계정입니다.';
  if(m.includes('password should be'))return '비밀번호 조건을 확인해주세요.';
  if(m.includes('phone provider is disabled'))return '현재 휴대폰 인증을 이용할 수 없습니다. 관리자에게 문의해주세요.';
  if(m.includes('email rate limit'))return '이메일 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  if(m.includes('sms')&&m.includes('rate'))return '인증번호 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  if(m.includes('rate limit'))return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  if(m.includes('otp')||m.includes('token'))return '인증번호가 올바르지 않거나 만료되었습니다.';
  return message;
}

function rateKey(phone:string){return `bitmate_phone_otp_attempts:${phone}`}

function readOtpAttempts(phone:string){
  try{
    const raw=JSON.parse(localStorage.getItem(rateKey(phone))||'[]');
    const now=Date.now();
    return Array.isArray(raw)?raw.filter((x):x is number=>typeof x==='number'&&now-x<3600000):[];
  }catch{return []}
}

export default function AuthPortal({mode}:Props){
  const supabase=useMemo(()=>createBrowserSupabase(),[]);
  const router=useRouter();
  const nextPath=()=>{
    const requested=new URLSearchParams(window.location.search).get('next')||'/';
    return requested.startsWith('/')&&!requested.startsWith('//')?requested:'/';
  };
  const [method,setMethod]=useState<Method>('email');
  const [email,setEmail]=useState('');
  const [countryCode,setCountryCode]=useState('+82');
  const [phone,setPhone]=useState('');
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [terms,setTerms]=useState(false);
  const [otp,setOtp]=useState('');
  const [otpPending,setOtpPending]=useState(false);
  const [phoneVerified,setPhoneVerified]=useState(false);
  const [otpBusy,setOtpBusy]=useState(false);
  const [resendIn,setResendIn]=useState(0);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');

  useEffect(()=>{
    if(resendIn<=0)return;
    const id=setInterval(()=>setResendIn(v=>Math.max(0,v-1)),1000);
    return()=>clearInterval(id);
  },[resendIn]);

  const cleanEmail=()=>email.trim().toLowerCase();
  const fullPhone=()=>normalizePhoneE164(countryCode,phone);

  function validateSignupBasics(){
    if(!cleanEmail()){setError('이메일을 입력해주세요.');return false}
    if(!fullPhone()||fullPhone().length<8){setError('휴대폰 번호를 확인해주세요.');return false}
    if(password.length<8){setError('비밀번호는 8자 이상 입력해주세요.');return false}
    if(password!==confirm){setError('비밀번호 확인이 일치하지 않습니다.');return false}
    if(!terms){setError('이용약관 및 개인정보 처리방침에 동의해주세요.');return false}
    return true;
  }

  async function sendPhoneOtp(){
    setError('');setMessage('');
    if(!validateSignupBasics())return;
    const target=fullPhone();
    const attempts=readOtpAttempts(target);
    const now=Date.now();
    const latest=attempts.at(-1)||0;
    const remaining=Math.ceil((OTP_COOLDOWN_SECONDS*1000-(now-latest))/1000);
    if(remaining>0){setResendIn(remaining);setError(`${remaining}초 후 인증번호를 다시 요청할 수 있습니다.`);return}
    if(attempts.length>=OTP_MAX_PER_HOUR){setError('같은 휴대폰 번호로 인증번호를 너무 많이 요청했습니다. 1시간 후 다시 시도해주세요.');return}

    setOtpBusy(true);
    try{
      const response=otpPending
        ?await supabase.auth.resend({type:'sms',phone:target})
        :await supabase.auth.signUp({
            phone:target,
            password,
            options:{channel:'sms',data:{signup_email:cleanEmail()}}
          });
      if(response.error)throw response.error;
      const nextAttempts=[...attempts,now];
      localStorage.setItem(rateKey(target),JSON.stringify(nextAttempts));
      setOtpPending(true);
      setPhoneVerified(false);
      setOtp('');
      setResendIn(OTP_COOLDOWN_SECONDS);
      setMessage('휴대폰으로 6자리 인증번호를 전송했습니다.');
    }catch(err){
      const text=err instanceof Error?err.message:'인증번호 발송 중 오류가 발생했습니다.';
      setError(authMessage(text));
    }finally{setOtpBusy(false)}
  }

  async function verifyPhone(){
    setError('');setMessage('');
    const target=fullPhone();
    const code=otp.replace(/\D/g,'');
    if(code.length!==6){setError('6자리 인증번호를 입력해주세요.');return}
    setOtpBusy(true);
    try{
      const {data,error}=await supabase.auth.verifyOtp({phone:target,token:code,type:'sms'});
      if(error)throw error;
      if(!data.user?.phone_confirmed_at){throw new Error('휴대폰 인증 상태를 확인하지 못했습니다. 다시 시도해주세요.')}
      setPhoneVerified(true);
      setMessage('휴대폰 인증이 완료되었습니다. 회원가입 완료 버튼을 눌러주세요.');
    }catch(err){
      const text=err instanceof Error?err.message:'휴대폰 인증 중 오류가 발생했습니다.';
      setError(authMessage(text));
    }finally{setOtpBusy(false)}
  }

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    setError('');setMessage('');

    if(mode==='signup'){
      if(!validateSignupBasics())return;
      if(!phoneVerified){setError('휴대폰 인증을 먼저 완료해주세요.');return}
      setBusy(true);
      try{
        const target=fullPhone();
        const {data:{user}}=await supabase.auth.getUser();
        if(!user||user.phone!==target||!user.phone_confirmed_at)throw new Error('휴대폰 인증 세션을 확인하지 못했습니다. 인증번호를 다시 확인해주세요.');

        const {data,error}=await supabase.auth.updateUser({
          email:cleanEmail(),
          password,
          data:{phone_e164:target}
        });
        if(error)throw error;

        const emailConfirmed=!!data.user?.email_confirmed_at;
        if(emailConfirmed){
          router.push(nextPath());router.refresh();
        }else{
          await supabase.auth.signOut();
          setMessage('휴대폰 인증이 완료되었습니다. 가입 확인 이메일을 전송했습니다. 이메일 인증 후 로그인해주세요.');
        }
      }catch(err){
        const text=err instanceof Error?err.message:'회원가입 처리 중 오류가 발생했습니다.';
        setError(authMessage(text));
      }finally{setBusy(false)}
      return;
    }

    if(password.length<8){setError('비밀번호는 8자 이상 입력해주세요.');return;}
    setBusy(true);
    try{
      if(method==='email'){
        const value=cleanEmail();
        if(!value){setError('이메일을 입력해주세요.');return;}
        const {error}=await supabase.auth.signInWithPassword({email:value,password});
        if(error)throw error;
      }else{
        const target=fullPhone();
        if(target.length<8){setError('휴대폰 번호를 확인해주세요.');return;}
        const {error}=await supabase.auth.signInWithPassword({phone:target,password});
        if(error)throw error;
      }
      router.push(nextPath());router.refresh();
    }catch(err){
      const text=err instanceof Error?err.message:'인증 처리 중 오류가 발생했습니다.';
      setError(authMessage(text));
    }finally{setBusy(false)}
  }

  const signup=mode==='signup';
  return <main className={s.page}>
    <section className={s.card}>
      <Link href="/" className={s.brand}><span>B</span><b>BITMATE</b></Link>
      <div className={s.heading}><h1>{signup?'회원 가입':'로그인'}</h1><p>{signup?'이메일과 휴대폰 인증을 완료하고 BITMATE 계정을 만드세요.':'BITMATE 계정에 로그인하세요.'}</p></div>

      {!signup&&<div className={s.methodTabs} role="tablist">
        <button type="button" className={method==='email'?s.active:''} onClick={()=>{setMethod('email');setError('');setMessage('')}}>이메일</button>
        <button type="button" className={method==='phone'?s.active:''} onClick={()=>{setMethod('phone');setError('');setMessage('')}}>휴대폰</button>
      </div>}

      <form onSubmit={submit} className={s.form}>
        {(signup||method==='email')&&<label><span>이메일</span><input type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={e=>setEmail(e.target.value)} required/></label>}

        {(signup||method==='phone')&&<label><span>휴대폰 번호</span>
          <div className={signup?s.phoneVerifyRow:s.phoneRow}>
            <select value={countryCode} onChange={e=>{setCountryCode(e.target.value);setOtpPending(false);setPhoneVerified(false);setOtp('')}}>{countryCodes.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select>
            <input type="tel" inputMode={signup?'numeric':'tel'} autoComplete="tel" placeholder="010-1234-5678" value={phone} onChange={e=>{setPhone(countryCode==='+82'?formatKoreanPhoneInput(e.target.value):e.target.value);setOtpPending(false);setPhoneVerified(false);setOtp('')}} required/>
            {signup&&<button className={s.sendOtp} type="button" onClick={sendPhoneOtp} disabled={otpBusy||resendIn>0||phoneVerified}>{otpBusy?'발송 중':phoneVerified?'인증 완료':resendIn>0?`${resendIn}초`:otpPending?'재전송':'인증번호 받기'}</button>}
          </div>
          {signup&&<small className={s.phoneHint}>입력한 번호는 전송 전에 {fullPhone()||'+821012345678'} 형식으로 변환됩니다.</small>}
        </label>}

        <label><span>비밀번호</span><input type="password" autoComplete={signup?'new-password':'current-password'} placeholder="8자 이상 입력" value={password} onChange={e=>{setPassword(e.target.value);if(signup){setOtpPending(false);setPhoneVerified(false);setOtp('')}}} required/></label>
        {signup&&<label><span>비밀번호 확인</span><input type="password" autoComplete="new-password" placeholder="비밀번호 다시 입력" value={confirm} onChange={e=>setConfirm(e.target.value)} required/></label>}

        {signup&&otpPending&&<div className={s.otpBox}>
          <label><span>SMS 인증번호</span><input maxLength={6} inputMode="numeric" autoComplete="one-time-code" placeholder="6자리 인증번호" value={otp} disabled={phoneVerified} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))}/></label>
          <button type="button" onClick={verifyPhone} disabled={otpBusy||phoneVerified}>{phoneVerified?'휴대폰 인증 완료':otpBusy?'확인 중...':'인증번호 확인'}</button>
        </div>}

        {signup&&<label className={s.check}><input type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)}/><span>BITMATE 이용약관 및 개인정보 처리방침에 동의합니다.</span></label>}
        {error&&<div className={s.error}>{error}</div>}
        {message&&<div className={s.success}>{message}</div>}
        <button className={s.primary} type="submit" disabled={busy||(signup&&!phoneVerified)}>{busy?'처리 중...':signup?'회원가입 완료':'로그인'}</button>
      </form>

      <div className={s.switch}>{signup?<>이미 계정이 있나요? <Link href="/login">로그인</Link></>:<>BITMATE가 처음이신가요? <Link href="/signup">회원 가입</Link></>}</div>
    </section>
  </main>;
}
