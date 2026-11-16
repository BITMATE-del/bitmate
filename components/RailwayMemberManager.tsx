'use client';
import {useCallback,useEffect,useState,type FormEvent} from 'react';
import Link from 'next/link';
import s from './AdminOperations.module.css';

type Member={id:string;email:string;role:string;is_blocked:boolean;is_test_account:boolean;created_at:string};
async function request(url:string,options?:RequestInit){
 const r=await fetch(url,{cache:'no-store',credentials:'same-origin',...options,headers:{...(options?.body?{'Content-Type':'application/json'}:{}),...options?.headers}});
 const result=await r.json().catch(()=>({error:'서버 응답을 확인할 수 없습니다.'}));
 if(!r.ok)throw new Error(result.error||'요청이 실패했습니다.');
 return result;
}
export default function RailwayMemberManager(){
 const [members,setMembers]=useState<Member[]>([]);
 const [query,setQuery]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [creating,setCreating]=useState(false);
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const load=useCallback(async(q:string)=>{
   setBusy(true);setError('');
   try{
     const data=await request('/api/recovery-admin/users?q='+encodeURIComponent(q.trim()));
     setMembers(data.users||[]);
   }catch(e){setError(e instanceof Error?e.message:'회원 조회 실패')}
   finally{setBusy(false)}
 },[]);
 useEffect(()=>{void load('')},[load]);
 async function createTest(e:FormEvent){
   e.preventDefault();setBusy(true);setError('');setMessage('');
   try{
     await request('/api/recovery-admin/create-test',{method:'POST',body:JSON.stringify({email,password})});
     setCreating(false);setEmail('');setPassword('');
     setMessage('테스트 계정이 생성됐습니다.');
     await load(query);
   }catch(e){setError(e instanceof Error?e.message:'발급 실패')}
   finally{setBusy(false)}
 }
 async function toggle(m:Member){
   if(!window.confirm(m.is_blocked?'동결을 해제할까요?':'선택한 계정을 동결할까요?'))return;
   setBusy(true);setError('');setMessage('');
   try{
     await request('/api/recovery-admin/set-block',{method:'POST',body:JSON.stringify({userId:m.id,blocked:!m.is_blocked})});
     setMessage(m.is_blocked?'동결을 해제했습니다.':'계정을 동결했습니다.');
     await load(query);
   }catch(e){setError(e instanceof Error?e.message:'동결 처리 실패')}
   finally{setBusy(false)}
 }
 return <main className={s.page}>
   <div style={{maxWidth:1400,margin:'0 auto',padding:'24px 20px'}}>
     <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
       <div><h1 style={{margin:'0 0 5px'}}>회원관리</h1><p style={{color:'#9fb0b6',fontSize:13,margin:0}}>새 Railway 데이터베이스 회원 관리</p></div>
       <button onClick={()=>setCreating(v=>!v)} style={{background:'#b9ff31',color:'#14210b',border:0,borderRadius:9,padding:'12px 16px',fontWeight:800,cursor:'pointer'}}>{creating?'발급창 닫기':'+ 테스트 계정 생성'}</button>
     </header>
     <div style={{border:'1px solid #735f35',background:'#27231b',borderRadius:11,padding:'14px 17px',color:'#ebd6a6',fontSize:12,lineHeight:1.7,margin:'20px 0'}}>
       기존 BITMATE 회원관리 화면과 기능 소스는 보존되어 있습니다. 현재 Supabase 원장·KYC·거래·기존 지갑 정보는 새 Railway DB로 이전되지 않아 이 화면에서 처리할 수 없습니다. 새 DB 회원의 조회·동결·테스트 계정 생성은 정상 연결되어 있습니다. <Link href="/admin/recovery?tab=wallets" style={{color:'#b9ff31'}}>테스트 가상잔액 관리</Link>
     </div>
     {error&&<p role="alert" style={{background:'#44222a',color:'#ffc3c9',borderRadius:8,padding:12}}>{error}</p>}
     {message&&<p role="status" style={{background:'#1d3625',color:'#b9ff31',borderRadius:8,padding:12}}>{message}</p>}
     {creating&&<form onSubmit={createTest} style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'end',padding:18,background:'#152126',border:'1px solid #35454a',borderRadius:12,marginBottom:18}}>
        <label style={{display:'grid',gap:6,flex:'1 1 200px',fontSize:12}}>이메일<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} style={{background:'#253239',border:'1px solid #405158',padding:12,borderRadius:8,color:'#fff'}}/></label>
        <label style={{display:'grid',gap:6,flex:'1 1 200px',fontSize:12}}>초기 비밀번호 (12자 이상)<input type="password" required minLength={12} value={password} onChange={e=>setPassword(e.target.value)} style={{background:'#253239',border:'1px solid #405158',padding:12,borderRadius:8,color:'#fff'}}/></label>
        <button type="submit" disabled={busy} style={{background:'#b9ff31',border:0,borderRadius:8,padding:'12px 18px',fontWeight:800,color:'#14210b',cursor:'pointer'}}>계정 생성</button>
     </form>}
     <form onSubmit={e=>{e.preventDefault();void load(query)}} style={{display:'flex',gap:8,marginBottom:18,flexWrap:'wrap'}}>
       <input aria-label="회원 이메일 검색" placeholder="이메일로 회원 검색" value={query} onChange={e=>setQuery(e.target.value)} style={{flex:'1 1 220px',maxWidth:460,background:'#1b272c',color:'#fff',border:'1px solid #3b4c51',borderRadius:9,padding:12}}/>
       <button type="submit" disabled={busy} style={{padding:'10px 18px',borderRadius:8,background:'#23353a',color:'#fff',border:'1px solid #45545a'}}>검색</button>
       <button type="button" disabled={busy} onClick={()=>{setQuery('');void load('')}} style={{padding:'10px 18px',borderRadius:8,background:'#23353a',color:'#fff',border:'1px solid #45545a'}}>전체</button>
     </form>
     <div style={{overflowX:'auto',border:'1px solid #354249',borderRadius:12}}>
       <table style={{width:'100%',borderCollapse:'collapse',minWidth:650,fontSize:13}}>
         <thead style={{background:'#1a282e'}}><tr><th style={{textAlign:'left',padding:14}}>회원</th><th style={{textAlign:'left',padding:14}}>구분</th><th style={{textAlign:'left',padding:14}}>가입일</th><th style={{textAlign:'left',padding:14}}>상태</th><th style={{textAlign:'left',padding:14}}>관리</th></tr></thead>
         <tbody>{members.map(m=><tr key={m.id} style={{borderTop:'1px solid #2c3b40'}}><td style={{padding:14}}><strong>{m.email}</strong><small style={{display:'block',color:'#80979f',marginTop:6}}>{m.id}</small></td><td style={{padding:14}}>{m.role==='admin'?'관리자':m.role==='dealer'?'총판':m.is_test_account?'테스트':'일반'}</td><td style={{padding:14}}>{new Date(m.created_at).toLocaleDateString('ko-KR')}</td><td style={{padding:14,color:m.is_blocked?'#ff9fa6':'#b9ff31'}}>{m.is_blocked?'동결':'정상'}</td><td style={{padding:14}}>{m.role==='user'&&<button disabled={busy} onClick={()=>void toggle(m)} style={{border:'1px solid #47565b',color:'#ecf2f3',background:'#223138',borderRadius:7,padding:'8px 12px',cursor:'pointer'}}>{m.is_blocked?'동결 해제':'동결'}</button>}</td></tr>)}</tbody>
       </table>
       {!members.length&&<div style={{padding:25,color:'#91a3a8',textAlign:'center'}}>{busy?'회원 조회 중…':'조회된 회원이 없습니다.'}</div>}
     </div>
   </div>
 </main>;
}
