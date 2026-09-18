'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import UiIcon from './UiIcon';
import s from './AdminOperations.module.css';

type Balance={asset:string;available:number;locked:number};
type UserRow={id:string;email:string|null;phone:string|null;created_at:string;last_sign_in_at:string|null;role:string|null;display_name:string|null;vip_level:string|null;kyc_status:string;balances:Balance[]};
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
  const display=prompt('표시 이름',u.display_name||'')?.trim(); if(display===undefined)return;
  const vip=prompt('VIP 등급',u.vip_level||'BASIC')?.trim(); if(vip===undefined)return;
  await run('admin_update_profile',{p_user_id:u.id,p_display_name:display,p_vip_level:vip},'회원 프로필이 변경되었습니다.');
 }
 async function adjust(u:UserRow){
  const asset=(prompt('조정할 DEMO 자산','USDT')||'').trim().toUpperCase();if(!asset)return;
  const amount=Number(prompt('증가/차감 금액을 입력하세요. 차감은 음수입니다.','0'));if(!Number.isFinite(amount)||amount===0)return alert('0이 아닌 숫자를 입력하세요.');
  const reason=(prompt('조정 사유를 입력하세요.','관리자 잔액 조정')||'').trim();if(reason.length<3)return alert('사유를 3자 이상 입력하세요.');
  if(!confirm(`${u.email||u.id} · ${asset} · ${amount>0?'+':''}${amount}\n이 조정을 실행할까요?`))return;
  await run('admin_adjust_demo_balance',{p_user_id:u.id,p_asset:asset,p_amount:amount,p_reason:reason},'DEMO 잔액이 조정되고 원장에 기록되었습니다.');
 }
 const updateKyc=(r:KycRow,status:string)=>run('admin_update_kyc',{p_request_id:r.id,p_status:status},`KYC 상태가 ${status}로 변경되었습니다.`);
 const updateDeletion=(r:DeletionRow,status:string)=>run('admin_update_deletion',{p_request_id:r.id,p_status:status},`삭제 요청 상태가 ${status}로 변경되었습니다.`);
 async function toggleSetting(key:string,current:boolean){
  await run('admin_set_system_setting',{p_key:key,p_value:!current},`${key} 설정이 변경되었습니다.`);
 }

 if(allowed===null)return <main className={s.page}><div className={s.gate}>관리자 권한 확인 중...</div></main>;
 if(!allowed)return <main className={s.page}><div className={s.gate}><h1>관리자 권한이 필요합니다.</h1><Link href="/">홈으로</Link></div></main>;

 const systemKeys=['SPOT_REAL_ENABLED','AI_REAL_ENABLED','QUICK_TRADE_REAL_ENABLED','WITHDRAW_ENABLED'];

 return <main className={s.page}><div className={s.shell}>
  <header className={s.hero}><div><span>BITMATE ADMIN</span><h1>회원 · 자산 · 운영 관리</h1><p>회원 프로필, KYC, 계정 삭제 요청, DEMO 원장 조정과 시스템 운영 스위치를 한 곳에서 관리합니다. 모든 민감 변경은 관리자 로그에 남습니다.</p></div><div className={s.heroActions}><Link href="/admin">관리자 홈</Link><Link href="/account">사용자 자산화면</Link></div></header>
  <section className={s.stats}>
   <div><span>전체 회원</span><b>{data.stats?.users||0}</b></div>
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
   <div className={s.panelHead}><div><h2>회원 관리</h2><p>이메일·UID·닉네임 검색, 프로필/VIP 변경, DEMO 잔액 조정</p></div><div className={s.search}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="이메일 / UID / 닉네임"/><button onClick={()=>load(query)}>검색</button></div></div>
   <div className={s.table}>
    <div className={s.th}><span>회원</span><span>상태</span><span>DEMO 자산</span><span>최근 로그인</span><span>관리</span></div>
    {data.users.map(u=><div className={s.tr} key={u.id}>
     <span><b>{u.display_name||'이름 없음'}</b><small>{u.email||'—'}</small><em>{u.id.slice(0,8)}…</em></span>
     <span><b>{u.vip_level||'BASIC'}</b><small>KYC {u.kyc_status}</small>{u.role&&<em>{u.role}</em>}</span>
     <span className={s.balanceList}>{u.balances?.length?u.balances.map(b=><small key={b.asset}><b>{b.asset}</b> {Number(b.available||0).toLocaleString()}</small>):<small>잔액 없음</small>}</span>
     <span><small>{u.last_sign_in_at?new Date(u.last_sign_in_at).toLocaleString():'—'}</small><em>가입 {new Date(u.created_at).toLocaleDateString()}</em></span>
     <span className={s.rowActions}><button onClick={()=>editProfile(u)}>프로필</button><button className={s.primary} onClick={()=>adjust(u)}>잔액 조정</button></span>
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
   <div className={s.panelHead}><div><h2>System Switches</h2><p>실거래/출금 관련 운영 플래그를 관리합니다. 실제 엔진이 해당 setting을 읽도록 연결된 기능에만 즉시 적용됩니다.</p></div></div>
   <div className={s.settings}>
    {systemKeys.map(key=>{const current=boolValue(data.settings?.[key]);return <div className={s.setting} key={key}><div><b>{key}</b><p>{key==='WITHDRAW_ENABLED'?'출금 기능 운영 스위치':key==='AI_REAL_ENABLED'?'AI 실제 운용 스위치':key==='SPOT_REAL_ENABLED'?'Spot 실거래 스위치':'Quick Trade 실거래 스위치'}</p></div><button className={current?s.switchOn:s.switchOff} onClick={()=>toggleSetting(key,current)} disabled={busy}>{current?'ENABLED':'DISABLED'}</button></div>})}
   </div>
  </section>}

  {msg&&<div className={s.toast} onClick={()=>setMsg('')}>{msg}</div>}
 </div></main>
}
