import {SQL} from "bun";
const url=Bun.env.DATABASE_URL;
if(!url)throw new Error("DATABASE_URL missing");
const sql=new SQL(url);
await sql`create table if not exists bm_auth_users(
 id uuid primary key default gen_random_uuid(),
 email text not null unique,
 password_hash text not null,
 role text not null default 'user' check (role='user'),
 created_at timestamptz not null default now()
)`;
await sql`create table if not exists bm_auth_sessions(
 token_hash text primary key,
 user_id uuid not null references bm_auth_users(id) on delete cascade,
 expires_at timestamptz not null,
 created_at timestamptz not null default now()
)`;
await sql`create index if not exists bm_auth_sessions_user_id_idx on bm_auth_sessions(user_id)`;
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
   const rows=await sql`select id,email,role,password_hash from bm_auth_users where email=${email}`;
   const candidate=rows[0];
   if(!candidate||!await Bun.password.verify(password,candidate.password_hash))return response({error:'이메일 또는 비밀번호가 올바르지 않습니다.'},401);
   user=candidate;
  }
  const token=crypto.randomUUID()+'.'+crypto.randomUUID();
  const digest=await hex(token);
  await sql`insert into bm_auth_sessions(token_hash,user_id,expires_at) values(${digest},${user.id},now()+interval '7 days')`;
  return response({ok:true,token,user:{id:user.id,email:user.email,role:user.role}});
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
  const rows=await sql`select u.id,u.email,u.role from bm_auth_sessions s join bm_auth_users u on u.id=s.user_id where s.token_hash=${digest} and s.expires_at>now()`;
  if(!rows[0])return response({error:'세션이 만료되었습니다.'},401);
  return response({ok:true,user:rows[0]});
 }
 return response({error:'not_found'},404);
}});
