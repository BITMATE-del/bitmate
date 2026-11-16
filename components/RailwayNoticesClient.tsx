'use client';
import {useCallback,useEffect,useState,type FormEvent} from 'react';

type Notice={id:string;title:string;body:string;created_at:string};
async function adminApi(action:string,body?:unknown){
 const r=await fetch('/api/recovery-admin/'+action,{
  method:body?'POST':'GET',cache:'no-store',credentials:'same-origin',
  headers:body?{'Content-Type':'application/json'}:undefined,
  body:body?JSON.stringify(body):undefined
 });
 const result=await r.json().catch(()=>({error:'서버 응답 오류'}));
 if(!r.ok)throw new Error(result.error||'요청 실패');
 return result;
}
export default function RailwayNoticesClient(){
 const [items,setItems]=useState<Notice[]>([]);
 const [title,setTitle]=useState('');
 const [body,setBody]=useState('');
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 const load=useCallback(async()=>{
  try{setItems((await adminApi('notices')).notices||[])}
  catch(e){setError(e instanceof Error?e.message:'공지 조회 실패')}
 },[]);
 useEffect(()=>{void load()},[load]);
 async function save(e:FormEvent){
  e.preventDefault();setBusy(true);setError('');setMessage('');
  try{
   await adminApi('notice-create',{title,body});
   setTitle('');setBody('');setMessage('공지를 등록했습니다.');
   await load();
  }catch(e){setError(e instanceof Error?e.message:'공지 등록 실패')}
  finally{setBusy(false)}
 }
 async function remove(item:Notice){
  if(!confirm('이 공지를 삭제할까요?\n'+item.title))return;
  setBusy(true);setError('');setMessage('');
  try{await adminApi('notice-delete',{noticeId:item.id});setMessage('공지를 삭제했습니다.');await load()}
  catch(e){setError(e instanceof Error?e.message:'공지 삭제 실패')}
  finally{setBusy(false)}
 }
 const inputStyle={background:'#202c30',color:'#fff',border:'1px solid #3b4c51',borderRadius:8,padding:'12px',fontSize:13,width:'100%',boxSizing:'border-box' as const};
 return <main style={{background:'#0b1114',minHeight:'80vh',padding:'30px 22px',color:'#e8f0f0'}}>
  <div style={{maxWidth:1080,margin:'0 auto'}}>
   <h1 style={{fontSize:25,margin:'0 0 6px'}}>공지사항 관리</h1>
   <p style={{fontSize:12,color:'#9eb0b4',marginBottom:20}}>신규 Railway DB 공지 등록·삭제 · 기존 공지 데이터는 미이전</p>
   <form onSubmit={save} style={{padding:22,border:'1px solid #35454a',borderRadius:13,background:'#162126',display:'grid',gap:14}}>
    <label style={{display:'grid',gap:8,fontSize:12}}>공지 제목<input required maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} style={inputStyle}/></label>
    <label style={{display:'grid',gap:8,fontSize:12}}>공지 내용<textarea required maxLength={10000} rows={6} value={body} onChange={e=>setBody(e.target.value)} style={inputStyle}/></label>
    <button type="submit" disabled={busy} style={{justifySelf:'start',padding:'12px 20px',borderRadius:8,border:0,background:'#b9ff31',color:'#15210c',fontWeight:850,cursor:'pointer'}}>공지 등록</button>
   </form>
   {error&&<p role="alert" style={{background:'#3a1c24',color:'#ffb9bf',padding:12,borderRadius:9}}>{error}</p>}
   {message&&<p role="status" style={{background:'#1d3526',color:'#b9ff31',padding:12,borderRadius:9}}>{message}</p>}
   <h2 style={{fontSize:18,margin:'28px 0 15px'}}>등록된 공지 ({items.length})</h2>
   <div style={{display:'grid',gap:10}}>{items.map(item=><section key={item.id} style={{border:'1px solid #304146',padding:18,borderRadius:10,background:'#141d21',display:'flex',alignItems:'start',justifyContent:'space-between',gap:16}}>
    <div style={{minWidth:0}}><strong style={{fontSize:15}}>{item.title}</strong><p style={{whiteSpace:'pre-wrap',fontSize:12,lineHeight:1.7,color:'#becdd0'}}>{item.body}</p><small style={{color:'#82959a'}}>{new Date(item.created_at).toLocaleString('ko-KR')}</small></div>
    <button disabled={busy} type="button" onClick={()=>void remove(item)} style={{flexShrink:0,padding:'8px 12px',background:'#35232a',border:'1px solid #64404b',borderRadius:7,color:'#ffb4bd',cursor:'pointer'}}>삭제</button>
   </section>)}</div>
   {items.length===0&&<p style={{color:'#91a6ab',fontSize:13}}>등록된 공지가 없습니다.</p>}
  </div>
 </main>;
}
