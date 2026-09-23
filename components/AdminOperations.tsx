'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import UiIcon from './UiIcon';
import {siteAlert,siteConfirm,sitePrompt} from './SiteDialog';
import s from './AdminOperations.module.css';

type Balance={asset:string;available:number;locked:number};
type UserRow={id:string;email:string|null;phone:string|null;created_at:string;last_sign_in_at:string|null;role:string|null;display_name:string|null;vip_level:string|null;kyc_status:string;frozen:boolean;banned_until:string|null;balances:Balance[]};
type KycRow={id:string;user_id:string;email:string|null;country:string;full_name:string;status:string;submitted_at:string;reviewed_at:string|null};
type DeletionRow={id:string;user_id:string;email:string|null;reason:string|null;status:string;created_at:string;updated_at:string};
type Snapshot={users:UserRow[];kyc:KycRow[];deletions:DeletionRow[];settings:Record<string,unknown>;stats:Record<string,number>};
type Tab='members'|'kyc'|'requests'|'system';

const boolValue=(v:unknown)=>v===true||v==='true';

export default function AdminOperations(){
 const supabase=useMemo(()=>createBrowserSupabase(),[]);
 const [allowed,setAllowed]=useState<boolean|null>(null);
 const [tab,setTab]=useState<Tab>('members');
 const [query,setQuery]=useState('');
 const [data,setData]=useState<Snapshot>({users:[],kyc:[],deletions:[],settings:{},stats:{}});
 const [busy,setBusy]=useState(false);
 const [msg,setMsg]=useState('');

 async function load(q=query){
  const {data:{user}}=await supabase.auth.getUser();
  const role=String(user?.app_metadata?.role||'').toLowerCase();
  const ok=role==='admin'||role==='superadmin'||user?.app_metadata?.superadmin===true;
  setAllowed(ok); if(!ok)return;
  const {data:snap,error}=await supabase.rpc('admin_ops_snapshot',{p_query:q.trim()});
  if(error){setMsg(error.message);return}
  setData((snap||{}) as Snapshot);
 }
 useEffect(()=>{load('')},[]);

 async function run(name:string,args:Record<string,unknown>,success:string){
  setBusy(true);setMsg('');
  const {error}=await supabase.rpc(name,args);
  setBusy(false);
  if(error){setMsg(error.message);return false}
  setMsg(success);await load();return true;
 }

 async function editProfile(u:UserRow){
  const display=(await sitePrompt('표시 이름',u.display_name||'',{title:'회원 정보 수정'}))?.trim(); if(display===undefined||display===null)return;
  const vip=(await sitePrompt('VIP 등급',u.vip_level||'BASIC',{title:'회원 정보 수정'}))?.trim(); if(vip===undefined||vip===null)return;
  await run('admin_update_profile',{p_user_id:u.id,p_display_name:display,p_vip_level:vip},'회원 프로필이 변경되었습니다.');
 }
 function makeTemporaryPassword(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes=new Uint32Array(14);
  crypto.getRandomValues(bytes);
  return Array.from(bytes,x=>chars[x%chars.length]).join('');
 }
 async function toggleFreeze(u:UserRow){
  const freezing=!u.frozen;
  const reason=freezing?(await sitePrompt('계정 동결 사유를 입력하세요.','관리자 계정 동결',{title:'회원 계정 동결'}))?.trim():'관리자 동결 해제';
  if(freezing&&!reason)return;
  const ok=await siteConfirm(
    freezing
      ?`${u.email||u.id}\n계정을 동결하면 현재 로그인 세션이 종료되고 로그인할 수 없습니다.\n동결할까요?`
      :`${u.email||u.id}\n계정 동결을 해제할까요?`,
    {title:freezing?'회원 계정 동결':'회원 계정 동결 해제'}
  );
  if(!ok)return;
  await run('admin_set_user_frozen',{p_user_id:u.id,p_frozen:freezing,p_reason:reason||null},freezing?'회원 계정이 동결되었습니다.':'회원 계정 동결이 해제되었습니다.');
 }
 async function resetPassword(u:UserRow){
  const temporary=makeTemporaryPassword();
  const ok=await siteConfirm(
    `${u.email||u.id}\n임시 비밀번호로 초기화하면 현재 로그인 세션이 모두 종료됩니다.\n비밀번호를 초기화할까요?`,
    {title:'회원 비밀번호 초기화'}
  );
  if(!ok)return;
  setBusy(true);setMsg('');
  const {error}=await supabase.rpc('admin_reset_user_password',{p_user_id:u.id,p_temporary_password:temporary});
  setBusy(false);
  if(error){setMsg(error.message);return}
  await load();
  await siteAlert(`비밀번호가 초기화되었습니다.\n\n임시 비밀번호\n${temporary}\n\n이 비밀번호는 관리자 화면에 다시 표시되지 않습니다.`,{title:'비밀번호 초기화 완료'});
 }
 async function adjust(u:UserRow){
  const asset=((await sitePrompt('조정할 자산','USDT',{title:'잔액 조정'}))||'').trim().toUpperCase();if(!asset)return;
  const amount=Number(await sitePrompt('증가/차감 금액을 입력하세요. 차감은 음수입니다.','0',{title:'잔액 조정',inputType:'number'}));if(!Number.isFinite(amount)||amount===0){await siteAlert('0이 아닌 숫자를 입력하세요.');return}
  const reason=((await sitePrompt('조정 사유를 입력하세요.','관리자 잔액 조정',{title:'잔액 조정 사유'}))||'').trim();if(reason.length<3){await siteAlert('사유를 3자 이상 입력하세요.');return}
  if(!(await siteConfirm(`${u.email||u.id} · ${asset} · ${amount>0?'+':''}${amount}\n이 조정을 실행할까요?`,{title:'잔액 조정 확인'})))return;
  await run('admin_adjust_demo_balance',{p_user_id:u.id,p_asset:asset,p_amount:amount,p_reason:reason},'DEMO 잔액이 조정되고 원장에 기록되었습니다.');
 }
 const updateKyc=(r:KycRow,status:string)=>run('admin_update_kyc',{p_request_id:r.id,p_status:status},`KYC 상태가 ${status}로 변경되었습니다.`);
 const updateDeletion=(r:DeletionRow,status:string)=>run('admin_update_deletion',{p_request_id:r.id,p_status:status},`삭제 요청 상태가 ${status}로 변경되었습니다.`);
 async function toggleSetting(key:string,current:boolean){
  await run('admin_set_system_setting',{p_key:key,p_value:!current},`${key} 설정이 변경되었습니다.`);
 }

 if(allowed===null)return <main className={s.page}><div className={s.gate}>관리자 권한 확인 중...</div></main>;
 if(!allowed)return <main className={s.page}><div className={s.gate}><h1>관리자 권한이 필요합니다.</h1><Link href="/">홈으로</Link></div></main>;

 const systemKeys=['VIRTUAL_TRADING_ENABLED','SPOT_VIRTUAL_ENABLED','FUTURES_VIRTUAL_ENABLED','CFD_VIRTUAL_ENABLED','AI_VIRTUAL_ENABLED','COPY_VIRTUAL_ENABLED','WITHDRAW_ENABLED'];

 return <main className={s.page}><div className={s.shell}>
  <header className={s.hero}><div><span>BITMATE ADMIN</span><h1>회원 · 자산 · 운영 관리</h1><p>회원 프로필, KYC, 계정 삭제 요청, DEMO 원장 조정과 시스템 운영 스위치를 한 곳에서 관리합니다. 모든 민감 변경은 관리자 로그에 남습니다.</p></div><div className={s.heroActions}><Link href="/admin">관리자 홈</Link><Link href="/account">사용자 자산화면</Link></div></header>
  <section className={s.stats}>
   <div><span>전체 회원</span><b>{data.stats?.users||0}</b></div>
   <div><span>동결 회원</span><b>{data.stats?.frozen_users||0}</b></div>
   <div><span>KYC 대기</span><b>{data.stats?.kyc_pending||0}</b></div>
   <div><span>삭제 요청 대기</span><b>{data.stats?.deletion_pending||0}</b></div>
   <div><span>활성 API</span><b>{data.stats?.api_active||0}</b></div>
   <div><span>Sub-account</span><b>{data.stats?.sub_accounts||0}</b></div>
  </section>

  <nav className={s.tabs}>
   <button className={tab==='members'?s.active:''} onClick={()=>setTab('members')}><UiIcon name="user" size={17}/> 회원 관리</button>
   <button className={tab==='kyc'?s.active:''} onClick={()=>setTab('kyc')}><UiIcon name="verification" size={17}/> KYC</button>
   <button className={tab==='requests'?s.active:''} onClick={()=>setTab('requests')}><UiIcon name="order" size={17}/> 요청 관리</button>
   <button className={tab==='system'?s.active:''} onClick={()=>setTab('system')}><UiIcon name="settings" size={17}/> 시스템 설정</button>
  </nav>

  {tab==='members'&&<section className={s.panel}>
   <div className={s.panelHead}><div><h2>회원 관리</h2><p>이메일·UID·닉네임 검색, 프로필/VIP 변경, 통합 잔액 조정, 계정 동결 및 비밀번호 초기화</p></div><div className={s.search}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="이메일 / UID / 닉네임"/><button onClick={()=>load(query)}>검색</button></div></div>
   <div className={s.table}>
    <div className={s.th}><span>회원</span><span>상태</span><span>DEMO 자산</span><span>최근 로그인</span><span>관리</span></div>
    {data.users.map(u=><div className={s.tr} key={u.id}>
     <span><b>{u.display_name||'이름 없음'}</b><small>{u.email||'—'}</small><em>{u.id.slice(0,8)}…</em></span>
     <span><b>{u.frozen?'FROZEN':(u.vip_level||'BASIC')}</b><small>KYC {u.kyc_status}</small>{u.frozen&&<em>계정 동결</em>}{!u.frozen&&u.role&&<em>{u.role}</em>}</span>
     <span className={s.balanceList}>{u.balances?.length?u.balances.map(b=><small key={b.asset}><b>{b.asset}</b> {Number(b.available||0).toLocaleString()}</small>):<small>잔액 없음</small>}</span>
     <span><small>{u.last_sign_in_at?new Date(u.last_sign_in_at).toLocaleString():'—'}</small><em>가입 {new Date(u.created_at).toLocaleDateString()}</em></span>
     <span className={s.rowActions}><button onClick={()=>editProfile(u)}>프로필</button><button className={s.primary} onClick={()=>adjust(u)}>잔액 조정</button><button disabled={busy} onClick={()=>resetPassword(u)}>비밀번호 초기화</button><button disabled={busy} className={u.frozen?s.unfreeze:s.freeze} onClick={()=>toggleFreeze(u)}>{u.frozen?'동결 해제':'계정 동결'}</button></span>
    </div>)}
   </div>
  </section>}

  {tab==='kyc'&&<section className={s.panel}>
   <div className={s.panelHead}><div><h2>Identity Verification</h2><p>사용자가 제출한 KYC 신청을 검토하고 승인/거절합니다.</p></div></div>
   <div className={s.table}><div className={s.thKyc}><span>회원</span><span>신청 정보</span><span>상태</span><span>신청일</span><span>처리</span></div>
   {data.kyc.length?data.kyc.map(r=><div className={s.trKyc} key={r.id}><span><b>{r.email||'—'}</b><small>{r.user_id.slice(0,8)}…</small></span><span><b>{r.full_name}</b><small>{r.country}</small></span><span><b className={r.status==='APPROVED'?s.good:r.status==='REJECTED'?s.bad:s.warn}>{r.status}</b></span><span><small>{new Date(r.submitted_at).toLocaleString()}</small></span><span className={s.rowActions}><button disabled={busy} onClick={()=>updateKyc(r,'APPROVED')}>승인</button><button disabled={busy} onClick={()=>updateKyc(r,'REJECTED')}>거절</button><button disabled={busy} onClick={()=>updateKyc(r,'PENDING')}>대기</button></span></div>):<div className={s.empty}>KYC 신청이 없습니다.</div>}
   </div>
  </section>}

  {tab==='requests'&&<section className={s.panel}>
   <div className={s.panelHead}><div><h2>계정 요청 관리</h2><p>계정 삭제 요청의 검토 상태를 관리합니다. 승인 상태 변경만 수행하며 실제 Auth 계정 삭제는 별도 보안 절차로 분리합니다.</p></div></div>
   <div className={s.table}><div className={s.thReq}><span>회원</span><span>사유</span><span>상태</span><span>요청일</span><span>처리</span></div>
   {data.deletions.length?data.deletions.map(r=><div className={s.trReq} key={r.id}><span><b>{r.email||'—'}</b><small>{r.user_id.slice(0,8)}…</small></span><span><small>{r.reason||'사유 없음'}</small></span><span><b>{r.status}</b></span><span><small>{new Date(r.created_at).toLocaleString()}</small></span><span className={s.rowActions}><button onClick={()=>updateDeletion(r,'APPROVED')}>승인</button><button onClick={()=>updateDeletion(r,'REJECTED')}>거절</button><button onClick={()=>updateDeletion(r,'PENDING')}>대기</button></span></div>):<div className={s.empty}>계정 요청이 없습니다.</div>}
   </div>
  </section>}

  {tab==='system'&&<section className={s.panel}>
   <div className={s.panelHead}><div><h2>System Switches</h2><p>BITMATE 내부 체결 엔진과 출금 운영 플래그를 관리합니다. 외부 거래소 실주문 스위치는 별도로 비활성 상태를 유지합니다.</p></div></div>
   <div className={s.settings}>
    {systemKeys.map(key=>{const current=boolValue(data.settings?.[key]);return <div className={s.setting} key={key}><div><b>{key}</b><p>{key==='WITHDRAW_ENABLED'?'출금 기능 운영 스위치':key==='VIRTUAL_TRADING_ENABLED'?'전체 내부 체결 마스터 스위치':key==='SPOT_VIRTUAL_ENABLED'?'Spot 내부 체결':key==='FUTURES_VIRTUAL_ENABLED'?'Futures 내부 체결':key==='CFD_VIRTUAL_ENABLED'?'CFD 내부 체결':key==='AI_VIRTUAL_ENABLED'?'AI 내부 운용':key==='COPY_VIRTUAL_ENABLED'?'Copy Trading 내부 운용':'내부 체결 스위치'}</p></div><button className={current?s.switchOn:s.switchOff} onClick={()=>toggleSetting(key,current)} disabled={busy}>{current?'ENABLED':'DISABLED'}</button></div>})}
   </div>
  </section>}

  {msg&&<div className={s.toast} onClick={()=>setMsg('')}>{msg}</div>}
 </div></main>
}
