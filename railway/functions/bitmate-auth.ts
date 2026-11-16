import {SQL} from "bun";
const url=Bun.env.DATABASE_URL;
if(!url)throw new Error("DATABASE_URL missing");
const sql=new SQL(url);
await sql`create table if not exists bm_auth_users(
 id uuid primary key default gen_random_uuid(),
 email text not null unique,
 password_hash text not null,
 role text not null default 'user' check (role in ('user','admin')),
 created_at timestamptz not null default now()
)`;
await sql`create table if not exists bm_auth_sessions(
 token_hash text primary key,
 user_id uuid not null references bm_auth_users(id) on delete cascade,
 expires_at timestamptz not null,
 created_at timestamptz not null default now()
)`;
await sql`create index if not exists bm_auth_sessions_user_id_idx on bm_auth_sessions(user_id)`;
await sql`alter table bm_auth_users drop constraint if exists bm_auth_users_role_check`;
await sql`alter table bm_auth_users add constraint bm_auth_users_role_check check (role in ('user','admin'))`;
await sql`alter table bm_auth_users add column if not exists is_blocked boolean not null default false`;
await sql`alter table bm_auth_users add column if not exists is_test_account boolean not null default false`;
await sql`create unique index if not exists bm_single_initial_admin on bm_auth_users ((role)) where role='admin'`;
await sql`create table if not exists bm_admin_audit(
 id bigserial primary key, actor_id uuid references bm_auth_users(id),
 target_id uuid references bm_auth_users(id),
 action text not null, created_at timestamptz not null default now()
)`;
console.log('BITMATE_AUTH_DB_READY');
const hex=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const response=(obj:unknown,status=200)=>Response.json(obj,{status,headers:{'cache-control':'no-store'}});
console.log('BITMATE_AUTH_SERVICE_STARTING');
Bun.serve({port:Number(Bun.env.PORT||3000),async fetch(req){
 const path=new URL(req.url).pathname;
 if(path==='/health')return response({ok:true,service:'bitmate-auth'});
 if(req.method==='POST'&&(path==='/signup'||path==='/login')){
  let body:any;try{body=await req.json()}catch{return response({error:'invalid_request'},400)}
  const email=String(body.email||'').trim().toLowerCase(),password=String(body.password||'');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<10||password.length>128)return response({error:'올바른 이메일과 10자 이상 비밀번호를 입력하세요.'},400);
  let user:any;
  if(path==='/signup'){
   const hash=await Bun.password.hash(password,{algorithm:'argon2id'});
   try{const rows=await sql`insert into bm_auth_users(email,password_hash) values(${email},${hash}) returning id,email,role`;user=rows[0]}
   catch(error:any){if(error?.code==='23505')return response({error:'이미 가입된 이메일입니다.'},409);return response({error:'회원가입 처리 실패'},500)}
  }else{
   const rows=await sql`select id,email,role,password_hash,is_blocked from bm_auth_users where email=${email}`;
   const candidate=rows[0];
   if(!candidate||!await Bun.password.verify(password,candidate.password_hash))return response({error:'이메일 또는 비밀번호가 올바르지 않습니다.'},401);
   if(candidate.is_blocked)return response({error:'이용이 제한된 계정입니다.'},403);
   user=candidate;
  }
  const token=crypto.randomUUID()+'.'+crypto.randomUUID();
  const digest=await hex(token);
  await sql`insert into bm_auth_sessions(token_hash,user_id,expires_at) values(${digest},${user.id},now()+interval '7 days')`;
  return response({ok:true,token,user:{id:user.id,email:user.email,role:user.role}});
 }
 if(path==='/admin/status'&&req.method==='GET'){
  const rows=await sql`select exists(select 1 from bm_auth_users where role='admin') as setup_complete`;
  return response({ok:true,setupComplete:rows[0].setup_complete});
 }
 if(path==='/admin/setup'&&req.method==='POST'){
  const conf=Bun.env.BM_ADMIN_SETUP_KEY||'';
  let data:any;try{data=await req.json()}catch{return response({error:'올바른 요청이 아닙니다.'},400)}
  const key=String(data.setupKey||'');
  const email=String(data.email||'').trim().toLowerCase();
  const password=String(data.password||'');
  if(!conf||key.length!==conf.length||key!==conf)return response({error:'관리자 설정 코드가 올바르지 않습니다.'},403);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<12||password.length>128)return response({error:'올바른 이메일과 12자 이상의 비밀번호를 입력하세요.'},400);
  const hash=await Bun.password.hash(password,{algorithm:'argon2id'});
  try {
   const created=await sql`insert into bm_auth_users(email,password_hash,role) values(${email},${hash},'admin') returning id,email,role`;
   await sql`insert into bm_admin_audit(actor_id,target_id,action) values(${created[0].id},${created[0].id},'INITIAL_ADMIN_CREATED')`;
   return response({ok:true});
  }catch{return response({error:'초기 관리자가 이미 생성되었거나 이메일이 사용 중입니다.'},409)}
 }
 if(path.startsWith('/admin/')&&path!=='/admin/status'&&path!=='/admin/setup'){
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'';
  if(!token)return response({error:'관리자 로그인이 필요합니다.'},401);
  const digest=await hex(token);
  const who=await sql`select u.id,u.email,u.role from bm_auth_sessions s join bm_auth_users u on u.id=s.user_id where s.token_hash=${digest} and s.expires_at>now() and u.is_blocked=false and u.role='admin'`;
  const operator=who[0];if(!operator)return response({error:'관리자 권한이 없습니다.'},403);
  if(path==='/admin/summary'&&req.method==='GET'){
   const rows=await sql`select count(*)::int as total,count(*) filter (where is_blocked)::int as blocked,count(*) filter (where is_test_account)::int as test_accounts from bm_auth_users`;
   return response({ok:true,stats:rows[0],operator:{id:operator.id,email:operator.email}});
  }
  if(path==='/admin/users'&&req.method==='GET'){
   const u=new URL(req.url);
   const search=String(u.searchParams.get('q')||'').trim().toLowerCase().slice(0,80);
   const rows=search?await sql`select id,email,role,is_blocked,is_test_account,created_at from bm_auth_users where email ilike ${'%'+search+'%'} order by created_at desc limit 100`:await sql`select id,email,role,is_blocked,is_test_account,created_at from bm_auth_users order by created_at desc limit 100`;
   return response({ok:true,users:rows});
  }
  if(path==='/admin/create-test'&&req.method==='POST'){
   let body:any;try{body=await req.json()}catch{return response({error:'올바른 요청이 아닙니다.'},400)}
   const email=String(body.email||'').trim().toLowerCase(),pw=String(body.password||'');
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||pw.length<12||pw.length>128)return response({error:'올바른 이메일과 12자 이상의 비밀번호를 입력하세요.'},400);
   const hash=await Bun.password.hash(pw,{algorithm:'argon2id'});
   try{
    const created=await sql`insert into bm_auth_users(email,password_hash,is_test_account) values(${email},${hash},true) returning id,email,role`;
    await sql`insert into bm_admin_audit(actor_id,target_id,action) values(${operator.id},${created[0].id},'TEST_USER_CREATED')`;
    return response({ok:true,user:created[0]});
   }catch{return response({error:'해당 이메일은 이미 사용 중입니다.'},409)}
  }
  if(path==='/admin/set-block'&&req.method==='POST'){
   let body:any;try{body=await req.json()}catch{return response({error:'올바른 요청이 아닙니다.'},400)}
   const id=String(body.userId||'');
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return response({error:'회원 식별값이 올바르지 않습니다.'},400);
   if(id===operator.id)return response({error:'현재 관리자 계정은 동결할 수 없습니다.'},400);
   const blocked=body.blocked===true;
   const updated=await sql`update bm_auth_users set is_blocked=${blocked} where id=${id} and role='user' returning id,is_blocked`;
   if(!updated[0])return response({error:'회원을 찾을 수 없습니다.'},404);
   if(blocked)await sql`delete from bm_auth_sessions where user_id=${id}`;
   await sql`insert into bm_admin_audit(actor_id,target_id,action) values(${operator.id},${id},${blocked?'USER_BLOCKED':'USER_UNBLOCKED'})`;
   return response({ok:true,user:updated[0]});
  }
  return response({error:'not_found'},404);
 }
 if(path==='/session'||path==='/logout'){
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'';
  if(!token)return response({error:'로그인이 필요합니다.'},401);
  const digest=await hex(token);
  if(path==='/logout'){
   if(req.method!=='POST')return response({error:'method_not_allowed'},405);
   await sql`delete from bm_auth_sessions where token_hash=${digest}`;
   return response({ok:true});
  }
  if(req.method!=='GET')return response({error:'method_not_allowed'},405);
  const rows=await sql`select u.id,u.email,u.role from bm_auth_sessions s join bm_auth_users u on u.id=s.user_id where s.token_hash=${digest} and s.expires_at>now() and u.is_blocked=false`;
  if(!rows[0])return response({error:'세션이 만료되었습니다.'},401);
  return response({ok:true,user:rows[0]});
 }
 return response({error:'not_found'},404);
}});

