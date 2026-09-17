'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';

type Slot={slot_key:string;label:string;image_url:string|null;storage_path:string|null;updated_at:string};
const box:React.CSSProperties={border:'1px solid #25292c',background:'#101214',borderRadius:14};

export default function AdminLandingMediaClient(){
 const supabase=useMemo(()=>createBrowserSupabase(),[]);
 const [admin,setAdmin]=useState<boolean|null>(null);
 const [slots,setSlots]=useState<Slot[]>([]);
 const [busy,setBusy]=useState('');
 const [msg,setMsg]=useState('');
 async function load(){
  const {data:{user}}=await supabase.auth.getUser();const ok=user?.app_metadata?.role==='admin';setAdmin(ok);if(!ok)return;
  const {data,error}=await supabase.from('landing_media_slots').select('*').order('slot_key');if(error){setMsg(error.message);return}setSlots((data||[]) as Slot[]);
 }
 useEffect(()=>{load()},[]);
 async function upload(slot:Slot,file:File){
  if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)){setMsg('PNG, JPG, WEBP, GIF 이미지만 업로드할 수 있습니다.');return}
  if(file.size>8*1024*1024){setMsg('이미지는 8MB 이하만 업로드할 수 있습니다.');return}
  setBusy(slot.slot_key);setMsg('');
  const ext=(file.name.split('.').pop()||'img').toLowerCase().replace(/[^a-z0-9]/g,'');
  const path=`${slot.slot_key}/${Date.now()}.${ext||'img'}`;
  const {error:upErr}=await supabase.storage.from('landing-assets').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
  if(upErr){setBusy('');setMsg(upErr.message);return}
  const {data:pub}=supabase.storage.from('landing-assets').getPublicUrl(path);
  const {error:dbErr}=await supabase.from('landing_media_slots').upsert({slot_key:slot.slot_key,label:slot.label,image_url:pub.publicUrl,storage_path:path,updated_at:new Date().toISOString()},{onConflict:'slot_key'});
  if(dbErr){await supabase.storage.from('landing-assets').remove([path]);setBusy('');setMsg(dbErr.message);return}
  if(slot.storage_path)await supabase.storage.from('landing-assets').remove([slot.storage_path]);
  setMsg(`${slot.label} 이미지가 적용되었습니다.`);setBusy('');await load();
 }
 async function reset(slot:Slot){
  setBusy(slot.slot_key);setMsg('');
  const {error}=await supabase.from('landing_media_slots').update({image_url:null,storage_path:null,updated_at:new Date().toISOString()}).eq('slot_key',slot.slot_key);
  if(!error&&slot.storage_path)await supabase.storage.from('landing-assets').remove([slot.storage_path]);
  setBusy('');setMsg(error?error.message:`${slot.label}을 기본 디자인으로 되돌렸습니다.`);await load();
 }
 if(admin===null)return <main style={{minHeight:'calc(100vh - 72px)',display:'grid',placeItems:'center',background:'#08090a',color:'#7d858a'}}>관리자 권한 확인 중...</main>;
 if(!admin)return <main style={{minHeight:'calc(100vh - 72px)',display:'grid',placeItems:'center',background:'#08090a',color:'#fff'}}><div style={{...box,padding:30}}>관리자 권한이 필요합니다.</div></main>;
 return <main style={{minHeight:'calc(100vh - 72px)',background:'#08090a',color:'#f4f6f7',padding:'34px 0 80px'}}><div className="xtShell">
  <div style={{display:'flex',justifyContent:'space-between',gap:20,alignItems:'end',borderBottom:'1px solid #23272a',paddingBottom:20}}><div><span style={{fontSize:11,color:'#b9ff31',fontWeight:900,letterSpacing:'.14em'}}>ADMIN · LANDING MEDIA</span><h1 style={{fontSize:36,margin:'7px 0 6px'}}>Landing Image Management</h1><p style={{margin:0,color:'#7f888d'}}>홈의 지정된 이미지 슬롯만 교체합니다. 레이아웃 크기는 고정되어 사이트 구조가 깨지지 않습니다.</p></div><Link href="/" target="_blank" style={{height:40,padding:'0 14px',border:'1px solid #34393d',borderRadius:8,display:'inline-flex',alignItems:'center',fontWeight:800,fontSize:13}}>홈 보기 ↗</Link></div>
  {msg&&<div style={{marginTop:14,padding:'12px 14px',border:'1px solid #36402c',background:'#12180e',borderRadius:9,color:'#b9ff31',fontSize:13}}>{msg}</div>}
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(360px,1fr))',gap:16,marginTop:18}}>{slots.map(slot=><section key={slot.slot_key} style={{...box,padding:18}}>
   <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'start'}}><div><b style={{fontSize:17}}>{slot.label}</b><div style={{fontSize:11,color:'#697277',marginTop:6}}>{slot.slot_key}</div></div><span style={{fontSize:11,color:slot.image_url?'#b9ff31':'#778087'}}>{slot.image_url?'사용자 이미지 적용중':'기본 디자인 사용중'}</span></div>
   <div style={{height:250,border:'1px solid #293034',borderRadius:10,overflow:'hidden',background:'#090b0c',display:'grid',placeItems:'center',marginTop:16}}>{slot.image_url?<img src={slot.image_url} alt="preview" style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<span style={{color:'#596267',fontSize:13}}>업로드 이미지 없음</span>}</div>
   <p style={{color:'#818b91',fontSize:12,lineHeight:1.6}}>권장: 가로형 이미지, PNG/JPG/WEBP · 최대 8MB. 원본 비율을 유지한 채 슬롯 안에 맞춰 표시되므로 이미지 크기가 달라도 페이지 레이아웃은 변하지 않습니다.</p>
   <div style={{display:'flex',gap:8}}><label style={{flex:1,height:42,borderRadius:8,background:'#b9ff31',color:'#0d1108',fontWeight:900,display:'grid',placeItems:'center',cursor:'pointer',opacity:busy===slot.slot_key?.6:1}}>{busy===slot.slot_key?'처리 중...':'이미지 업로드'}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={!!busy} style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)upload(slot,f);e.currentTarget.value=''}}/></label><button onClick={()=>reset(slot)} disabled={!!busy||!slot.image_url} style={{height:42,padding:'0 14px',border:'1px solid #34393d',borderRadius:8,background:'#111416',color:'#e4e7e8',fontWeight:800}}>기본값 복원</button></div>
  </section>)}</div>
 </div></main>
}
