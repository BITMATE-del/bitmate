'use client';

import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import s from './AdminDealers.module.css';

type Dealer={id:string;code:string;owner_user_id:string;display_name:string;active:boolean;email:string;member_count:number;created_at:string};

export default function AdminDealers(){
 const supabase=useMemo(()=>createBrowserSupabase(),[]);
 const [rows,setRows]=useState<Dealer[]>([]);
 const [email,setEmail]=useState('');
 const [code,setCode]=useState('');
 const [name,setName]=useState('');
 const [busy,setBusy]=useState(false);
 const [msg,setMsg]=useState('');

 async function load(){
  const {data,error}=await supabase.rpc('admin_dealer_snapshot');
  if(error){setMsg(error.message);return}
  setRows(((data as any)?.dealers||[]) as Dealer[]);
 }
 useEffect(()=>{void load()},[]);

 async function save(){
  if(!email.trim()||!code.trim())return setMsg('회원 이메일과 가입코드를 입력하세요.');
  setBusy(true);setMsg('');
  const {error}=await supabase.rpc('admin_upsert_dealer_code',{p_owner_email:email.trim(),p_code:code.trim().toUpperCase(),p_display_name:name.trim(),p_active:true});
  setBusy(false);
  if(error)return setMsg(error.message);
  setEmail('');setCode('');setName('');setMsg('총판 코드가 부여되었습니다.');await load();
 }
 async function toggle(d:Dealer){
  const {error}=await supabase.rpc('admin_set_dealer_active',{p_id:d.id,p_active:!d.active});
  if(error)return setMsg(error.message);await load();
 }

 return <main className={s.page}>
  <section className={s.hero}><div><span>DEALER CONTROL</span><h1>총판 / 가입코드 관리</h1><p>회원에게 총판 코드를 부여하면 해당 계정에서 별도의 총판 관리페이지를 사용할 수 있습니다.</p></div></section>

  <section className={s.create}>
   <div><label>총판 회원 이메일<input value={email} onChange={e=>setEmail(e.target.value)} placeholder="dealer@example.com"/></label><label>가입코드<input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="예: SEOUL01"/></label><label>표시명<input value={name} onChange={e=>setName(e.target.value)} placeholder="예: 서울 1팀"/></label></div>
   <button disabled={busy} onClick={save}>{busy?'처리 중...':'코드 부여 / 갱신'}</button>
  </section>

  <section className={s.panel}>
   <div className={s.head}><h2>등록된 총판</h2><span>{rows.length}개</span></div>
   <div className={s.table}><div className={s.th}><span>총판 회원</span><span>코드</span><span>표시명</span><span>회원수</span><span>상태</span><span>관리</span></div>
   {rows.map(d=><div className={s.tr} key={d.id}><span><b>{d.email}</b><small>{d.owner_user_id.slice(0,12)}…</small></span><span><b>{d.code}</b></span><span>{d.display_name||'—'}</span><span>{d.member_count}</span><span className={d.active?s.on:s.off}>{d.active?'ACTIVE':'INACTIVE'}</span><span><button onClick={()=>toggle(d)}>{d.active?'비활성':'활성화'}</button></span></div>)}
   </div>
  </section>
  {msg&&<div className={s.toast} onClick={()=>setMsg('')}>{msg}</div>}
 </main>;
}
