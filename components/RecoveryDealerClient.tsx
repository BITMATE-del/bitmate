'use client';
import Link from 'next/link';
import {useEffect,useState,type FormEvent} from 'react';
import s from './RecoveryAdminClient.module.css';

type Member={id:string;email:string;is_blocked:boolean;is_test_account:boolean;available:number|string;created_at:string};
const api=async(path:string,body?:object)=>{
 const r=await fetch('/api/recovery-dealer/'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
 const data=await r.json().catch(()=>({error:'총판 서버 응답 오류'}));
 if(!r.ok)throw new Error(data.error||'요청이 처리되지 않았습니다.');
 return data;
};
export default function RecoveryDealerClient(){
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [code,setCode]=useState('');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [members,setMembers]=useState<Member[]>([]);
 const [search,setSearch]=useState('');
 const [showCreate,setShowCreate]=useState(false);
 const [busy,setBusy]=useState(false);
 async function load(){
  const data=await api('members');
  setCode(data.code);setMembers(data.members||[]);
 }
 useEffect(()=>{let mounted=true;load().catch(e=>{if(mounted)setError(e instanceof Error?e.message:'총판 권한을 확인할 수 없습니다.')}).finally(()=>{if(mounted)setLoading(false)});return()=>{mounted=false}},[]);
 async function create(e:FormEvent){
  e.preventDefault();setBusy(true);setError('');setMessage('');
  try{
   await api('create-test',{email,password});
   setMessage('테스트 계정이 내 총판 코드에 등록되었습니다.');
   setEmail('');setPassword('');setShowCreate(false);await load();
  }catch(e){setError(e instanceof Error?e.message:'계정 생성 실패')}
  finally{setBusy(false)}
 }
 async function block(m:Member){
  if(!confirm(m.is_blocked?'이 회원의 동결을 해제할까요?':'이 회원을 동결할까요?'))return;
  setBusy(true);setError('');setMessage('');
  try{await api('set-block',{userId:m.id,blocked:!m.is_blocked});await load();setMessage('회원 상태를 변경했습니다.')}
  catch(e){setError(e instanceof Error?e.message:'변경 실패')}
  finally{setBusy(false)}
 }
 async function setAmount(m:Member){
  if(!m.is_test_account)return;
  const answer=prompt('테스트 가상잔액 설정 (실제 USDT 아님)\n'+m.email,String(m.available));
  if(answer===null)return;
  if(!/^\d+$/.test(answer)||Number(answer)>1000000000){setError('0부터 10억 사이의 정수를 입력하세요.');return}
  setBusy(true);setError('');setMessage('');
  try{await api('wallet-adjust',{userId:m.id,amount:Number(answer),idempotencyKey:crypto.randomUUID()});await load();setMessage('테스트 가상잔액이 변경 원장에 기록되었습니다.')}
  catch(e){setError(e instanceof Error?e.message:'잔액 처리 실패')}
  finally{setBusy(false)}
 }
 const filtered=members.filter(m=>!search.trim()||m.email.toLowerCase().includes(search.trim().toLowerCase())||m.id.includes(search.trim()));
 return <main className={s.center} style={{display:'block',padding:'28px 16px 72px'}}>
  <div style={{maxWidth:1150,margin:'0 auto',width:'100%'}}>
   <header className={s.topbar}><div><span className={s.eyebrow}>BITMATE DEALER</span><h1>총판 관리센터</h1></div><Link href="/" style={{color:'#b9ff31',fontSize:12}}>홈으로 이동</Link></header>
   {loading?<p className={s.loading}>총판 정보를 확인하는 중입니다…</p>:error&&!code?<div className={s.notice}><strong>총판 권한을 확인할 수 없습니다.</strong><p>{error} 일반 회원 계정이라면 먼저 어드민에서 총판 코드를 등록하세요. <Link href="/login" style={{color:'#b9ff31'}}>로그인</Link></p></div>:<>
    <section className={s.kpis}><article><span>내 총판 코드</span><strong style={{fontSize:22}}>{code}</strong><small>가입 시 입력하는 코드</small></article><article><span>하위 회원</span><strong>{members.length}</strong><small>내 소속만 조회</small></article><article><span>테스트 회원</span><strong>{members.filter(m=>m.is_test_account).length}</strong><small>가상잔액 설정 가능</small></article></section>
    <div className={s.notice}><strong>가상거래 환경</strong><p>잔액 조정은 테스트 계정 전용 가상잔액이야. 실제 입출금·CFD·선물·대출 기능은 아직 새 DB에 연결되지 않았어.</p></div>
    {error&&<p className={s.error} role="alert">{error}</p>}
    {message&&<p className={s.success} role="status">{message}</p>}
    <section className={s.memberHead} style={{marginTop:28}}><div><h2>내 회원관리</h2><p>코드 소속 회원만 관리할 수 있어.</p></div><button className={s.lime} onClick={()=>setShowCreate(v=>!v)}>{showCreate?'발급창 닫기':'+ 테스트 계정 생성'}</button></section>
    {showCreate&&<form className={s.testPanel} onSubmit={create}><div><h3>테스트 계정 생성</h3><p>생성 즉시 내 총판 코드 <strong>{code}</strong>로 연결돼.</p></div><div className={s.testFields}><label>이메일<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="test@example.com"/></label><label>비밀번호<input type="password" required minLength={12} value={password} onChange={e=>setPassword(e.target.value)} placeholder="12자 이상"/></label><button className={s.lime} disabled={busy}>생성</button></div></form>}
    <div className={s.search}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="회원 이메일 / UID 검색"/><button onClick={()=>void load()} disabled={busy}>새로고침</button></div>
    <div className={s.tableScroll}><table><thead><tr><th>회원</th><th>유형</th><th>가상잔액</th><th>상태</th><th>회원관리</th></tr></thead><tbody>{filtered.map(m=><tr key={m.id}><td><strong>{m.email}</strong><small>{m.id}</small></td><td>{m.is_test_account?'테스트':'일반'}</td><td>{Number(m.available).toLocaleString('ko-KR')}</td><td><span className={m.is_blocked?s.blocked:s.normal}>{m.is_blocked?'동결':'정상'}</span></td><td><div style={{display:'flex',gap:7}}><button className={s.rowAction} disabled={busy||!m.is_test_account} onClick={()=>void setAmount(m)}>금액 조정</button><button className={s.rowAction} disabled={busy} onClick={()=>void block(m)}>{m.is_blocked?'동결 해제':'동결'}</button></div></td></tr>)}</tbody></table>{!filtered.length&&<div className={s.empty}>회원이 없습니다.</div>}</div>
   </>}
  </div>
 </main>;
}
