'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import {siteConfirm} from './SiteDialog';

type Notice={
  id:string;
  slug:string;
  category:string;
  title:string;
  summary:string;
  body:string;
  status:string;
  pinned:boolean;
  published_at:string|null;
  created_at:string;
  updated_at:string;
};

const box:React.CSSProperties={border:'1px solid #25292c',background:'#101214',borderRadius:14};
const input:React.CSSProperties={width:'100%',boxSizing:'border-box',border:'1px solid #303539',background:'#0b0d0e',color:'#f4f6f7',borderRadius:8,padding:'0 12px',height:42,fontSize:13};
const categories=[
  ['GENERAL','일반'],
  ['TRADING','거래'],
  ['DEPOSIT_WITHDRAWAL','입출금'],
  ['SYSTEM','시스템'],
  ['LISTING','상장'],
  ['EVENT','이벤트'],
  ['SECURITY','보안'],
] as const;

function toLocal(v:string|null){
  if(!v)return '';
  const d=new Date(v);
  const off=d.getTimezoneOffset();
  const x=new Date(d.getTime()-off*60000);
  return x.toISOString().slice(0,16);
}

export default function AdminNoticesClient(){
 const supabase=useMemo(()=>createBrowserSupabase(),[]);
 const [admin,setAdmin]=useState<boolean|null>(null);
 const [rows,setRows]=useState<Notice[]>([]);
 const [selected,setSelected]=useState<Notice|null>(null);
 const [createMode,setCreateMode]=useState(false);
 const [title,setTitle]=useState('');
 const [summary,setSummary]=useState('');
 const [body,setBody]=useState('');
 const [publishedAt,setPublishedAt]=useState('');
 const [category,setCategory]=useState('GENERAL');
 const [status,setStatus]=useState('PUBLISHED');
 const [pinned,setPinned]=useState(false);
 const [msg,setMsg]=useState('');
 const [saving,setSaving]=useState(false);
 const [deleting,setDeleting]=useState(false);

 async function load(preferredId?:string){
  const {data:{user}}=await supabase.auth.getUser();
  const role=String(user?.app_metadata?.role||'').toLowerCase();
  const ok=role==='admin'||role==='superadmin'||user?.app_metadata?.superadmin===true;
  setAdmin(ok);
  if(!ok)return;

  const {data,error}=await supabase
    .from('notices')
    .select('id,slug,category,title,summary,body,status,pinned,published_at,created_at,updated_at')
    .order('published_at',{ascending:false,nullsFirst:false})
    .order('created_at',{ascending:false});

  if(error){setMsg(error.message);return}
  const list=(data||[]) as Notice[];
  setRows(list);

  const nextId=preferredId||selected?.id;
  if(nextId){
    const fresh=list.find(x=>x.id===nextId);
    if(fresh){pick(fresh);return}
  }
  if(!createMode&&list[0])pick(list[0]);
  if(!list.length&&!createMode)setSelected(null);
 }

 function pick(n:Notice){
  setCreateMode(false);
  setSelected(n);
  setTitle(n.title);
  setSummary(n.summary||'');
  setBody(n.body||'');
  setPublishedAt(toLocal(n.published_at||n.created_at));
  setCategory(n.category||'GENERAL');
  setStatus(n.status||'PUBLISHED');
  setPinned(!!n.pinned);
  setMsg('');
 }

 function beginCreate(){
  setCreateMode(true);
  setSelected(null);
  setTitle('');
  setSummary('');
  setBody('');
  setPublishedAt(toLocal(new Date().toISOString()));
  setCategory('GENERAL');
  setStatus('PUBLISHED');
  setPinned(false);
  setMsg('');
 }

 useEffect(()=>{void load()},[]);

 async function save(){
  if(!selected)return;
  if(!title.trim()){setMsg('제목을 입력하세요.');return}
  if(!publishedAt){setMsg('작성일자를 입력하세요.');return}

  setSaving(true);setMsg('');
  const {error}=await supabase.rpc('admin_update_notice_content',{
    p_id:selected.id,
    p_title:title,
    p_summary:summary,
    p_body:body,
    p_published_at:new Date(publishedAt).toISOString()
  });
  setSaving(false);

  if(error){setMsg(error.message);return}
  setMsg('공지사항이 수정되었습니다.');
  await load(selected.id);
 }

 async function createNotice(){
  if(!title.trim()){setMsg('제목을 입력하세요.');return}
  if(!publishedAt){setMsg('게시 일자를 입력하세요.');return}

  setSaving(true);setMsg('');
  const {data,error}=await supabase.rpc('admin_create_notice',{
    p_title:title,
    p_summary:summary,
    p_body:body,
    p_category:category,
    p_status:status,
    p_pinned:pinned,
    p_published_at:new Date(publishedAt).toISOString()
  });
  setSaving(false);

  if(error){setMsg(error.message);return}
  const created=data as Notice|null;
  setCreateMode(false);
  setMsg('새 공지사항이 작성되었습니다.');
  await load(created?.id);
 }

 async function deleteNotice(){
  if(!selected)return;
  const ok=await siteConfirm(
    `"${selected.title}" 공지사항을 삭제합니다.\n\n삭제 후 사용자 공지 목록에서도 사라지며 관리자 감사 로그에는 삭제 기록이 남습니다.\n\n계속하시겠습니까?`,
    {title:'공지사항 삭제'}
  );
  if(!ok)return;

  setDeleting(true);setMsg('');
  const {error}=await supabase.rpc('admin_delete_notice',{p_id:selected.id});
  setDeleting(false);

  if(error){setMsg(error.message);return}
  setSelected(null);
  setMsg('공지사항이 삭제되었습니다.');
  await load();
 }

 if(admin===null)return <main style={{minHeight:'calc(100vh - 72px)',background:'#08090a',color:'#7d858a',display:'grid',placeItems:'center'}}>관리자 권한 확인 중...</main>;
 if(!admin)return <main style={{minHeight:'calc(100vh - 72px)',background:'#08090a',color:'#f4f6f7',display:'grid',placeItems:'center',padding:24}}><div style={{...box,padding:30,width:'min(560px,100%)',textAlign:'center'}}><h1 style={{margin:'0 0 10px'}}>Notice Admin</h1><p style={{color:'#7d858a',margin:0}}>관리자 권한이 필요합니다.</p></div></main>;

 const isEditing=!createMode&&!!selected;

 return <main style={{minHeight:'calc(100vh - 72px)',background:'#08090a',color:'#f4f6f7',padding:'34px 0 80px'}}><div className="xtShell">
  <div style={{display:'flex',justifyContent:'space-between',gap:20,alignItems:'end',paddingBottom:20,borderBottom:'1px solid #23272a',flexWrap:'wrap'}}>
   <div>
    <span style={{fontSize:11,color:'#b9ff31',fontWeight:900,letterSpacing:'.14em'}}>ADMIN · NOTICE</span>
    <h1 style={{fontSize:36,margin:'7px 0 6px'}}>공지사항 관리</h1>
    <p style={{margin:0,color:'#7f888d'}}>공지 작성, 수정, 삭제를 관리자에서 바로 처리합니다.</p>
   </div>
   <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
    <Link href="/more/notice" target="_blank" style={{height:40,padding:'0 14px',border:'1px solid #34393d',borderRadius:8,display:'inline-flex',alignItems:'center',fontWeight:800,fontSize:13}}>사용자 공지 보기 ↗</Link>
    <button onClick={beginCreate} style={{height:40,padding:'0 16px',border:0,borderRadius:8,background:'#b9ff31',color:'#0c1107',fontWeight:900,cursor:'pointer'}}>+ 공지 작성</button>
   </div>
  </div>

  {msg&&<div style={{marginTop:14,padding:'12px 14px',border:'1px solid #36402c',background:'#12180e',borderRadius:9,color:'#b9ff31',fontSize:13}}>{msg}</div>}

  <section style={{display:'grid',gridTemplateColumns:'minmax(300px,.78fr) minmax(0,1.4fr)',gap:16,marginTop:18}}>
   <div style={{...box,overflow:'hidden',alignSelf:'start'}}>
    <div style={{padding:'15px 16px',borderBottom:'1px solid #24282b',display:'flex',justifyContent:'space-between'}}>
      <b>공지 목록</b><span style={{fontSize:12,color:'#6f787d'}}>{rows.length}</span>
    </div>
    <div style={{maxHeight:'68vh',overflow:'auto'}}>
      {rows.length?rows.map(n=><button key={n.id} onClick={()=>pick(n)} style={{width:'100%',border:0,borderBottom:'1px solid #1f2325',background:selected?.id===n.id&&!createMode?'#182010':'transparent',color:'#eef1f2',textAlign:'left',padding:'14px 16px',cursor:'pointer'}}>
        <small style={{display:'flex',justifyContent:'space-between',gap:10,color:'#70787d',marginBottom:6}}>
          <span>{n.category}{n.pinned?' · 중요':''} · {n.status}</span>
          <span>{new Date(n.published_at||n.created_at).toLocaleDateString('ko-KR')}</span>
        </small>
        <b style={{fontSize:13,lineHeight:1.5}}>{n.title}</b>
      </button>):<div style={{padding:30,textAlign:'center',color:'#70787d',fontSize:12}}>등록된 공지가 없습니다.</div>}
    </div>
   </div>

   <div style={{...box,padding:20}}>
    {!createMode&&!selected
      ?<div style={{padding:40,textAlign:'center',color:'#71797e'}}>수정할 공지를 선택하거나 새 공지를 작성하세요.</div>
      :<div style={{display:'grid',gap:15}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
          <div><b style={{fontSize:18}}>{createMode?'새 공지 작성':'공지 수정'}</b><small style={{display:'block',marginTop:4,color:'#697277'}}>{createMode?'작성 후 즉시 목록에 추가됩니다.':'기존 공지의 제목·요약·본문·게시일을 수정합니다.'}</small></div>
          {createMode&&<button onClick={()=>{setCreateMode(false);if(rows[0])pick(rows[0])}} style={{height:34,padding:'0 11px',border:'1px solid #34393d',borderRadius:7,background:'#131719',color:'#cbd2d5',cursor:'pointer'}}>작성 취소</button>}
        </div>

        {createMode&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
          <label style={{fontSize:12,color:'#8b9398'}}>카테고리
            <select style={{...input,marginTop:7}} value={category} onChange={e=>setCategory(e.target.value)}>
              {categories.map(([value,label])=><option key={value} value={value}>{label} · {value}</option>)}
            </select>
          </label>
          <label style={{fontSize:12,color:'#8b9398'}}>게시 상태
            <select style={{...input,marginTop:7}} value={status} onChange={e=>setStatus(e.target.value)}>
              <option value="PUBLISHED">게시</option>
              <option value="DRAFT">임시저장</option>
              <option value="ARCHIVED">보관</option>
            </select>
          </label>
          <label style={{fontSize:12,color:'#8b9398'}}>중요 공지
            <button type="button" onClick={()=>setPinned(v=>!v)} style={{...input,marginTop:7,cursor:'pointer',textAlign:'left',color:pinned?'#b9ff31':'#f4f6f7'}}>{pinned?'중요 공지 ON':'중요 공지 OFF'}</button>
          </label>
        </div>}

        <div style={{display:'grid',gridTemplateColumns:'1fr 220px',gap:12}}>
          <label style={{fontSize:12,color:'#8b9398'}}>제목
            <input style={{...input,marginTop:7}} value={title} onChange={e=>setTitle(e.target.value)} placeholder="공지사항 제목"/>
          </label>
          <label style={{fontSize:12,color:'#8b9398'}}>게시 일자
            <input type="datetime-local" style={{...input,marginTop:7}} value={publishedAt} onChange={e=>setPublishedAt(e.target.value)}/>
          </label>
        </div>

        <label style={{fontSize:12,color:'#8b9398'}}>목록 요약
          <textarea style={{...input,height:88,padding:'12px',resize:'vertical',marginTop:7}} value={summary} onChange={e=>setSummary(e.target.value)} placeholder="공지 목록에 표시할 요약"/>
        </label>

        <label style={{fontSize:12,color:'#8b9398'}}>공지 내용
          <textarea style={{...input,height:360,padding:'14px',resize:'vertical',lineHeight:1.7,marginTop:7}} value={body} onChange={e=>setBody(e.target.value)} placeholder="공지사항 내용을 입력하세요."/>
        </label>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,paddingTop:8,borderTop:'1px solid #24282b',flexWrap:'wrap'}}>
          <div style={{fontSize:11,color:'#697277'}}>
            {createMode
              ?<>카테고리: {category} · 상태: {status} · {pinned?'중요 공지':'일반 공지'}<br/>작성 작업은 관리자 감사 로그에 기록됩니다.</>
              :<>Slug: {selected?.slug} · 상태: {selected?.status}<br/>수정/삭제 작업은 관리자 감사 로그에 기록됩니다.</>}
          </div>

          <div style={{display:'flex',gap:8}}>
            {isEditing&&<button disabled={saving||deleting} onClick={deleteNotice} style={{height:44,minWidth:100,border:'1px solid #71323b',borderRadius:8,background:'#171113',color:'#ff8190',fontWeight:900,cursor:'pointer',opacity:deleting?.65:1}}>{deleting?'삭제 중...':'공지 삭제'}</button>}
            <button disabled={saving||deleting} onClick={createMode?createNotice:save} style={{height:44,minWidth:150,border:0,borderRadius:8,background:'#b9ff31',color:'#0c1107',fontWeight:900,cursor:'pointer',opacity:saving?.65:1}}>{saving?(createMode?'작성 중...':'저장 중...'):(createMode?'공지 작성 완료':'변경사항 저장')}</button>
          </div>
        </div>
       </div>}
   </div>
  </section>
 </div></main>
}
