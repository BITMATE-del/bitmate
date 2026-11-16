'use client';
import {useCallback,useEffect,useState,type FormEvent} from 'react';
import Link from 'next/link';
import s from './RecoveryAdminClient.module.css';
import RecoveryAdminExtensions from './RecoveryAdminExtensions';

type Member={id:string;email:string;role:'user'|'admin'|'dealer';is_blocked:boolean;is_test_account:boolean;created_at:string};
type Stats={total:number;blocked:number;test_accounts:number};
type Identity={id:string;email:string;role:string};
type Phase='loading'|'login'|'setup'|'dashboard';

async function request(url:string,init?:RequestInit){
 const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...init,headers:{...(init?.body?{'Content-Type':'application/json'}:{}),...init?.headers}});
 const data=await response.json().catch(()=>({error:'서버 응답을 확인할 수 없습니다.'}));
 if(!response.ok)throw new Error(data.error||'요청에 실패했습니다.');
 return data;
}

export default function RecoveryAdminClient(){
 const [phase,setPhase]=useState<Phase>('loading');
 const [operator,setOperator]=useState<Identity|null>(null);
 const [stats,setStats]=useState<Stats>({total:0,blocked:0,test_accounts:0});
 const [members,setMembers]=useState<Member[]>([]);
 const [query,setQuery]=useState('');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [setupKey,setSetupKey]=useState('');
 const [showTest,setShowTest]=useState(false);
 const [testEmail,setTestEmail]=useState('');
 const [testPassword,setTestPassword]=useState('');
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const [activeNav,setActiveNav]=useState<'overview'|'members'|'dealers'|'wallets'|'ledger'>('overview');

 const loadData=useCallback(async(search='')=>{
  const [summary,users]=await Promise.all([
   request('/api/recovery-admin/summary'),
   request('/api/recovery-admin/users?q='+encodeURIComponent(search))
  ]);
  setStats(summary.stats);
  setOperator(summary.operator);
  setMembers(users.users||[]);
 },[]);

 useEffect(()=>{
  let active=true;
  (async()=>{
   try{
    const session=await request('/api/recovery-auth/session');
    if(session.user?.role==='admin'){
     await loadData();
     if(active)setPhase('dashboard');
     return;
    }
   }catch{}
   try{
    const state=await request('/api/recovery-admin/status');
    if(active)setPhase(state.setupComplete?'login':'setup');
   }catch{if(active){setPhase('login');setError('관리 서버 연결을 확인하세요.');}}
  })();
  return()=>{active=false};
 },[loadData]);

 async function authorize(e:FormEvent){
  e.preventDefault();setBusy(true);setError('');setMessage('');
  try{
   if(phase==='setup'){
    await request('/api/recovery-admin/setup',{method:'POST',body:JSON.stringify({email,password,setupKey})});
    setPhase('login');setSetupKey('');setMessage('관리자 계정이 생성되었습니다. 같은 정보로 로그인하세요.');
   }else{
    const result=await request('/api/recovery-auth/login',{method:'POST',body:JSON.stringify({email,password})});
    if(result.user?.role!=='admin'){
     await request('/api/recovery-auth/logout',{method:'POST'});
     throw new Error('관리자 권한이 없는 계정입니다.');
    }
    await loadData();
    setPhase('dashboard');setPassword('');
   }
  }catch(err){setError(err instanceof Error?err.message:'요청 처리에 실패했습니다.')}
  finally{setBusy(false)}
 }

 async function refresh(search=query){
  setBusy(true);setError('');
  try{await loadData(search)}
  catch(e){setError(e instanceof Error?e.message:'조회에 실패했습니다.')}
  finally{setBusy(false)}
 }

 async function createTest(e:FormEvent){
  e.preventDefault();setBusy(true);setError('');setMessage('');
  try{
   await request('/api/recovery-admin/create-test',{method:'POST',body:JSON.stringify({email:testEmail,password:testPassword})});
   setMessage('테스트 계정을 생성했습니다. 이메일 인증 없이 로그인할 수 있습니다.');
   setTestEmail('');setTestPassword('');setShowTest(false);
   await loadData(query);
  }catch(e){setError(e instanceof Error?e.message:'발급에 실패했습니다.')}
  finally{setBusy(false)}
 }

 async function toggleMember(member:Member){
  if(!window.confirm(member.is_blocked?'이 계정의 동결을 해제할까요?':'이 회원 계정을 동결할까요? 진행 중인 로그인 세션도 종료됩니다.'))return;
  setBusy(true);setError('');setMessage('');
  try{
   await request('/api/recovery-admin/set-block',{method:'POST',body:JSON.stringify({userId:member.id,blocked:!member.is_blocked})});
   setMessage(member.is_blocked?'회원 동결을 해제했습니다.':'회원 계정을 동결했습니다.');
   await loadData(query);
  }catch(e){setError(e instanceof Error?e.message:'처리에 실패했습니다.')}
  finally{setBusy(false)}
 }

 async function logout(){
  await request('/api/recovery-auth/logout',{method:'POST'}).catch(()=>{});
  window.location.replace('/admin');
 }

 if(phase==='loading')return <main className={s.center}><div className={s.loading}>관리자 인증을 확인하고 있습니다…</div></main>;

 if(phase!=='dashboard')return <main className={s.center}>
  <section className={s.authCard}>
   <Link href="/" className={s.brand}><span className={s.symbol}>B</span> BITMATE <small>관리센터</small></Link>
   <div className={s.authHeader}><h1>{phase==='setup'?'최초 관리자 설정':'관리자 로그인'}</h1><p>{phase==='setup'?'일회성 설정 코드로 첫 관리자 계정을 생성합니다.':'새 인증 시스템에 등록된 관리자 계정으로 로그인하세요.'}</p></div>
   <form onSubmit={authorize} className={s.authForm}>
    <label>이메일<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" placeholder="admin@example.com"/></label>
    <label>비밀번호<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={phase==='setup'?12:10} required autoComplete={phase==='setup'?'new-password':'current-password'} placeholder={phase==='setup'?'12자 이상':'관리자 비밀번호'}/></label>
    {phase==='setup'&&<label>최초 설정 코드<input type="password" value={setupKey} onChange={e=>setSetupKey(e.target.value)} required autoComplete="off" placeholder="관리자 발급용 설정 코드"/></label>}
    {error&&<p className={s.error} role="alert">{error}</p>}
    {message&&<p className={s.success} role="status">{message}</p>}
    <button disabled={busy} className={s.primary}>{busy?'처리 중…':phase==='setup'?'관리자 계정 생성':'로그인'}</button>
   </form>
   <p className={s.authHint}>기존 Supabase 관리자 계정은 이 인증 시스템으로 이전되지 않았습니다.</p>
  </section>
 </main>;

 return <main className={s.shell}>
  <aside className={s.sidebar}>
   <Link href="/" className={s.brand}><span className={s.symbol}>B</span> BITMATE <small>ADMIN</small></Link>
   <div className={s.navTitle}>관리 메뉴</div>
   <nav className={s.nav}>
    <button className={activeNav==='overview'?s.selected:''} onClick={()=>setActiveNav('overview')}>대시보드</button>
    <button className={activeNav==='members'?s.selected:''} onClick={()=>setActiveNav('members')}>회원관리</button>
    <button className={activeNav==='dealers'?s.selected:''} onClick={()=>setActiveNav('dealers')}>총판·코드</button>
    <button className={activeNav==='wallets'?s.selected:''} onClick={()=>setActiveNav('wallets')}>가상잔액</button>
    <button className={activeNav==='ledger'?s.selected:''} onClick={()=>setActiveNav('ledger')}>변경 원장</button>
   </nav>
   <div className={s.sidebarFoot}><p>운영 DB 전환 진행 중</p><span>거래·지갑·입출금은 아직 미연결</span></div>
  </aside>
  <section className={s.content}>
   <header className={s.topbar}><div><span className={s.eyebrow}>BITMATE MANAGEMENT</span><h1>{{overview:'운영 대시보드',members:'회원관리',dealers:'총판·가입코드',wallets:'테스트 가상잔액',ledger:'가상잔액 변경 원장'}[activeNav]}</h1></div><div className={s.operator}><span title={operator?.email}>{operator?.email}</span><button onClick={logout}>로그아웃</button></div></header>
   {error&&<p className={s.error} role="alert">{error}</p>}
   {message&&<p className={s.success} role="status">{message}</p>}
   {activeNav==='overview'&&<>
    <section className={s.kpis}>
     <article><span>전체 계정</span><strong>{stats.total.toLocaleString('ko-KR')}</strong><small>새 인증 DB</small></article>
     <article><span>테스트 계정</span><strong>{stats.test_accounts.toLocaleString('ko-KR')}</strong><small>신규 발급 계정</small></article>
     <article><span>동결된 계정</span><strong>{stats.blocked.toLocaleString('ko-KR')}</strong><small>로그인 차단</small></article>
    </section>
    <section className={s.quick}><div><h2>빠른 작업</h2><p>회원 조회와 테스트 계정 발급을 바로 진행할 수 있습니다.</p></div><div className={s.actions}><button onClick={()=>setActiveNav('members')}>회원관리 열기</button><button className={s.lime} onClick={()=>{setActiveNav('members');setShowTest(true)}}>+ 테스트 계정 생성</button></div></section>
    <section className={s.notice}><strong>운영 기능 연결 안내</strong><p>새 DB에서 회원·총판코드·가상잔액을 관리할 수 있습니다. 기존 CFD, 선물, 실제 지갑, 입출금, 대출, 거래 정산은 아직 연결되지 않았습니다.</p></section>
   </>}
   {activeNav==='dealers'&&<RecoveryAdminExtensions type="dealers"/>}
   {activeNav==='wallets'&&<RecoveryAdminExtensions type="wallets"/>}
   {activeNav==='ledger'&&<RecoveryAdminExtensions type="ledger"/>}
   {activeNav==='members'&&<>
    <section className={s.memberHead}><div><h2>회원 목록</h2><p>이메일 검색 · 계정 상태 확인 · 동결 관리</p></div><button className={s.lime} onClick={()=>setShowTest(v=>!v)}>{showTest?'발급창 닫기':'+ 테스트 계정 생성'}</button></section>
    {showTest&&<form className={s.testPanel} onSubmit={createTest}><div><h3>테스트 계정 생성</h3><p>관리자 권한 없이 일반 회원으로 발급됩니다. 사유 입력 및 이메일 인증 불필요.</p></div><div className={s.testFields}><label>테스트 이메일<input type="email" value={testEmail} onChange={e=>setTestEmail(e.target.value)} required placeholder="test@example.com"/></label><label>초기 비밀번호<input type="password" value={testPassword} onChange={e=>setTestPassword(e.target.value)} required minLength={12} placeholder="12자 이상"/></label><button className={s.lime} disabled={busy}>계정 생성</button></div></form>}
    <form className={s.search} onSubmit={e=>{e.preventDefault();void refresh()}}><input placeholder="이메일로 회원 검색" value={query} onChange={e=>setQuery(e.target.value)}/><button disabled={busy}>검색</button><button type="button" onClick={()=>{setQuery('');void refresh('')}} disabled={busy}>전체</button></form>
    <div className={s.tableScroll}><table><thead><tr><th>회원</th><th>구분</th><th>가입일</th><th>상태</th><th>관리</th></tr></thead><tbody>{members.map(m=><tr key={m.id}><td><strong>{m.email}</strong><small>{m.id}</small></td><td>{m.role==='admin'?'관리자':m.role==='dealer'?'총판':m.is_test_account?'테스트 회원':'일반 회원'}</td><td>{new Date(m.created_at).toLocaleDateString('ko-KR')}</td><td><span className={m.is_blocked?s.blocked:s.normal}>{m.is_blocked?'동결':'정상'}</span></td><td>{m.role==='user'?<button className={s.rowAction} onClick={()=>toggleMember(m)} disabled={busy}>{m.is_blocked?'동결 해제':'동결'}</button>:<span className={s.muted}>—</span>}</td></tr>)}</tbody></table>{members.length===0&&<div className={s.empty}>조회된 회원이 없습니다.</div>}</div><p className={s.tableHint}>최근 회원 최대 100건을 표시합니다. 거래 잔액 및 원장 기능은 연결되지 않았습니다.</p>
   </>}
  </section>
 </main>;
}
