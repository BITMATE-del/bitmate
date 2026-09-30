'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
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
  if(m.includes('phone provider is disabled'))return '현재 휴대폰 인증이 비활성화되어 있습니다. 운영자에게 문의해주세요.';
  if(m.includes('email rate limit'))return '이메일 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  if((m.includes('sms')||m.includes('otp'))&&(m.includes('rate')||m.includes('limit')))return '인증번호 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  if(m.includes('token has expired')||m.includes('otp_expired'))return '인증번호가 만료되었습니다. 새 인증번호를 받아주세요.';
  if(m.includes('invalid')&&m.includes('token'))return '인증번호가 올바르지 않습니다.';
  return message;
}

export default function AuthPortal({mode}:Props){
  const supabase=useMemo(()=>createBrowserSupabase(),[]);
  const router=useRouter();
  const nextPath=()=>{
    const requested=new URLSearchParams(window.location.search).get('next')||'/';
    return requested.startsWith('/')&&!requested.startsWith('//')?requested:'/';
  };

  const signup=mode==='signup';
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
  const [cooldown,setCooldown]=useState(0);
  const [busy,setBusy]=useState(false);
  const [sendingOtp,setSendingOtp]=useState(false);
  const [verifyingOtp,setVerifyingOtp]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');

  useEffect(()=>{
    if(cooldown<=0)return;
    const id=setInterval(()=>setCooldown(v=>Math.max(0,v-1)),1000);
    return()=>clearInterval(id);
  },[cooldown]);

  const resetPhoneVerification=()=>{
    setOtp('');
    setOtpPending(false);
    setPhoneVerified(false);
  };

  const validateSignupBase=()=>{
    const cleanEmail=email.trim().toLowerCase();
    const fullPhone=normalizePhone(countryCode,phone);
    if(!cleanEmail){setError('이메일을 입력해주세요.');return null}
    if(fullPhone.length<8){setError('휴대폰 번호를 확인해주세요.');return null}
    if(password.length<8){setError('비밀번호는 8자 이상 입력해주세요.');return null}
    if(password!==confirm){setError('비밀번호 확인이 일치하지 않습니다.');return null}
    if(!terms){setError('이용약관 및 개인정보 처리방침에 동의해주세요.');return null}
    return {cleanEmail,fullPhone};
  };

  async function sendSignupOtp(){
    setError('');setMessage('');
    const valid=validateSignupBase();
    if(!valid||sendingOtp||cooldown>0)return;
    setSendingOtp(true);
    try{
      const {error}=await supabase.auth.signInWithOtp({
        phone:valid.fullPhone,
        options:{shouldCreateUser:true}
      });
      if(error)throw error;
      setOtpPending(true);
      setPhoneVerified(false);
      setCooldown(60);
      setMessage('BITMATE 휴대폰 인증번호를 전송했습니다. 6자리 인증번호를 입력해주세요.');
    }catch(err){
      const text=err instanceof Error?err.message:'인증번호 발송 중 오류가 발생했습니다.';
      setError(authMessage(text));
    }finally{
      setSendingOtp(false);
    }
  }

  async function verifySignupOtp(){
    setError('');setMessage('');
    const valid=validateSignupBase();
    const code=otp.replace(/\D/g,'');
    if(!valid)return;
    if(code.length!==6){setError('6자리 인증번호를 입력해주세요.');return;}
    if(verifyingOtp)return;

    setVerifyingOtp(true);
    try{
      const {data,error}=await supabase.auth.verifyOtp({
        phone:valid.fullPhone,
        token:code,
        type:'sms'
      });
      if(error)throw error;
      if(!data.user||!data.session)throw new Error('휴대폰 인증 세션을 만들 수 없습니다.');

      // Existing fully registered account: never overwrite another account's email/password.
      if(data.user.email&&data.user.email.toLowerCase()!==valid.cleanEmail){
        await supabase.auth.signOut();
        throw new Error('이미 가입된 휴대폰 번호입니다. 기존 계정으로 로그인해주세요.');
      }

      const {data:updateData,error:updateError}=await supabase.auth.updateUser({
        email:valid.cleanEmail,
        password
      });
      if(updateError)throw updateError;

      setPhoneVerified(true);
      setOtpPending(false);

      const confirmedEmail=Boolean(updateData.user?.email_confirmed_at);
      if(confirmedEmail){
        setMessage('휴대폰 인증과 회원가입이 완료되었습니다.');
        router.push(nextPath());
        router.refresh();
      }else{
        // Keep the phone verification on the same Supabase Auth user, but require email confirmation
        // before treating the signup flow as fully complete in the UI.
        await supabase.auth.signOut();
        setMessage('휴대폰 인증이 완료되었습니다. 가입 확인 이메일을 전송했습니다. 이메일 인증 후 로그인해주세요.');
      }
    }catch(err){
      const text=err instanceof Error?err.message:'휴대폰 인증 처리 중 오류가 발생했습니다.';
      setError(authMessage(text));
    }finally{
      setVerifyingOtp(false);
    }
  }

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    setError('');setMessage('');

    if(signup){
      const valid=validateSignupBase();
      if(!valid)return;
      if(!phoneVerified){
        setError(otpPending?'휴대폰 인증번호 확인을 완료해주세요.':'먼저 휴대폰 인증번호를 받아 인증을 완료해주세요.');
        return;
      }
      return;
    }

    if(password.length<8){setError('비밀번호는 8자 이상 입력해주세요.');return;}
    setBusy(true);
    try{
      if(method==='email'){
        const cleanEmail=email.trim().toLowerCase();
        if(!cleanEmail){setError('이메일을 입력해주세요.');return;}
        const {error}=await supabase.auth.signInWithPassword({email:cleanEmail,password});
        if(error)throw error;
      }else{
        const fullPhone=normalizePhone(countryCode,phone);
        if(fullPhone.length<8){setError('휴대폰 번호를 확인해주세요.');return;}
        const {error}=await supabase.auth.signInWithPassword({phone:fullPhone,password});
        if(error)throw error;
      }
      router.push(nextPath());
      router.refresh();
    }catch(err){
      const text=err instanceof Error?err.message:'인증 처리 중 오류가 발생했습니다.';
      setError(authMessage(text));
    }finally{
      setBusy(false);
    }
  }

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

        {(signup||method==='phone')&&<label>
          <span>휴대폰 번호 {signup&&<em className={phoneVerified?s.verifiedBadge:s.requiredBadge}>{phoneVerified?'인증 완료':'인증 필요'}</em>}</span>
          <div className={s.phoneVerifyRow}>
            <div className={s.phoneRow}>
              <select value={countryCode} onChange={e=>{setCountryCode(e.target.value);resetPhoneVerification()}} disabled={phoneVerified}>{countryCodes.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select>
              <input type="tel" inputMode="numeric" autoComplete="tel" placeholder="010-1234-5678" value={phone} onChange={e=>{setPhone(e.target.value);resetPhoneVerification()}} required disabled={phoneVerified}/>
            </div>
            {signup&&<button className={s.sendOtp} type="button" onClick={sendSignupOtp} disabled={sendingOtp||phoneVerified||cooldown>0}>
              {phoneVerified?'인증 완료':sendingOtp?'발송 중...':cooldown>0?`재전송 ${cooldown}초`:'인증번호 받기'}
            </button>}
          </div>
          {signup&&<small className={s.phoneHint}>한국 번호는 010-1234-5678 형식으로 입력하면 +821012345678 형태로 변환되어 전송됩니다.</small>}
        </label>}

        <label><span>비밀번호</span><input type="password" autoComplete={signup?'new-password':'current-password'} placeholder="8자 이상 입력" value={password} onChange={e=>{setPassword(e.target.value);if(signup&&phoneVerified)setPhoneVerified(false)}} required/></label>
        {signup&&<label><span>비밀번호 확인</span><input type="password" autoComplete="new-password" placeholder="비밀번호 다시 입력" value={confirm} onChange={e=>{setConfirm(e.target.value);if(phoneVerified)setPhoneVerified(false)}} required/></label>}

        {signup&&otpPending&&!phoneVerified&&<div className={s.otpBox}>
          <label><span>SMS 인증번호</span><input maxLength={6} inputMode="numeric" autoComplete="one-time-code" placeholder="6자리 인증번호" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}/></label>
          <button type="button" onClick={verifySignupOtp} disabled={verifyingOtp||otp.length!==6}>{verifyingOtp?'확인 중...':'인증번호 확인'}</button>
        </div>}

        {signup&&<label className={s.check}><input type="checkbox" checked={terms} onChange={e=>{setTerms(e.target.checked);if(phoneVerified)setPhoneVerified(false)}}/><span>BITMATE 이용약관 및 개인정보 처리방침에 동의합니다.</span></label>}
        {error&&<div className={s.error}>{error}</div>}
        {message&&<div className={s.success}>{message}</div>}

        {!signup&&<button className={s.primary} type="submit" disabled={busy}>{busy?'처리 중...':'로그인'}</button>}
        {signup&&!phoneVerified&&<button className={s.primary} type="button" onClick={otpPending?verifySignupOtp:sendSignupOtp} disabled={sendingOtp||verifyingOtp||(otpPending&&otp.length!==6)}>
          {otpPending?(verifyingOtp?'인증 중...':'휴대폰 인증 후 가입 완료'):(sendingOtp?'발송 중...':'휴대폰 인증 시작')}
        </button>}
        {signup&&phoneVerified&&<div className={s.success}>휴대폰 인증이 완료되었습니다.</div>}
      </form>

      <div className={s.switch}>{signup?<>이미 계정이 있나요? <Link href="/login">로그인</Link></>:<>BITMATE가 처음이신가요? <Link href="/signup">회원 가입</Link></>}</div>
    </section>
  </main>;
}
