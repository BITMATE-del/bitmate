'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';

type Notice={id:string;slug:string;category:string;title:string;summary:string;body:string;status:string;pinned:boolean;published_at:string|null;created_at:string;updated_at:string};

const box:React.CSSProperties={border:'1px solid #25292c',background:'#101214',borderRadius:14};
const input:React.CSSProperties={width:'100%',boxSizing:'border-box',border:'1px solid #303539',background:'#0b0d0e',color:'#f4f6f7',borderRadius:8,padding:'0 12px',height:42,fontSize:13};

function toLocal(v:string|null){if(!v)return '';const d=new Date(v);const off=d.getTimezoneOffset();const x=new Date(d.getTime()-off*60000);return x.toISOString().slice(0,16)}

export default function AdminNoticesClient(){
 const supabase=useMemo(()=>createBrowserSupabase(),[]);
 const [admin,setAdmin]=useState<boolean|null>(null);
 const [rows,setRows]=useState<Notice[]>([]);
 const [selected,setSelected]=useState<Notice|null>(null);
 const [title,setTitle]=useState('');
 const [summary,setSummary]=useState('');
 const [body,setBody]=useState('');
 const [publishedAt,setPublishedAt]=useState('');
 const [msg,setMsg]=useState('');
 const [saving,setSaving]=useState(false);

 async function load(){
  const {data:{user}}=await supabase.auth.getUser();
  const ok=user?.app_metadata?.role==='admin'; setAdmin(ok); if(!ok)return;
  const {data,error}=await supabase.from('notices').select('id,slug,category,title,summary,body,status,pinned,published_at,created_at,updated_at').order('published_at',{ascending:false});
  if(error){setMsg(error.message);return}
  const list=(data||[]) as Notice[]; setRows(list);
  if(!selected&&list[0])pick(list[0]);
  else if(selected){const fresh=list.find(x=>x.id===selected.id);if(fresh)pick(fresh)}
 }
 function pick(n:Notice){setSelected(n);setTitle(n.title);setSummary(n.summary||'');setBody(n.body||'');setPublishedAt(toLocal(n.published_at||n.created_at));setMsg('')}
 useEffect(()=>{load()},[]);
 async function save(){
  if(!selected)return; if(!title.trim()){setMsg('제목을 입력하세요.');return} if(!publishedAt){setMsg('작성일자를 입력하세요.');return}
  setSaving(true);setMsg('');
  const {error}=await supabase.rpc('admin_update_notice_content',{p_id:selected.id,p_title:title,p_summary:summary,p_body:body,p_published_at:new Date(publishedAt).toISOString()});
  setSaving(false); if(error){setMsg(error.message);return} setMsg('저장되었습니다. Notice 화면에 바로 반영됩니다.'); await load();
 }
 if(admin===null)return <main style={{minHeight:'calc(100vh - 72px)',background:'#08090a',color:'#7d858a',display:'grid',placeItems:'center'}}>관리자 권한 확인 중...</main>;
 if(!admin)return <main style={{minHeight:'calc(100vh - 72px)',background:'#08090a',color:'#f4f6f7',display:'grid',placeItems:'center',padding:24}}><div style={{...box,padding:30,width:'min(560px,100%)',textAlign:'center'}}><h1 style={{margin:'0 0 10px'}}>Notice Admin</h1><p style={{color:'#7d858a',margin:0}}>관리자 권한이 필요합니다.</p></div></main>;
 return <main style={{minHeight:'calc(100vh - 72px)',background:'#08090a',color:'#f4f6f7',padding:'34px 0 80px'}}><div className="xtShell">
  <div style={{display:'flex',justifyContent:'space-between',gap:20,alignItems:'end',paddingBottom:20,borderBottom:'1px solid #23272a'}}><div><span style={{fontSize:11,color:'#b9ff31',fontWeight:900,letterSpacing:'.14em'}}>ADMIN · NOTICE</span><h1 style={{fontSize:36,margin:'7px 0 6px'}}>Notice Management</h1><p style={{margin:0,color:'#7f888d'}}>공지의 작성일자와 제목·요약·본문을 수정합니다.</p></div><Link href="/more/notice" target="_blank" style={{height:40,padding:'0 14px',border:'1px solid #34393d',borderRadius:8,display:'inline-flex',alignItems:'center',fontWeight:800,fontSize:13}}>Notice 보기 ↗</Link></div>
  {msg&&<div style={{marginTop:14,padding:'12px 14px',border:'1px solid #36402c',background:'#12180e',borderRadius:9,color:'#b9ff31',fontSize:13}}>{msg}</div>}
  <section style={{display:'grid',gridTemplateColumns:'minmax(300px,.78fr) minmax(0,1.4fr)',gap:16,marginTop:18}}>
   <div style={{...box,overflow:'hidden',alignSelf:'start'}}><div style={{padding:'15px 16px',borderBottom:'1px solid #24282b',display:'flex',justifyContent:'space-between'}}><b>공지 목록</b><span style={{fontSize:12,color:'#6f787d'}}>{rows.length}</span></div><div style={{maxHeight:'68vh',overflow:'auto'}}>{rows.map(n=><button key={n.id} onClick={()=>pick(n)} style={{width:'100%',border:0,borderBottom:'1px solid #1f2325',background:selected?.id===n.id?'#182010':'transparent',color:'#eef1f2',textAlign:'left',padding:'14px 16px',cursor:'pointer'}}><small style={{display:'flex',justifyContent:'space-between',gap:10,color:'#70787d',marginBottom:6}}><span>{n.category}{n.pinned?' · 중요':''}</span><span>{new Date(n.published_at||n.created_at).toLocaleDateString('ko-KR')}</span></small><b style={{fontSize:13,lineHeight:1.5}}>{n.title}</b></button>)}</div></div>
   <div style={{...box,padding:20}}>{!selected?<div style={{padding:40,textAlign:'center',color:'#71797e'}}>수정할 공지를 선택하세요.</div>:<div style={{display:'grid',gap:15}}>
    <div style={{display:'grid',gridTemplateColumns:'1fr 220px',gap:12}}><label style={{fontSize:12,color:'#8b9398'}}>제목<input style={{...input,marginTop:7}} value={title} onChange={e=>setTitle(e.target.value)}/></label><label style={{fontSize:12,color:'#8b9398'}}>글작성일자<input type="datetime-local" style={{...input,marginTop:7}} value={publishedAt} onChange={e=>setPublishedAt(e.target.value)}/></label></div>
    <label style={{fontSize:12,color:'#8b9398'}}>목록 요약<textarea style={{...input,height:88,padding:'12px',resize:'vertical',marginTop:7}} value={summary} onChange={e=>setSummary(e.target.value)}/></label>
    <label style={{fontSize:12,color:'#8b9398'}}>공지 내용<textarea style={{...input,height:360,padding:'14px',resize:'vertical',lineHeight:1.7,marginTop:7}} value={body} onChange={e=>setBody(e.target.value)}/></label>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,paddingTop:8,borderTop:'1px solid #24282b'}}><div style={{fontSize:11,color:'#697277'}}>Slug: {selected.slug} · 상태: {selected.status}<br/>카테고리/고정/게시상태는 이 화면에서 변경하지 않습니다.</div><button disabled={saving} onClick={save} style={{height:44,minWidth:150,border:0,borderRadius:8,background:'#b9ff31',color:'#0c1107',fontWeight:900,cursor:'pointer',opacity:saving?.65:1}}>{saving?'저장 중...':'변경사항 저장'}</button></div>
   </div>}</div>
  </section>
 </div></main>
}
