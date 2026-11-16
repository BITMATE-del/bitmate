import {SQL} from "bun";
const url=Bun.env.DATABASE_URL;
if(!url)throw new Error("DATABASE_URL missing");
const railway=new SQL(url);
let sql=railway;
await sql`create table if not exists bm_auth_users(
 id uuid primary key default gen_random_uuid(),
 email text not null unique,
 password_hash text not null,
 role text not null default 'user' check (role in ('user','admin','dealer')),
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
await sql`alter table bm_auth_users add constraint bm_auth_users_role_check check (role in ('user','admin','dealer'))`;
await sql`alter table bm_auth_users add column if not exists is_blocked boolean not null default false`;
await sql`alter table bm_auth_users add column if not exists is_test_account boolean not null default false`;
await sql`create unique index if not exists bm_single_initial_admin on bm_auth_users ((role)) where role='admin'`;
await sql`create table if not exists bm_admin_audit(
 id bigserial primary key, actor_id uuid references bm_auth_users(id),
 target_id uuid references bm_auth_users(id),
 action text not null, created_at timestamptz not null default now()
)`;

await sql`create table if not exists bm_dealer_codes(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null unique references bm_auth_users(id),
 code text not null unique,
 enabled boolean not null default true,
 created_at timestamptz not null default now()
)`;
await sql`create table if not exists bm_dealer_members(
 user_id uuid primary key references bm_auth_users(id),
 dealer_id uuid not null references bm_dealer_codes(id),
 created_at timestamptz not null default now()
)`;
await sql`create index if not exists bm_dealer_members_dealer_id_idx on bm_dealer_members(dealer_id)`;
await sql`create table if not exists bm_demo_wallets(
 user_id uuid primary key references bm_auth_users(id),
 available numeric(20,2) not null default 0 check (available>=0),
 locked numeric(20,2) not null default 0 check (locked>=0),
 updated_at timestamptz not null default now()
)`;
await sql`create table if not exists bm_demo_ledger(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references bm_auth_users(id),
 actor_id uuid references bm_auth_users(id),
 delta numeric(20,2) not null,
 balance_after numeric(20,2) not null,
 idempotency_key uuid not null unique,
 description text not null default 'DEMO_BALANCE_ADJUSTMENT',
 created_at timestamptz not null default now()
)`;
await sql`create index if not exists bm_demo_ledger_user_time_idx on bm_demo_ledger(user_id,created_at desc)`;
await sql`create table if not exists bm_notices (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(title) between 1 and 160),
 body text not null check (char_length(body) between 1 and 10000),
 published boolean not null default true,
 author_id uuid not null references bm_auth_users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
)`;
await sql`create index if not exists bm_notices_created_idx on bm_notices(created_at desc)`;

async function initializeNeonAndCopy(){
 const neonUrl=Bun.env.NEON_DATABASE_URL;
 if(!neonUrl)return;
 const neon=new SQL(neonUrl);
 try{
await neon`create table if not exists bm_auth_users(
 id uuid primary key default gen_random_uuid(),
 email text not null unique,
 password_hash text not null,
 role text not null default 'user' check (role in ('user','admin','dealer')),
 created_at timestamptz not null default now()
)`;
await neon`create table if not exists bm_auth_sessions(
 token_hash text primary key,
 user_id uuid not null references bm_auth_users(id) on delete cascade,
 expires_at timestamptz not null,
 created_at timestamptz not null default now()
)`;
await neon`create index if not exists bm_auth_sessions_user_id_idx on bm_auth_sessions(user_id)`;
await neon`alter table bm_auth_users drop constraint if exists bm_auth_users_role_check`;
await neon`alter table bm_auth_users add constraint bm_auth_users_role_check check (role in ('user','admin','dealer'))`;
await neon`alter table bm_auth_users add column if not exists is_blocked boolean not null default false`;
await neon`alter table bm_auth_users add column if not exists is_test_account boolean not null default false`;
await neon`create unique index if not exists bm_single_initial_admin on bm_auth_users ((role)) where role='admin'`;
await neon`create table if not exists bm_admin_audit(
 id bigserial primary key, actor_id uuid references bm_auth_users(id),
 target_id uuid references bm_auth_users(id),
 action text not null, created_at timestamptz not null default now()
)`;

await neon`create table if not exists bm_dealer_codes(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null unique references bm_auth_users(id),
 code text not null unique,
 enabled boolean not null default true,
 created_at timestamptz not null default now()
)`;
await neon`create table if not exists bm_dealer_members(
 user_id uuid primary key references bm_auth_users(id),
 dealer_id uuid not null references bm_dealer_codes(id),
 created_at timestamptz not null default now()
)`;
await neon`create index if not exists bm_dealer_members_dealer_id_idx on bm_dealer_members(dealer_id)`;
await neon`create table if not exists bm_demo_wallets(
 user_id uuid primary key references bm_auth_users(id),
 available numeric(20,2) not null default 0 check (available>=0),
 locked numeric(20,2) not null default 0 check (locked>=0),
 updated_at timestamptz not null default now()
)`;
await neon`create table if not exists bm_demo_ledger(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references bm_auth_users(id),
 actor_id uuid references bm_auth_users(id),
 delta numeric(20,2) not null,
 balance_after numeric(20,2) not null,
 idempotency_key uuid not null unique,
 description text not null default 'DEMO_BALANCE_ADJUSTMENT',
 created_at timestamptz not null default now()
)`;
await neon`create index if not exists bm_demo_ledger_user_time_idx on bm_demo_ledger(user_id,created_at desc)`;
await neon`create table if not exists bm_notices (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(title) between 1 and 160),
 body text not null check (char_length(body) between 1 and 10000),
 published boolean not null default true,
 author_id uuid not null references bm_auth_users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
)`;
await neon`create index if not exists bm_notices_created_idx on bm_notices(created_at desc)`;

  const counts:Record<string,number>={};
  {const rows=await railway`select * from bm_auth_users`;
   for(const item of rows){await neon`insert into bm_auth_users(id,email,password_hash,role,created_at,is_blocked,is_test_account) values(${item.id},${item.email},${item.password_hash},${item.role},${item.created_at},${item.is_blocked},${item.is_test_account}) on conflict(id) do nothing`}
   const check=await neon`select count(*)::int as n from bm_auth_users`;
   if(Number(check[0].n)<rows.length)throw new Error('bm_auth_users_row_count_mismatch');
   counts['bm_auth_users']=rows.length;
  }
  {const rows=await railway`select * from bm_auth_sessions`;
   for(const item of rows){await neon`insert into bm_auth_sessions(token_hash,user_id,expires_at,created_at) values(${item.token_hash},${item.user_id},${item.expires_at},${item.created_at}) on conflict(token_hash) do nothing`}
   const check=await neon`select count(*)::int as n from bm_auth_sessions`;
   if(Number(check[0].n)<rows.length)throw new Error('bm_auth_sessions_row_count_mismatch');
   counts['bm_auth_sessions']=rows.length;
  }
  {const rows=await railway`select * from bm_admin_audit`;
   for(const item of rows){await neon`insert into bm_admin_audit(id,actor_id,target_id,action,created_at) values(${item.id},${item.actor_id},${item.target_id},${item.action},${item.created_at}) on conflict(id) do nothing`}
   const check=await neon`select count(*)::int as n from bm_admin_audit`;
   if(Number(check[0].n)<rows.length)throw new Error('bm_admin_audit_row_count_mismatch');
   counts['bm_admin_audit']=rows.length;
  }
  {const rows=await railway`select * from bm_dealer_codes`;
   for(const item of rows){await neon`insert into bm_dealer_codes(id,owner_id,code,enabled,created_at) values(${item.id},${item.owner_id},${item.code},${item.enabled},${item.created_at}) on conflict(id) do nothing`}
   const check=await neon`select count(*)::int as n from bm_dealer_codes`;
   if(Number(check[0].n)<rows.length)throw new Error('bm_dealer_codes_row_count_mismatch');
   counts['bm_dealer_codes']=rows.length;
  }
  {const rows=await railway`select * from bm_dealer_members`;
   for(const item of rows){await neon`insert into bm_dealer_members(user_id,dealer_id,created_at) values(${item.user_id},${item.dealer_id},${item.created_at}) on conflict(user_id) do nothing`}
   const check=await neon`select count(*)::int as n from bm_dealer_members`;
   if(Number(check[0].n)<rows.length)throw new Error('bm_dealer_members_row_count_mismatch');
   counts['bm_dealer_members']=rows.length;
  }
  {const rows=await railway`select * from bm_demo_wallets`;
   for(const item of rows){await neon`insert into bm_demo_wallets(user_id,available,locked,updated_at) values(${item.user_id},${item.available},${item.locked},${item.updated_at}) on conflict(user_id) do nothing`}
   const check=await neon`select count(*)::int as n from bm_demo_wallets`;
   if(Number(check[0].n)<rows.length)throw new Error('bm_demo_wallets_row_count_mismatch');
   counts['bm_demo_wallets']=rows.length;
  }
  {const rows=await railway`select * from bm_demo_ledger`;
   for(const item of rows){await neon`insert into bm_demo_ledger(id,user_id,actor_id,delta,balance_after,idempotency_key,description,created_at) values(${item.id},${item.user_id},${item.actor_id},${item.delta},${item.balance_after},${item.idempotency_key},${item.description},${item.created_at}) on conflict(id) do nothing`}
   const check=await neon`select count(*)::int as n from bm_demo_ledger`;
   if(Number(check[0].n)<rows.length)throw new Error('bm_demo_ledger_row_count_mismatch');
   counts['bm_demo_ledger']=rows.length;
  }
  {const rows=await railway`select * from bm_notices`;
   for(const item of rows){await neon`insert into bm_notices(id,title,body,published,author_id,created_at,updated_at) values(${item.id},${item.title},${item.body},${item.published},${item.author_id},${item.created_at},${item.updated_at}) on conflict(id) do nothing`}
   const check=await neon`select count(*)::int as n from bm_notices`;
   if(Number(check[0].n)<rows.length)throw new Error('bm_notices_row_count_mismatch');
   counts['bm_notices']=rows.length;
  }
  const audits=await neon`select coalesce(max(id),0)::bigint as max from bm_admin_audit`;
  const maxAudit=Number(audits[0].max);
  await neon`select setval(pg_get_serial_sequence('bm_admin_audit','id'),${Math.max(1,maxAudit)},${maxAudit>0})`;
  sql=neon;
  console.log('BITMATE_NEON_CUTOVER_SUCCESS',JSON.stringify(counts));
 }catch(error){
  console.error('BITMATE_NEON_CUTOVER_ERROR',String(error));
  sql=railway;
 }
}
await initializeNeonAndCopy();

console.log('BITMATE_AUTH_DB_READY');
const hex=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const response=(obj:unknown,status=200)=>Response.json(obj,{status,headers:{'cache-control':'no-store'}});
const marketSymbols=new Set(['BTCUSDT','ETHUSDT','XRPUSDT','SOLUSDT','DOGEUSDT','TRXUSDT','BNBUSDT','ADAUSDT','AVAXUSDT','LINKUSDT']);
let marketSyncOnce=false;
async function syncMarketPrices(){
 try{
  const res=await fetch('https://bitmate.co.kr/api/futures/markets',{signal:AbortSignal.timeout(8500)});
  if(!res.ok)throw new Error('binance_http_'+res.status);
  const data=await res.json();
  const list=data.markets;
  if(!Array.isArray(list))throw new Error('market_feed_invalid_response');
  const records=list.filter((x:any)=>marketSymbols.has(String(x.symbol||''))&&Number(x.lastPrice)>0&&Number.isFinite(Number(x.lastPrice)));
  if(records.length<5)throw new Error('market_price_coverage_low');
  await sql.begin(async tx=>{
   for(const item of records){
    const symbol=String(item.symbol),price=Number(item.lastPrice);
    await tx`insert into public.futures_market_prices(symbol,last_price,source_time) values(${symbol},${price},now()) on conflict(symbol) do update set last_price=excluded.last_price,source_time=excluded.source_time,updated_at=now()`;
    await tx`insert into public.cfd_products(symbol,display_name,current_price,last_price_at) values(${symbol},${symbol.replace('USDT','/USDT')},${price},now()) on conflict(symbol) do update set current_price=excluded.current_price,last_price_at=excluded.last_price_at,updated_at=now()`;
   }
  });
  if(!marketSyncOnce){console.log('BITMATE_MARKET_SYNC_PASS',records.length);marketSyncOnce=true}
 }catch(error){if(!marketSyncOnce)console.error('BITMATE_MARKET_SYNC_FAIL',String(error))}
}
void syncMarketPrices();
setInterval(()=>void syncMarketPrices(),10000);
let cfdSettlementBusy=false;
async function settleDueCfdTrades(){
 if(cfdSettlementBusy)return;
 cfdSettlementBusy=true;
 try{
  const due=await sql`select id from public.cfd_timed_trades where status='ACTIVE' and expires_at<=now() order by expires_at asc limit 30`;
  for(const trade of due){
   try{await sql`select private.settle_cfd_timed_trade(${trade.id})`}
   catch(error){console.error('BITMATE_CFD_SETTLEMENT_FAILED',String(error).slice(0,220))}
  }
  if(due.length)console.log('BITMATE_CFD_SETTLEMENT_WORKER',due.length);
 }catch(error){console.error('BITMATE_CFD_SETTLEMENT_QUERY_FAILED',String(error).slice(0,180))}
 finally{cfdSettlementBusy=false}
}
setInterval(()=>void settleDueCfdTrades(),4000);
console.log('BITMATE_AUTH_SERVICE_STARTING');
const dynamicMemberRpc=new Set(['p2p_market_snapshot','p2p_apply_player','p2p_create_ad','p2p_update_my_ad','p2p_set_my_ad_status','p2p_create_order','p2p_order_action','p2p_send_message','p2p_order_messages','user_create_withdrawal_request','user_withdrawal_assignment','user_internal_transfer','user_deposit_access_snapshot','get_crypto_loan_collateral_options','get_crypto_loan_quote_v2','apply_crypto_loan_v2','repay_crypto_loan_now','request_crypto_loan_extension_v2','accept_crypto_loan_extension','start_index_investment','open_cfd_market_order','update_cfd_sltp','close_cfd_position','validate_signup_code']);
const dynamicAdminRpc=new Set(['admin_set_p2p_player_status','admin_set_p2p_order_status','admin_set_p2p_ad_status','admin_approve_crypto_loan_v2','admin_reject_crypto_loan_v2','admin_offer_crypto_loan_extension','admin_reject_crypto_loan_extension','admin_mark_crypto_loan_overdue','admin_seize_crypto_loan_collateral','admin_update_crypto_loan_product_terms','admin_set_system_setting','admin_adjust_demo_balance','admin_update_profile','admin_update_kyc','admin_update_deletion','admin_assign_tron_deposit_address','admin_set_api_status','admin_set_subaccount_status','admin_set_referral_code_active','admin_set_referral_reward_status','admin_update_asset_network','admin_update_withdrawal_status','admin_upsert_dealer_code','admin_set_dealer_active','admin_reset_user_password','admin_create_notice','admin_delete_notice','admin_update_notice_content']);
const dynamicDealerRpc=new Set(['dealer_set_payment_settings','dealer_update_withdrawal_status','dealer_set_cfd_timed_round_override','dealer_approve_crypto_loan','dealer_reject_crypto_loan','dealer_set_p2p_player_status']);
async function runDynamicPublicRpc(tx:any,name:string,args:Record<string,unknown>){
 const entries=Object.entries(args);
 if(entries.length>18||entries.some(([key])=>!/^p_[a-z0-9_]{1,60}$/.test(key)))throw new Error('RPC_ARGUMENTS_INVALID');
 const funcs=await tx`select proargnames from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=${name} and p.prokind='f'`;
 const valid=funcs.find((row:any)=>entries.every(([key])=>row.proargnames?.includes(key)))||(!entries.length?funcs[0]:null);
 if(!valid)throw new Error('RPC_SIGNATURE_NOT_FOUND');
 const parts=entries.map(([key],i)=>'"'+key+'" => $'+(i+1));
 const query='select public."'+name+'"('+parts.join(',')+') as result';
 const rows=await tx.unsafe(query,entries.map(([,value])=>value));
 return rows?.[0]?.result??null;
}
// BITMATE_ORIGINAL_RPC_GATEWAY: compatibility for the original app's PostgreSQL functions.
const publicRpc=new Set(['user_wallet_snapshot','spot_virtual_snapshot','get_cfd_account_summary','get_cfd_timed_account_summary','ensure_cfd_demo_account','start_cfd_timed_trade','spot_virtual_market_order','futures_closed_position_margins','futures_action']);
const adminRpc=new Set(['admin_ops_snapshot','admin_wallet_ops_snapshot','admin_member_services_snapshot','admin_p2p_snapshot','admin_crypto_loan_snapshot_v2','admin_get_cfd_dashboard','admin_dealer_snapshot','admin_set_user_usdt_balance','admin_set_user_frozen','admin_set_cfd_timed_round_override']);
const dealerRpc=new Set(['dealer_portal_snapshot','dealer_set_user_usdt_balance','dealer_set_user_frozen']);
async function runOriginalRpc(tx:any,name:string,a:any){
 const one=async(rows:any)=>rows?.[0]?.result??null;
 switch(name){
 case 'user_wallet_snapshot':return one(await tx`select public.user_wallet_snapshot() as result`);
 case 'spot_virtual_snapshot':return one(await tx`select public.spot_virtual_snapshot() as result`);
 case 'get_cfd_account_summary':return one(await tx`select public.get_cfd_account_summary() as result`);
 case 'get_cfd_timed_account_summary':return one(await tx`select public.get_cfd_timed_account_summary() as result`);
 case 'ensure_cfd_demo_account':return one(await tx`select public.ensure_cfd_demo_account() as result`);
 case 'futures_closed_position_margins':return one(await tx`select public.futures_closed_position_margins() as result`);
 case 'futures_action':return one(await tx`select public.futures_action(${String(a.p_action||'')},${JSON.stringify(a.p_payload||{})}::jsonb) as result`);
 case 'spot_virtual_market_order':return one(await tx`select public.spot_virtual_market_order(${String(a.p_symbol||'')},${String(a.p_side||'')},${Number(a.p_amount)},${String(a.p_client_order_id||'')}) as result`);
 case 'start_cfd_timed_trade':return one(await tx`select public.start_cfd_timed_trade(${String(a.p_symbol||'')},${String(a.p_direction||'')},${Number(a.p_duration_minutes)},${Number(a.p_amount)},${String(a.p_idempotency_key||'')}) as result`);
 case 'admin_ops_snapshot':return one(await tx`select public.admin_ops_snapshot(${String(a.p_query||'')}) as result`);
 case 'admin_wallet_ops_snapshot':return one(await tx`select public.admin_wallet_ops_snapshot() as result`);
 case 'admin_member_services_snapshot':return one(await tx`select public.admin_member_services_snapshot() as result`);
 case 'admin_p2p_snapshot':return one(await tx`select public.admin_p2p_snapshot() as result`);
 case 'admin_crypto_loan_snapshot_v2':return one(await tx`select public.admin_crypto_loan_snapshot_v2() as result`);
 case 'admin_get_cfd_dashboard':return one(await tx`select public.admin_get_cfd_dashboard() as result`);
 case 'admin_dealer_snapshot':return one(await tx`select public.admin_dealer_snapshot() as result`);
 case 'admin_set_user_usdt_balance':return one(await tx`select public.admin_set_user_usdt_balance(${String(a.p_user_id||'')},${Number(a.p_available)},${String(a.p_note||'')}) as result`);
 case 'admin_set_user_frozen':return one(await tx`select public.admin_set_user_frozen(${String(a.p_user_id||'')},${a.p_frozen===true},${String(a.p_reason||'')}) as result`);
 case 'admin_set_cfd_timed_round_override':return one(await tx`select public.admin_set_cfd_timed_round_override(${String(a.p_trade_id||'')},${String(a.p_override||'AUTO')},${String(a.p_reason||'')}) as result`);
 case 'dealer_portal_snapshot':return one(await tx`select public.dealer_portal_snapshot() as result`);
 case 'dealer_set_user_usdt_balance':return one(await tx`select public.dealer_set_user_usdt_balance(${String(a.p_user_id||'')},${Number(a.p_available)},${String(a.p_note||'')}) as result`);
 case 'dealer_set_user_frozen':return one(await tx`select public.dealer_set_user_frozen(${String(a.p_user_id||'')},${a.p_frozen===true},${String(a.p_reason||'')}) as result`);
 default:if(dynamicMemberRpc.has(name)||dynamicAdminRpc.has(name)||dynamicDealerRpc.has(name))return runDynamicPublicRpc(tx,name,a);throw new Error('RPC_NOT_AVAILABLE');
 }
}
Bun.serve({port:Number(Bun.env.PORT||3000),async fetch(req){
 const path=new URL(req.url).pathname;
 if(path==='/health')return response({ok:true,service:'bitmate-auth'});
 if(path==='/rpc/futures_markets'&&req.method==='POST'){
  try{const rows=await sql`select public.futures_markets() as result`;return response({data:rows?.[0]?.result??null,error:null})}
  catch(error){return response({data:null,error:{message:String(error).slice(0,200)}},503)}
 }
 if(path==='/view/cfd_risk_acceptances'&&req.method==='POST'){
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'';
  if(!token)return response({error:'login_required'},401);
  const digest=await hex(token);
  const users=await sql`select u.id from bm_auth_sessions s join bm_auth_users u on u.id=s.user_id where s.token_hash=${digest} and s.expires_at>now() and not u.is_blocked`;
  if(!users[0])return response({error:'login_required'},401);
  let body:any;try{body=await req.json()}catch{return response({error:'invalid_request'},400)}
  const version=String(body?.version||'');
  if(!/^[A-Za-z0-9._-]{1,64}$/.test(version))return response({error:'invalid_version'},400);
  const rows=await sql`insert into public.cfd_risk_acceptances(user_id,version) values(${users[0].id},${version}) on conflict(user_id,version) do update set accepted_at=now() returning user_id,version,accepted_at`;
  return response({data:rows[0],error:null});
 }
 // BITMATE_READONLY_TABLE_GATEWAY: scoped read-only table access.
 if(path.startsWith('/view/')&&req.method==='GET'){
  const table=path.slice('/view/'.length);
  const permitted=new Set(['cfd_products','cfd_timed_trades','cfd_positions','cfd_orders','cfd_trade_executions','cfd_risk_acceptances','notices','demo_balances','futures_market_prices','crypto_loan_products','crypto_loans','p2p_ads','p2p_orders']);
  if(!permitted.has(table))return response({error:'unsupported_table'},404);
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'';
  const digest=await hex(token);
  const owners=await sql`select u.id,u.role from bm_auth_sessions s join bm_auth_users u on u.id=s.user_id where s.token_hash=${digest} and s.expires_at>now() and u.is_blocked=false`;
  if(!owners[0])return response({error:'login_required'},401);
  const owner=owners[0];
  try{
   let rows:any[]=[];
   switch(table){
    case 'cfd_products':rows=await sql`select * from public.cfd_products order by sort_order,symbol limit 300`;break;
    case 'cfd_timed_trades':rows=await sql`select * from public.cfd_timed_trades where user_id=${owner.id} order by created_at desc limit 200`;break;
    case 'cfd_positions':rows=await sql`select * from public.cfd_positions where user_id=${owner.id} order by created_at desc limit 200`;break;
    case 'cfd_orders':rows=await sql`select * from public.cfd_orders where user_id=${owner.id} order by created_at desc limit 200`;break;
    case 'cfd_trade_executions':rows=await sql`select * from public.cfd_trade_executions where user_id=${owner.id} order by created_at desc limit 200`;break;
    case 'notices':rows=await sql`select * from public.notices where status='PUBLISHED' order by pinned desc,published_at desc limit 100`;break;
    case 'demo_balances':rows=await sql`select * from public.demo_balances where user_id=${owner.id} order by asset limit 100`;break;
    case 'futures_market_prices':rows=await sql`select * from public.futures_market_prices order by symbol limit 100`;break;
    case 'crypto_loan_products':rows=await sql`select * from public.crypto_loan_products where status='ACTIVE' and visible=true order by sort_order limit 100`;break;
    case 'crypto_loans':rows=await sql`select * from public.crypto_loans where user_id=${owner.id} order by created_at desc limit 100`;break;
    case 'p2p_ads':rows=await sql`select * from public.p2p_ads order by created_at desc limit 150`;break;
    case 'p2p_orders':rows=await sql`select * from public.p2p_orders where user_id=${owner.id} order by created_at desc limit 150`;break;
    case 'cfd_risk_acceptances':rows=[];break;
   }
   return response({data:rows,error:null});
  }catch(error){console.error('BITMATE_VIEW_ERROR',table,String(error).slice(0,150));return response({data:null,error:'데이터 조회 실패'},500)}
 }
 if(path.startsWith('/rpc/')&&req.method==='POST'){
  const name=path.slice('/rpc/'.length);
  if(!/^[a-z][a-z0-9_]{2,70}$/.test(name)||(!publicRpc.has(name)&&!adminRpc.has(name)&&!dealerRpc.has(name)&&!dynamicMemberRpc.has(name)&&!dynamicAdminRpc.has(name)&&!dynamicDealerRpc.has(name)))return response({error:'RPC_NOT_AVAILABLE'},404);
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'';
  if(!token)return response({error:'로그인이 필요합니다.'},401);
  const digest=await hex(token);
  const rows=await sql`select u.id,u.role from bm_auth_sessions s join bm_auth_users u on u.id=s.user_id where s.token_hash=${digest} and s.expires_at>now() and u.is_blocked=false`;
  const actor=rows[0];
  if(!actor)return response({error:'인증 세션이 만료되었습니다.'},401);
  if((adminRpc.has(name)||dynamicAdminRpc.has(name))&&actor.role!=='admin')return response({error:'관리자 권한이 없습니다.'},403);
  if((dealerRpc.has(name)||dynamicDealerRpc.has(name))&&actor.role!=='dealer'&&actor.role!=='admin')return response({error:'총판 권한이 없습니다.'},403);
  let raw='';try{raw=await req.text()}catch{return response({error:'잘못된 요청입니다.'},400)}
  if(raw.length>10000)return response({error:'요청이 너무 큽니다.'},413);
  let a:any={};try{a=raw?JSON.parse(raw):{}}catch{return response({error:'잘못된 JSON입니다.'},400)}
  if(!a||typeof a!=='object'||Array.isArray(a))return response({error:'잘못된 입력입니다.'},400);
  try{
   const data=await sql.begin(async tx=>{
    await tx`select set_config('request.jwt.claim.sub',${actor.id},true)`;
    await tx`select set_config('request.jwt.claim.role','authenticated',true)`;
    return runOriginalRpc(tx,name,a);
   });
   return response({data,error:null});
  }catch(error:any){
   const message=String(error?.message||error);
   console.error('BITMATE_RPC_ERROR',name,message.slice(0,240));
   return response({data:null,error:{message:message.slice(0,180)}},400);
  }
 }
 if(path==='/notices'&&req.method==='GET'){
   const rows=await sql`select id,title,body,created_at from bm_notices where published=true order by created_at desc limit 50`;
   return response({ok:true,notices:rows});
 }
 if(req.method==='POST'&&(path==='/signup'||path==='/login')){
  let body:any;try{body=await req.json()}catch{return response({error:'invalid_request'},400)}
  const email=String(body.email||'').trim().toLowerCase(),password=String(body.password||'');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<10||password.length>128)return response({error:'올바른 이메일과 10자 이상 비밀번호를 입력하세요.'},400);
  let user:any;
  if(path==='/signup'){
   const hash=await Bun.password.hash(password,{algorithm:'argon2id'});
   const code=String(body.signupCode||'').trim().toUpperCase();
   if(code&&!/^[A-Z0-9_-]{3,20}$/.test(code))return response({error:'가입코드 형식을 확인하세요.'},400);
   try{
     user=await sql.begin(async tx=>{
       let dealerId:string|null=null;
       if(code){
         const match=await tx`select id from bm_dealer_codes where code=${code} and enabled=true`;
         if(!match.length)throw new Error('INVALID_DEALER_CODE');
         dealerId=match[0].id;
       }
       const rows=await tx`insert into bm_auth_users(email,password_hash) values(${email},${hash}) returning id,email,role`;
       if(dealerId)await tx`insert into bm_dealer_members(user_id,dealer_id) values(${rows[0].id},${dealerId})`;
       await tx`insert into bm_demo_wallets(user_id) values(${rows[0].id})`;
       return rows[0];
     });
   }catch(error:any){
     if(error?.code==='23505')return response({error:'이미 가입된 이메일입니다.'},409);
     if(String(error).includes('INVALID_DEALER_CODE'))return response({error:'유효하지 않은 총판 가입코드입니다.'},400);
     return response({error:'회원가입 처리 실패'},500);
   }
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

  if(path==='/admin/dealers'&&req.method==='GET'){
   const rows=await sql`select d.id,d.code,d.enabled,d.created_at,u.id as owner_id,u.email as owner_email,(select count(*)::int from bm_dealer_members m where m.dealer_id=d.id) as member_count from bm_dealer_codes d join bm_auth_users u on u.id=d.owner_id order by d.created_at desc limit 100`;
   return response({ok:true,dealers:rows});
  }
  if(path==='/admin/assign-dealer'&&req.method==='POST'){
   let body:any;try{body=await req.json()}catch{return response({error:'올바른 요청이 아닙니다.'},400)}
   const email=String(body.email||'').trim().toLowerCase(),code=String(body.code||'').trim().toUpperCase();
   if(!/^[A-Z0-9_-]{3,20}$/.test(code)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return response({error:'이메일 또는 코드 형식을 확인하세요.'},400);
   try{
    const dealer=await sql.begin(async tx=>{
     const owners=await tx`select id from bm_auth_users where email=${email} and role='user' for update`;
     if(!owners.length)throw new Error('USER_NOT_FOUND');
     const assigned=await tx`update bm_auth_users set role='dealer' where id=${owners[0].id} returning id,email`;
     const codeRow=await tx`insert into bm_dealer_codes(owner_id,code) values(${assigned[0].id},${code}) returning id,code`;
     await tx`insert into bm_admin_audit(actor_id,target_id,action) values(${operator.id},${assigned[0].id},'DEALER_ASSIGNED')`;
     return {id:codeRow[0].id,code:codeRow[0].code,owner:assigned[0].email};
    });
    return response({ok:true,dealer});
   }catch{return response({error:'회원을 찾을 수 없거나 이미 총판인 계정·중복 코드입니다.'},409)}
  }
  if(path==='/admin/demo-wallets'&&req.method==='GET'){
   const search=String(new URL(req.url).searchParams.get('q')||'').toLowerCase().slice(0,80);
   const rows=search?await sql`select u.id,u.email,u.is_test_account,coalesce(w.available,0) as available,coalesce(w.locked,0) as locked from bm_auth_users u left join bm_demo_wallets w on w.user_id=u.id where u.role='user' and u.email ilike ${'%'+search+'%'} order by u.created_at desc limit 100`:await sql`select u.id,u.email,u.is_test_account,coalesce(w.available,0) as available,coalesce(w.locked,0) as locked from bm_auth_users u left join bm_demo_wallets w on w.user_id=u.id where u.role='user' order by u.created_at desc limit 100`;
   return response({ok:true,wallets:rows});
  }
  if(path==='/admin/demo-wallet-set'&&req.method==='POST'){
   let body:any;try{body=await req.json()}catch{return response({error:'올바른 요청이 아닙니다.'},400)}
   const userId=String(body.userId||''),amount=Number(body.amount),key=String(body.idempotencyKey||'');
   if(!/^[0-9a-f-]{36}$/i.test(userId)||!Number.isSafeInteger(amount)||amount<0||amount>1000000000||!/^[0-9a-f-]{36}$/i.test(key))return response({error:'금액 또는 요청값을 확인하세요.'},400);
   try {
    const result=await sql.begin(async tx=>{
     const users=await tx`select id from bm_auth_users where id=${userId} and role='user' and is_test_account=true for update`;
     if(!users.length)throw new Error('NOT_TEST_MEMBER');
     await tx`insert into bm_demo_wallets(user_id) values(${userId}) on conflict(user_id) do nothing`;
     const locked=await tx`select available from bm_demo_wallets where user_id=${userId} for update`;
     const previous=Number(locked[0].available);
     await tx`update bm_demo_wallets set available=${amount},updated_at=now() where user_id=${userId}`;
     await tx`insert into bm_demo_ledger(user_id,actor_id,delta,balance_after,idempotency_key) values(${userId},${operator.id},${amount-previous},${amount},${key})`;
     await tx`insert into bm_admin_audit(actor_id,target_id,action) values(${operator.id},${userId},'ADMIN_DEMO_BALANCE_SET')`;
     return {available:amount};
    });
    return response({ok:true,wallet:result});
   }catch(error){return response({error:String(error).includes('NOT_TEST_MEMBER')?'테스트 회원만 가상잔액을 조정할 수 있습니다.':'중복 요청이거나 잔액 처리에 실패했습니다.'},409)}
  }
  if(path==='/admin/notices'&&req.method==='GET'){
   const notices=await sql`select id,title,body,published,created_at,updated_at from bm_notices order by created_at desc limit 100`;
   return response({ok:true,notices});
  }
  if(path==='/admin/notice-create'&&req.method==='POST'){
   let body:any;try{body=await req.json()}catch{return response({error:'올바른 요청이 아닙니다.'},400)}
   const title=String(body.title||'').trim(),content=String(body.body||'').trim();
   if(!title||title.length>160||!content||content.length>10000)return response({error:'제목 또는 본문을 확인하세요.'},400);
   const rows=await sql`insert into bm_notices(title,body,published,author_id) values(${title},${content},true,${operator.id}) returning id,title,body,created_at`;
   await sql`insert into bm_admin_audit(actor_id,action,target_id) values(${operator.id},'NOTICE_CREATED',${operator.id})`;
   return response({ok:true,notice:rows[0]});
  }
  if(path==='/admin/notice-delete'&&req.method==='POST'){
   let body:any;try{body=await req.json()}catch{return response({error:'올바른 요청이 아닙니다.'},400)}
   const noticeId=String(body.noticeId||'');
   if(!/^[0-9a-f-]{36}$/i.test(noticeId))return response({error:'공지 식별값이 올바르지 않습니다.'},400);
   const rows=await sql`delete from bm_notices where id=${noticeId} returning id`;
   if(!rows.length)return response({error:'공지를 찾을 수 없습니다.'},404);
   await sql`insert into bm_admin_audit(actor_id,action,target_id) values(${operator.id},'NOTICE_DELETED',${operator.id})`;
   return response({ok:true});
  }
  if(path==='/admin/password-reset'&&req.method==='POST'){
   let body:any;try{body=await req.json()}catch{return response({error:'올바른 요청이 아닙니다.'},400)}
   const userId=String(body.userId||'');
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId))return response({error:'회원 식별값이 올바르지 않습니다.'},400);
   const temporary='Bm-'+Array.from(crypto.getRandomValues(new Uint8Array(18)),x=>'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'[x%57]).join('')+'!';
   const hash=await Bun.password.hash(temporary,{algorithm:'argon2id'});
   const updated=await sql.begin(async tx=>{
     const users=await tx`update bm_auth_users set password_hash=${hash} where id=${userId} and role='user' returning id`;
     if(!users.length)return null;
     await tx`delete from bm_auth_sessions where user_id=${userId}`;
     await tx`insert into bm_admin_audit(actor_id,target_id,action) values(${operator.id},${userId},'USER_PASSWORD_RESET')`;
     return users[0];
   });
   if(!updated)return response({error:'일반 회원 계정을 찾을 수 없습니다.'},404);
   return response({ok:true,temporaryPassword:temporary});
  }
  if(path==='/admin/demo-ledger'&&req.method==='GET'){
   const rows=await sql`select l.id,l.delta,l.balance_after,l.created_at,u.email as member_email,a.email as actor_email from bm_demo_ledger l join bm_auth_users u on u.id=l.user_id left join bm_auth_users a on a.id=l.actor_id order by l.created_at desc limit 100`;
   return response({ok:true,ledger:rows});
  }
  return response({error:'not_found'},404);
 }

 if(path.startsWith('/dealer/')&&req.method==='GET'||path.startsWith('/dealer/')&&req.method==='POST'){
   const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'';
   const digest=await hex(token);
   const actors=await sql`select u.id,u.email,u.role,d.id as dealer_id,d.code from bm_auth_sessions s join bm_auth_users u on u.id=s.user_id join bm_dealer_codes d on d.owner_id=u.id and d.enabled=true where s.token_hash=${digest} and s.expires_at>now() and not u.is_blocked`;
   const actor=actors[0];
   if(!actor)return response({error:'총판 권한이 없습니다.'},403);
   if(path==='/dealer/members'&&req.method==='GET'){
     const rows=await sql`select u.id,u.email,u.is_blocked,u.is_test_account,u.created_at,coalesce(w.available,0) as available from bm_dealer_members m join bm_auth_users u on u.id=m.user_id left join bm_demo_wallets w on w.user_id=u.id where m.dealer_id=${actor.dealer_id} order by u.created_at desc limit 100`;
     return response({ok:true,code:actor.code,members:rows});
   }
   if(path==='/dealer/create-test'&&req.method==='POST'){
     let body:any;try{body=await req.json()}catch{return response({error:'올바른 요청이 아닙니다.'},400)}
     const email=String(body.email||'').trim().toLowerCase(),password=String(body.password||'');
     if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<12||password.length>128)return response({error:'이메일 또는 비밀번호를 확인하세요.'},400);
     const hash=await Bun.password.hash(password,{algorithm:'argon2id'});
     try {
       const result=await sql.begin(async tx=>{
         const created=await tx`insert into bm_auth_users(email,password_hash,is_test_account) values(${email},${hash},true) returning id,email`;
         await tx`insert into bm_dealer_members(user_id,dealer_id) values(${created[0].id},${actor.dealer_id})`;
         await tx`insert into bm_demo_wallets(user_id) values(${created[0].id})`;
         await tx`insert into bm_admin_audit(actor_id,target_id,action) values(${actor.id},${created[0].id},'DEALER_TEST_USER_CREATED')`;
         return created[0];
       });
       return response({ok:true,user:result});
     }catch{return response({error:'계정 생성 실패. 중복 이메일을 확인하세요.'},409)}
   }
   if(path==='/dealer/set-block'&&req.method==='POST'){
     let body:any;try{body=await req.json()}catch{return response({error:'올바른 요청이 아닙니다.'},400)}
     const userId=String(body.userId||'');
     if(!/^[0-9a-f-]{36}$/i.test(userId))return response({error:'회원 식별값 오류'},400);
     const rows=await sql`update bm_auth_users set is_blocked=${body.blocked===true} where id=${userId} and role='user' and id in (select user_id from bm_dealer_members where dealer_id=${actor.dealer_id}) returning id`;
     if(!rows.length)return response({error:'소속 회원을 찾을 수 없습니다.'},404);
     if(body.blocked===true)await sql`delete from bm_auth_sessions where user_id=${userId}`;
     await sql`insert into bm_admin_audit(actor_id,target_id,action) values(${actor.id},${userId},${body.blocked===true?'DEALER_BLOCKED':'DEALER_UNBLOCKED'})`;
     return response({ok:true});
   }
   // Demo-only balance adjustments are audited, scoped to the issuing dealer and serialized.
   if(path==='/dealer/wallet-adjust'&&req.method==='POST'){
     let body:any;try{body=await req.json()}catch{return response({error:'올바른 요청이 아닙니다.'},400)}
     const userId=String(body.userId||''),amount=Number(body.amount),key=String(body.idempotencyKey||'');
     if(!/^[0-9a-f-]{36}$/i.test(userId)||!Number.isSafeInteger(amount)||amount<0||amount>1000000000||!/^[0-9a-f-]{36}$/i.test(key))return response({error:'금액 또는 요청값을 확인하세요.'},400);
     try {
       const result=await sql.begin(async tx=>{
         const owned=await tx`select u.id from bm_auth_users u join bm_dealer_members m on m.user_id=u.id where u.id=${userId} and m.dealer_id=${actor.dealer_id} and u.role='user' and u.is_test_account=true for update of u`;
         if(!owned.length)throw new Error('NOT_TEST_MEMBER');
         await tx`insert into bm_demo_wallets(user_id) values(${userId}) on conflict(user_id) do nothing`;
         const wallet=await tx`select available from bm_demo_wallets where user_id=${userId} for update`;
         const previous=Number(wallet[0].available);
         const updated=await tx`update bm_demo_wallets set available=${amount},updated_at=now() where user_id=${userId} returning available`;
         await tx`insert into bm_demo_ledger(user_id,actor_id,delta,balance_after,idempotency_key) values(${userId},${actor.id},${amount-previous},${amount},${key})`;
         await tx`insert into bm_admin_audit(actor_id,target_id,action) values(${actor.id},${userId},'DEALER_DEMO_BALANCE_SET')`;
         return updated[0];
       });
       return response({ok:true,wallet:result});
     }catch(error){return response({error:String(error).includes('NOT_TEST_MEMBER')?'본인 소속 테스트 회원만 금액 조정이 가능합니다.':'이미 처리되었거나 잔액 처리에 실패했습니다.'},409)}
   }
   return response({error:'not_found'},404);
 }
 if(path==='/wallet/demo'&&req.method==='GET'){
   const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'';
   if(!token)return response({error:'로그인이 필요합니다.'},401);
   const digest=await hex(token);
   const rows=await sql`select u.id,u.email,coalesce(w.available,0) as available,coalesce(w.locked,0) as locked,u.is_test_account from bm_auth_sessions s join bm_auth_users u on u.id=s.user_id left join bm_demo_wallets w on w.user_id=u.id where s.token_hash=${digest} and s.expires_at>now() and not u.is_blocked`;
   if(!rows.length)return response({error:'인증이 만료되었습니다.'},401);
   return response({ok:true,wallet:rows[0]});
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