void (async()=>{
  const host='http://127.0.0.1:'+String(Bun.env.PORT||3000);
  const email='bm-smoke-'+crypto.randomUUID()+'@example.invalid';
  const password='SmokeTest_'+crypto.randomUUID();
  try {
    const signup=await fetch(host+'/signup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})});
    const created=await signup.json();
    const login=await fetch(host+'/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})});
    const logged=await login.json();
    const session=await fetch(host+'/session',{headers:{authorization:'Bearer '+String(logged.token||'')}});
    const sessionData=await session.json();
    if(!signup.ok||!login.ok||!session.ok||sessionData.user?.email!==email)throw new Error('signup='+signup.status+',login='+login.status+',session='+session.status);
    const logout=await fetch(host+'/logout',{method:'POST',headers:{authorization:'Bearer '+logged.token}});
    if(!logout.ok)throw new Error('logout='+logout.status);
    console.log('BITMATE_AUTH_FLOW_SMOKE_PASS');
  } catch(error){console.error('BITMATE_AUTH_FLOW_SMOKE_FAIL',String(error))}
  finally {try{await sql`delete from bm_auth_users where email=${email}`}catch{}}
  try{
    const external=await fetch('https://bitmate-auth-production.up.railway.app/health',{signal:AbortSignal.timeout(5000)});
    console.log('BITMATE_AUTH_PUBLIC_HEALTH',external.status);
  }catch(error){console.error('BITMATE_AUTH_PUBLIC_HEALTH_FAILED',String(error))}
})();

void (async()=>{
 const host='http://127.0.0.1:'+String(Bun.env.PORT||3000);
 try{
  const status=await fetch(host+'/admin/status');
  const data=await status.json();
  const denied=await fetch(host+'/admin/users');
  const invalid=await fetch(host+'/admin/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'a@example.com',password:'abcdefghijklmnop',setupKey:'incorrect-setup-key'})});
  if(!status.ok||typeof data.setupComplete!=='boolean'||denied.status!==401||invalid.status!==403)throw new Error('status='+status.status+',denied='+denied.status+',invalid='+invalid.status);
  console.log('BITMATE_ADMIN_GUARD_TEST_PASS');
 }catch(e){console.error('BITMATE_ADMIN_GUARD_TEST_FAIL',String(e))}
})();
