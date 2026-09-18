'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import UiIcon from './UiIcon';
import s from './AdminMemberServices.module.css';

type ApiRow={id:string;user_id:string;email:string|null;label:string;key_prefix:string;permissions:string[];ip_whitelist:string[];status:string;created_at:string;last_used_at:string|null};
type SubRow={id:string;user_id:string;email:string|null;name:string;status:string;created_at:string};
type CodeRow={id:string;user_id:string;email:string|null;code:string;active:boolean;created_at:string;referrals_total:number;referrals_qualified:number};
type RewardRow={id:string;user_id:string;email:string|null;referred_user_id:string|null;reward_type:string;amount:number;asset:string;status:string;reference_type:string|null;reference_id:string|null;created_at:string;paid_at:string|null};
type LogRow={id:string;admin_user_id:string|null;admin_email:string|null;action:string;target_type:string|null;target_id:string|null;before_value:unknown;after_value:unknown;ip:string|null;created_at:string};
type Snap={api:ApiRow[];subs:SubRow[];codes:CodeRow[];rewards:RewardRow[];logs:LogRow[];stats:Record<string,number>};
type Tab='api'|'subs'|'referral'|'rewards'|'audit';

export default function AdminMemberServices(){
 const supabase=useMemo(()=>createBrowserSupabase(),[]);
 const [allowed,setAllowed]=useState<boolean|null>(null);
 const [tab,setTab]=useState<Tab>('api');
 const [data,setData]=useState<Snap>({api:[],subs:[],codes:[],rewards:[],logs:[],stats:{}});
 const [msg,setMsg]=useState('');
 const [busy,setBusy]=useState(false);

 async function load(){
  const {data:{user}}=await supabase.auth.getUser();
  const role=String(user?.app_metadata?.role||'').toLowerCase();
  const ok=role==='admin'||role==='superadmin'||user?.app_metadata?.superadmin===true;
  setAllowed(ok); if(!ok)return;
  const {data:snap,error}=await supabase.rpc('admin_member_services_snapshot');
  if(error){setMsg(error.message);return}
  setData((snap||{}) as Snap);
 }
 useEffect(()=>{load()},[]);

 async function run(name:string,args:Record<string,unknown>,success:string){
  setBusy(true);setMsg('');
  const {error}=await supabase.rpc(name,args);
  setBusy(false);
  if(error){setMsg(error.message);return}
  setMsg(success);await load();
 }

 if(allowed===null)return <main className={s.page}><div className={s.gate}>관리자 권한 확인 중...</div></main>;
 if(!allowed)return <main className={s.page}><div className={s.gate}><h1>관리자 권한이 필요합니다.</h1><Link href="/">홈으로</Link></div></main>;

 return <main className={s.page}><div className={s.shell}>
  <header className={s.hero}>
   <div><span>BITMATE ADMIN</span><h1>회원 서비스 · 보안 · 리워드 관리</h1><p>API Key, Sub-account, Referral Code, Referral Reward와 관리자 변경 이력을 운영합니다.</p></div>
   <div className={s.heroActions}><Link href="/admin">관리자 홈</Link><Link href="/admin/operations">회원·자산 관리</Link></div>
  </header>

  <section className={s.stats}>
   <div><span>API 전체</span><b>{data.stats?.api_total||0}</b></div>
   <div><span>활성 API</span><b>{data.stats?.api_active||0}</b></div>
   <div><span>Sub-account</span><b>{data.stats?.sub_total||0}</b></div>
   <div><span>Referral Codes</span><b>{data.stats?.referral_codes||0}</b></div>
   <div><span>Reward 대기</span><b>{data.stats?.reward_pending||0}</b></div>
  </section>

  <nav className={s.tabs}>
   <button className={tab==='api'?s.active:''} onClick={()=>setTab('api')}><UiIcon name="api" size={17}/> API Keys</button>
   <button className={tab==='subs'?s.active:''} onClick={()=>setTab('subs')}><UiIcon name="subaccount" size={17}/> Sub-account</button>
   <button className={tab==='referral'?s.active:''} onClick={()=>setTab('referral')}><UiIcon name="referral" size={17}/> Referral</button>
   <button className={tab==='rewards'?s.active:''} onClick={()=>setTab('rewards')}><UiIcon name="voucher" size={17}/> Rewards</button>
   <button className={tab==='audit'?s.active:''} onClick={()=>setTab('audit')}><UiIcon name="history" size={17}/> Audit Log</button>
  </nav>

  {tab==='api'&&<section className={s.panel}>
   <div className={s.panelHead}><div><h2>API Key 관리</h2><p>사용자 API Key의 상태를 활성/중지/폐기합니다. 원문 Secret은 저장하지 않습니다.</p></div></div>
   <div className={s.table}>
    <div className={s.thApi}><span>회원</span><span>API</span><span>권한</span><span>상태</span><span>관리</span></div>
    {data.api.length?data.api.map(r=><div className={s.trApi} key={r.id}>
     <span><b>{r.email||'—'}</b><small>{r.user_id.slice(0,8)}…</small></span>
     <span><b>{r.label}</b><small>{r.key_prefix}…</small><em>{new Date(r.created_at).toLocaleString()}</em></span>
     <span><small>{(r.permissions||[]).join(', ')||'READ'}</small><em>{r.ip_whitelist?.length?r.ip_whitelist.join(', '):'IP 제한 없음'}</em></span>
     <span><b className={r.status==='ACTIVE'?s.good:r.status==='SUSPENDED'?s.warn:s.bad}>{r.status}</b></span>
     <span className={s.actions}><button disabled={busy} onClick={()=>run('admin_set_api_status',{p_id:r.id,p_status:'ACTIVE'},'API가 활성화되었습니다.')}>활성</button><button disabled={busy} onClick={()=>run('admin_set_api_status',{p_id:r.id,p_status:'SUSPENDED'},'API가 일시 중지되었습니다.')}>중지</button><button disabled={busy} onClick={()=>run('admin_set_api_status',{p_id:r.id,p_status:'REVOKED'},'API가 폐기되었습니다.')}>폐기</button></span>
    </div>):<div className={s.empty}>등록된 API Key가 없습니다.</div>}
   </div>
  </section>}

  {tab==='subs'&&<section className={s.panel}>
   <div className={s.panelHead}><div><h2>Sub-account 관리</h2><p>전략/운영 분리용 서브 계정의 사용 상태를 제어합니다.</p></div></div>
   <div className={s.table}><div className={s.thSub}><span>회원</span><span>Sub-account</span><span>상태</span><span>생성일</span><span>관리</span></div>
   {data.subs.length?data.subs.map(r=><div className={s.trSub} key={r.id}><span><b>{r.email||'—'}</b><small>{r.user_id.slice(0,8)}…</small></span><span><b>{r.name}</b></span><span><b>{r.status}</b></span><span><small>{new Date(r.created_at).toLocaleString()}</small></span><span className={s.actions}><button onClick={()=>run('admin_set_subaccount_status',{p_id:r.id,p_status:'ACTIVE'},'Sub-account가 활성화되었습니다.')}>활성</button><button onClick={()=>run('admin_set_subaccount_status',{p_id:r.id,p_status:'SUSPENDED'},'Sub-account가 중지되었습니다.')}>중지</button><button onClick={()=>run('admin_set_subaccount_status',{p_id:r.id,p_status:'CLOSED'},'Sub-account가 종료 처리되었습니다.')}>종료</button></span></div>):<div className={s.empty}>Sub-account가 없습니다.</div>}
   </div>
  </section>}

  {tab==='referral'&&<section className={s.panel}>
   <div className={s.panelHead}><div><h2>Referral Code 관리</h2><p>추천 코드 활성 상태와 추천 실적을 확인합니다.</p></div></div>
   <div className={s.table}><div className={s.thRef}><span>회원</span><span>코드</span><span>추천</span><span>상태</span><span>관리</span></div>
   {data.codes.length?data.codes.map(r=><div className={s.trRef} key={r.id}><span><b>{r.email||'—'}</b><small>{r.user_id.slice(0,8)}…</small></span><span><b>{r.code}</b><small>{new Date(r.created_at).toLocaleDateString()}</small></span><span><b>{r.referrals_total||0}</b><small>Qualified {r.referrals_qualified||0}</small></span><span><b className={r.active?s.good:s.bad}>{r.active?'ACTIVE':'DISABLED'}</b></span><span className={s.actions}><button onClick={()=>run('admin_set_referral_code_active',{p_id:r.id,p_active:!r.active},r.active?'추천 코드가 비활성화되었습니다.':'추천 코드가 활성화되었습니다.')}>{r.active?'비활성':'활성'}</button></span></div>):<div className={s.empty}>Referral Code가 없습니다.</div>}
   </div>
  </section>}

  {tab==='rewards'&&<section className={s.panel}>
   <div className={s.panelHead}><div><h2>Referral Reward 관리</h2><p>추천 리워드 이벤트를 검토하고 지급 상태를 관리합니다. 상태 변경 자체가 외부 자산 전송을 수행하지는 않습니다.</p></div></div>
   <div className={s.table}><div className={s.thReward}><span>회원</span><span>리워드</span><span>금액</span><span>상태</span><span>관리</span></div>
   {data.rewards.length?data.rewards.map(r=><div className={s.trReward} key={r.id}><span><b>{r.email||'—'}</b><small>{r.user_id.slice(0,8)}…</small></span><span><b>{r.reward_type}</b><small>{r.reference_type||'—'} {r.reference_id||''}</small></span><span><b>{Number(r.amount||0).toLocaleString()} {r.asset}</b><small>{new Date(r.created_at).toLocaleString()}</small></span><span><b>{r.status}</b>{r.paid_at&&<small>{new Date(r.paid_at).toLocaleString()}</small>}</span><span className={s.actions}><button onClick={()=>run('admin_set_referral_reward_status',{p_id:r.id,p_status:'APPROVED'},'리워드가 승인되었습니다.')}>승인</button><button onClick={()=>run('admin_set_referral_reward_status',{p_id:r.id,p_status:'PAID'},'리워드가 지급 완료 상태로 변경되었습니다.')}>지급완료</button><button onClick={()=>run('admin_set_referral_reward_status',{p_id:r.id,p_status:'REJECTED'},'리워드가 거절되었습니다.')}>거절</button></span></div>):<div className={s.empty}>Referral Reward 이벤트가 없습니다.</div>}
   </div>
  </section>}

  {tab==='audit'&&<section className={s.panel}>
   <div className={s.panelHead}><div><h2>Admin Audit Log</h2><p>관리자 페이지에서 발생한 주요 변경 이력입니다.</p></div></div>
   <div className={s.table}><div className={s.thLog}><span>시간</span><span>관리자</span><span>액션</span><span>대상</span><span>변경</span></div>
   {data.logs.length?data.logs.map(r=><div className={s.trLog} key={r.id}><span><small>{new Date(r.created_at).toLocaleString()}</small></span><span><b>{r.admin_email||r.admin_user_id||'system'}</b></span><span><b>{r.action}</b></span><span><small>{r.target_type||'—'}</small><em>{r.target_id||'—'}</em></span><span><details><summary>보기</summary><pre>{JSON.stringify({before:r.before_value,after:r.after_value},null,2)}</pre></details></span></div>):<div className={s.empty}>관리자 로그가 없습니다.</div>}
   </div>
  </section>}

  {msg&&<div className={s.toast} onClick={()=>setMsg('')}>{msg}</div>}
 </div></main>
}
