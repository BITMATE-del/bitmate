-- Dealer/referral code system and scoped dealer portal
-- Applied to Supabase project fgyiofykvpkxpeylcocn

create table if not exists public.dealer_codes(
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null default '',
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dealer_members(
  id uuid primary key default gen_random_uuid(),
  dealer_code_id uuid not null references public.dealer_codes(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  signup_code text not null,
  joined_at timestamptz not null default now()
);

create table if not exists public.dealer_payment_settings(
  id uuid primary key default gen_random_uuid(),
  dealer_code_id uuid not null references public.dealer_codes(id) on delete cascade,
  asset text not null default 'USDT',
  network text not null default 'TRC20',
  deposit_address text,
  withdraw_address text,
  note text not null default '',
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique(dealer_code_id,asset,network)
);

create table if not exists public.dealer_audit_logs(
  id uuid primary key default gen_random_uuid(),
  dealer_code_id uuid not null references public.dealer_codes(id) on delete cascade,
  dealer_user_id uuid not null references auth.users(id),
  action text not null,
  target_type text not null,
  target_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.dealer_codes enable row level security;
alter table public.dealer_members enable row level security;
alter table public.dealer_payment_settings enable row level security;
alter table public.dealer_audit_logs enable row level security;

create or replace function public.is_dealer_user()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.dealer_codes d where d.owner_user_id=auth.uid() and d.active);
$$;

create or replace function private.current_dealer_code_id()
returns uuid language sql stable security definer set search_path='' as $$
  select d.id from public.dealer_codes d where d.owner_user_id=auth.uid() and d.active limit 1;
$$;

create or replace function private.dealer_owns_user(p_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.dealer_members m
    join public.dealer_codes d on d.id=m.dealer_code_id
    where m.user_id=p_user and d.owner_user_id=auth.uid() and d.active
  );
$$;

drop policy if exists dealer_codes_owner_read on public.dealer_codes;
create policy dealer_codes_owner_read on public.dealer_codes for select to authenticated
using(owner_user_id=auth.uid() or public.is_admin_user());

drop policy if exists dealer_members_owner_read on public.dealer_members;
create policy dealer_members_owner_read on public.dealer_members for select to authenticated
using(public.is_admin_user() or dealer_code_id=private.current_dealer_code_id());

drop policy if exists dealer_payment_owner_all on public.dealer_payment_settings;
create policy dealer_payment_owner_all on public.dealer_payment_settings for select to authenticated
using(public.is_admin_user() or dealer_code_id=private.current_dealer_code_id());

drop policy if exists dealer_audit_owner_read on public.dealer_audit_logs;
create policy dealer_audit_owner_read on public.dealer_audit_logs for select to authenticated
using(public.is_admin_user() or dealer_code_id=private.current_dealer_code_id());

create or replace function private.capture_signup_dealer_code()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_code text; v_dealer public.dealer_codes%rowtype;
begin
  v_code:=upper(trim(coalesce(new.raw_user_meta_data->>'signup_code','')));
  if v_code='' then return new; end if;
  select * into v_dealer from public.dealer_codes where code=v_code and active limit 1;
  if not found then return new; end if;
  insert into public.dealer_members(dealer_code_id,user_id,signup_code)
  values(v_dealer.id,new.id,v_code) on conflict(user_id) do nothing;
  return new;
end $$;

drop trigger if exists trg_capture_signup_dealer_code on auth.users;
create trigger trg_capture_signup_dealer_code after insert on auth.users
for each row execute function private.capture_signup_dealer_code();

create or replace function public.validate_signup_code(p_code text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.dealer_codes%rowtype;
begin
  if nullif(trim(coalesce(p_code,'')),'') is null then return jsonb_build_object('valid',true,'optional',true); end if;
  select * into d from public.dealer_codes where code=upper(trim(p_code)) and active;
  if not found then return jsonb_build_object('valid',false); end if;
  return jsonb_build_object('valid',true,'display_name',d.display_name,'code',d.code);
end $$;

create or replace function public.admin_dealer_snapshot()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin_user() then raise exception 'admin_required'; end if;
 return jsonb_build_object('dealers',(
   select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb)
   from (
     select d.*,u.email,(select count(*) from public.dealer_members m where m.dealer_code_id=d.id) member_count
     from public.dealer_codes d join auth.users u on u.id=d.owner_user_id
   ) x
 ));
end $$;

create or replace function public.admin_upsert_dealer_code(
 p_owner_email text,p_code text,p_display_name text default '',p_active boolean default true
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid; v public.dealer_codes;
begin
 if not public.is_admin_user() then raise exception 'admin_required'; end if;
 select id into v_user from auth.users where lower(email)=lower(trim(p_owner_email)) limit 1;
 if v_user is null then raise exception 'user_not_found'; end if;
 if length(trim(coalesce(p_code,'')))<3 then raise exception 'invalid_code'; end if;
 insert into public.dealer_codes(code,owner_user_id,display_name,active,created_by)
 values(upper(trim(p_code)),v_user,coalesce(p_display_name,''),coalesce(p_active,true),auth.uid())
 on conflict(owner_user_id) do update set code=excluded.code,display_name=excluded.display_name,active=excluded.active,updated_at=now()
 returning * into v;
 insert into public.admin_logs(admin_user_id,action,target_type,target_id,after_value)
 values(auth.uid(),'DEALER_CODE_UPSERT','dealer_code',v.id::text,to_jsonb(v));
 return to_jsonb(v);
end $$;

create or replace function public.admin_set_dealer_active(p_id uuid,p_active boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin_user() then raise exception 'admin_required'; end if;
 update public.dealer_codes set active=p_active,updated_at=now() where id=p_id;
 if not found then raise exception 'dealer_not_found'; end if;
 insert into public.admin_logs(admin_user_id,action,target_type,target_id,after_value)
 values(auth.uid(),'DEALER_ACTIVE_UPDATE','dealer_code',p_id::text,jsonb_build_object('active',p_active));
end $$;

create or replace function public.dealer_portal_snapshot()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid:=private.current_dealer_code_id(); v_code public.dealer_codes%rowtype;
begin
 if v_id is null then raise exception 'dealer_required'; end if;
 select * into v_code from public.dealer_codes where id=v_id;
 return jsonb_build_object(
  'dealer',to_jsonb(v_code),
  'settings',(select coalesce(jsonb_agg(to_jsonb(s) order by s.asset,s.network),'[]'::jsonb) from public.dealer_payment_settings s where s.dealer_code_id=v_id),
  'members',(select coalesce(jsonb_agg(to_jsonb(x) order by x.joined_at desc),'[]'::jsonb) from (
    select m.user_id,m.joined_at,u.email,coalesce(b.available,0) usdt_available,coalesce(b.locked,0) usdt_locked
    from public.dealer_members m join auth.users u on u.id=m.user_id
    left join public.demo_balances b on b.user_id=m.user_id and b.asset='USDT' where m.dealer_code_id=v_id
  ) x),
  'deposits',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from (
    select r.*,u.email from public.deposit_records r join public.dealer_members m on m.user_id=r.user_id and m.dealer_code_id=v_id
    join auth.users u on u.id=r.user_id order by r.created_at desc limit 200
  ) x),
  'withdrawals',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from (
    select w.*,u.email from public.withdrawal_requests w join public.dealer_members m on m.user_id=w.user_id and m.dealer_code_id=v_id
    join auth.users u on u.id=w.user_id order by w.created_at desc limit 200
  ) x),
  'loans',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from (
    select l.*,u.email from public.crypto_loans l join public.dealer_members m on m.user_id=l.user_id and m.dealer_code_id=v_id
    join auth.users u on u.id=l.user_id order by l.created_at desc limit 200
  ) x),
  'cfd_trades',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from (
    select t.*,u.email,o.override_value,o.reason override_reason,o.updated_at override_updated_at
    from public.cfd_timed_trades t join public.dealer_members m on m.user_id=t.user_id and m.dealer_code_id=v_id
    join auth.users u on u.id=t.user_id left join public.cfd_timed_round_overrides o on o.trade_id=t.id
    order by t.created_at desc limit 200
  ) x)
 );
end $$;

create or replace function public.dealer_set_payment_settings(
 p_asset text,p_network text,p_deposit_address text,p_withdraw_address text,p_note text default ''
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid:=private.current_dealer_code_id(); v public.dealer_payment_settings;
begin
 if v_id is null then raise exception 'dealer_required'; end if;
 insert into public.dealer_payment_settings(dealer_code_id,asset,network,deposit_address,withdraw_address,note,active)
 values(v_id,upper(trim(p_asset)),upper(trim(p_network)),nullif(trim(p_deposit_address),''),nullif(trim(p_withdraw_address),''),coalesce(p_note,''),true)
 on conflict(dealer_code_id,asset,network) do update
 set deposit_address=excluded.deposit_address,withdraw_address=excluded.withdraw_address,note=excluded.note,active=true,updated_at=now()
 returning * into v;
 insert into public.dealer_audit_logs(dealer_code_id,dealer_user_id,action,target_type,target_id,payload)
 values(v_id,auth.uid(),'PAYMENT_SETTINGS_UPDATE','dealer_payment_settings',v.id::text,to_jsonb(v));
 return to_jsonb(v);
end $$;

create or replace function public.dealer_update_withdrawal_status(
 p_id uuid,p_status text,p_txid text default null,p_note text default null
) returns void language plpgsql security definer set search_path='' as $$
declare v_id uuid:=private.current_dealer_code_id(); v_row public.withdrawal_requests%rowtype; v_total numeric;
begin
 if v_id is null then raise exception 'dealer_required'; end if;
 select w.* into v_row from public.withdrawal_requests w
 join public.dealer_members m on m.user_id=w.user_id and m.dealer_code_id=v_id
 where w.id=p_id for update;
 if not found then raise exception 'not_allowed'; end if;
 if upper(p_status) not in ('PENDING','REVIEW','APPROVED','REJECTED','SENT','FAILED') then raise exception 'invalid_status'; end if;
 v_total:=v_row.amount+v_row.fee;
 if v_row.status in ('SENT','REJECTED','FAILED') and upper(p_status)<>v_row.status then raise exception 'terminal_status'; end if;
 if upper(p_status) in ('REJECTED','FAILED') and v_row.status not in ('REJECTED','FAILED','SENT') then
   update public.demo_balances set locked=greatest(locked-v_total,0),available=available+v_total,updated_at=now()
   where user_id=v_row.user_id and asset=v_row.asset;
   insert into public.ledger_entries(user_id,mode,asset,amount,entry_type,idempotency_key)
   values(v_row.user_id,'DEMO',v_row.asset,v_total,'withdrawal_release','dealer-withdraw-release-'||p_id::text)
   on conflict(user_id,idempotency_key) do nothing;
 elsif upper(p_status)='SENT' and v_row.status<>'SENT' then
   if coalesce(nullif(trim(p_txid),''),'')='' then raise exception 'txid_required'; end if;
   update public.demo_balances set locked=greatest(locked-v_total,0),updated_at=now() where user_id=v_row.user_id and asset=v_row.asset;
   insert into public.ledger_entries(user_id,mode,asset,amount,entry_type,idempotency_key)
   values(v_row.user_id,'DEMO',v_row.asset,0,'withdrawal_sent','dealer-withdraw-sent-'||p_id::text)
   on conflict(user_id,idempotency_key) do nothing;
 end if;
 update public.withdrawal_requests
 set status=upper(p_status),txid=coalesce(nullif(trim(p_txid),''),txid),note=coalesce(p_note,note),
 reviewed_at=case when upper(p_status) in ('APPROVED','REJECTED','SENT','FAILED') then now() else reviewed_at end,updated_at=now()
 where id=p_id;
 insert into public.dealer_audit_logs(dealer_code_id,dealer_user_id,action,target_type,target_id,payload)
 values(v_id,auth.uid(),'WITHDRAWAL_STATUS_UPDATE','withdrawal',p_id::text,jsonb_build_object('status',upper(p_status),'txid',p_txid,'note',p_note));
end $$;

create or replace function public.dealer_set_cfd_timed_round_override(
 p_trade_id uuid,p_override text,p_reason text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid:=private.current_dealer_code_id(); v_trade public.cfd_timed_trades%rowtype; v_override text:=upper(trim(coalesce(p_override,'AUTO')));
begin
 if v_id is null then raise exception 'dealer_required'; end if;
 if v_override not in ('AUTO','WIN','LOSS','VOID') then raise exception 'invalid_override'; end if;
 if length(trim(coalesce(p_reason,'')))<5 then raise exception 'reason_required'; end if;
 select t.* into v_trade from public.cfd_timed_trades t
 join public.dealer_members m on m.user_id=t.user_id and m.dealer_code_id=v_id
 where t.id=p_trade_id for update;
 if not found then raise exception 'not_allowed'; end if;
 if v_trade.status<>'ACTIVE' then raise exception 'trade_already_finalized'; end if;
 if v_override='AUTO' then delete from public.cfd_timed_round_overrides where trade_id=p_trade_id;
 else
   insert into public.cfd_timed_round_overrides(trade_id,override_value,reason,admin_user_id)
   values(p_trade_id,v_override,trim(p_reason),auth.uid())
   on conflict(trade_id) do update set override_value=excluded.override_value,reason=excluded.reason,admin_user_id=excluded.admin_user_id,updated_at=now();
 end if;
 insert into public.dealer_audit_logs(dealer_code_id,dealer_user_id,action,target_type,target_id,payload)
 values(v_id,auth.uid(),'CFD_ROUND_DECISION_OVERRIDE','cfd_timed_trade',p_trade_id::text,jsonb_build_object('override_value',v_override,'reason',trim(p_reason)));
 return jsonb_build_object('trade_id',p_trade_id,'override_value',v_override,'saved',true);
end $$;

create or replace function public.dealer_approve_crypto_loan(p_loan uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_id uuid:=private.current_dealer_code_id(); v_loan public.crypto_loans%rowtype; v_product public.crypto_loan_products%rowtype;
 v_collateral public.crypto_loan_collaterals%rowtype; v_current_price numeric; v_current_value numeric; v_account_value numeric; v_pending numeric; v_reserve numeric;
begin
 if v_id is null then raise exception 'dealer_required'; end if;
 select l.* into v_loan from public.crypto_loans l join public.dealer_members m on m.user_id=l.user_id and m.dealer_code_id=v_id where l.id=p_loan for update;
 if not found then raise exception 'not_allowed'; end if;
 if v_loan.status<>'PENDING' then raise exception 'LOAN_NOT_PENDING'; end if;
 select * into v_product from public.crypto_loan_products where id=v_loan.product_id for share;
 if not found or v_product.status<>'ACTIVE' then raise exception 'LOAN_PRODUCT_UNAVAILABLE'; end if;
 select * into v_collateral from public.crypto_loan_collaterals where loan_id=v_loan.id for update;
 if not found or v_collateral.status<>'RESERVED' then raise exception 'COLLATERAL_NOT_RESERVED'; end if;
 v_current_price:=private.crypto_loan_market_price(v_collateral.asset_symbol);
 v_current_value:=v_current_price*v_collateral.quantity;
 if v_loan.principal>v_current_value*v_product.max_ltv then raise exception 'CURRENT_COLLATERAL_VALUE_INSUFFICIENT'; end if;
 v_account_value:=private.crypto_loan_account_value(v_loan.user_id);
 v_pending:=private.crypto_loan_pending_withdrawal_value(v_loan.user_id);
 v_reserve:=private.crypto_loan_reserved_value(v_loan.user_id);
 if v_account_value-v_pending<v_reserve then raise exception 'CURRENT_ACCOUNT_VALUE_INSUFFICIENT'; end if;
 insert into public.demo_balances(user_id,asset,available,locked) values(v_loan.user_id,'USDT',0,0) on conflict(user_id,asset) do nothing;
 update public.demo_balances set available=available+v_loan.principal,updated_at=now() where user_id=v_loan.user_id and asset='USDT';
 update public.crypto_loan_collaterals set status='ACTIVE',activated_at=now(),current_price=v_current_price,current_value=v_current_value,updated_at=now() where id=v_collateral.id;
 update public.crypto_loans set status='ACTIVE',approved_at=now(),approved_by=auth.uid(),funded_at=now(),
 due_at=now()+make_interval(days=>coalesce(term_days,7)),current_collateral_price=v_current_price,current_collateral_value=v_current_value,
 current_ltv=case when v_current_value>0 then principal/v_current_value else null end,provider_status='DEALER_FUNDED',
 disbursement_ref='DEALER:'||v_loan.id::text,updated_at=now() where id=v_loan.id;
 insert into public.ledger_entries(user_id,mode,asset,amount,entry_type,reference_id,idempotency_key)
 values(v_loan.user_id,'DEMO','USDT',v_loan.principal,'loan_disbursement',v_loan.id,'dealer-loan-disbursement:'||v_loan.id::text)
 on conflict(user_id,idempotency_key) do nothing;
 insert into public.crypto_loan_events(loan_id,user_id,event_type,payload,actor_type,actor_id)
 values(v_loan.id,v_loan.user_id,'LOAN_APPROVED',jsonb_build_object('principal',v_loan.principal,'dealer_code_id',v_id),'DEALER',auth.uid());
 insert into public.dealer_audit_logs(dealer_code_id,dealer_user_id,action,target_type,target_id,payload)
 values(v_id,auth.uid(),'CRYPTO_LOAN_APPROVE','crypto_loan',v_loan.id::text,jsonb_build_object('principal',v_loan.principal));
 return jsonb_build_object('loan_id',v_loan.id,'status','ACTIVE','disbursed',v_loan.principal);
end $$;

create or replace function public.dealer_reject_crypto_loan(p_loan uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid:=private.current_dealer_code_id(); v_loan public.crypto_loans%rowtype; v_collateral public.crypto_loan_collaterals%rowtype;
begin
 if v_id is null then raise exception 'dealer_required'; end if;
 select l.* into v_loan from public.crypto_loans l join public.dealer_members m on m.user_id=l.user_id and m.dealer_code_id=v_id where l.id=p_loan for update;
 if not found then raise exception 'not_allowed'; end if;
 if v_loan.status<>'PENDING' then raise exception 'LOAN_NOT_PENDING'; end if;
 select * into v_collateral from public.crypto_loan_collaterals where loan_id=v_loan.id for update;
 if found and v_collateral.status='RESERVED' then update public.crypto_loan_collaterals set status='RELEASED',released_at=now(),updated_at=now() where id=v_collateral.id; end if;
 update public.crypto_loans set status='REJECTED',rejected_at=now(),rejected_by=auth.uid(),
 rejection_reason=coalesce(nullif(trim(p_reason),''),'총판 거절'),failure_reason=coalesce(nullif(trim(p_reason),''),'총판 거절'),closed_at=now(),updated_at=now()
 where id=v_loan.id;
 insert into public.crypto_loan_events(loan_id,user_id,event_type,payload,actor_type,actor_id)
 values(v_loan.id,v_loan.user_id,'LOAN_REJECTED',jsonb_build_object('reason',coalesce(nullif(trim(p_reason),''),'총판 거절'),'dealer_code_id',v_id),'DEALER',auth.uid());
 insert into public.dealer_audit_logs(dealer_code_id,dealer_user_id,action,target_type,target_id,payload)
 values(v_id,auth.uid(),'CRYPTO_LOAN_REJECT','crypto_loan',v_loan.id::text,jsonb_build_object('reason',p_reason));
 return jsonb_build_object('loan_id',v_loan.id,'status','REJECTED');
end $$;

create or replace function public.user_deposit_access_snapshot()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_kyc text:='NOT_SUBMITTED'; v_addresses jsonb; v_dealer uuid;
begin
 if auth.uid() is null then raise exception 'auth_required'; end if;
 select coalesce((select k.status from public.kyc_requests k where k.user_id=auth.uid() order by k.submitted_at desc limit 1),'NOT_SUBMITTED') into v_kyc;
 select m.dealer_code_id into v_dealer from public.dealer_members m where m.user_id=auth.uid() limit 1;
 if v_dealer is not null then
   select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'asset',s.asset,'network',s.network,'address',s.deposit_address,'provider','DEALER','active',s.active,'scan_from',s.updated_at) order by s.asset,s.network),'[]'::jsonb)
   into v_addresses from public.dealer_payment_settings s where s.dealer_code_id=v_dealer and s.active and nullif(s.deposit_address,'') is not null;
 else
   select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'asset',d.asset,'network',d.network,'address',d.address,'provider',d.provider,'active',d.active,'scan_from',d.scan_from) order by d.asset,d.network),'[]'::jsonb)
   into v_addresses from public.deposit_addresses d where d.user_id=auth.uid() and d.active;
 end if;
 return jsonb_build_object('kyc_status',v_kyc,'addresses',v_addresses,'dealer_managed',v_dealer is not null,
 'kyc_exempt',jsonb_build_array(jsonb_build_object('asset','USDT','network','TRC20'),jsonb_build_object('asset','TRX','network','TRC20')));
end $$;

create or replace function public.user_withdrawal_assignment()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_dealer uuid; v_rows jsonb;
begin
 if auth.uid() is null then raise exception 'auth_required'; end if;
 select m.dealer_code_id into v_dealer from public.dealer_members m where m.user_id=auth.uid() limit 1;
 if v_dealer is null then return jsonb_build_object('dealer_managed',false,'addresses','[]'::jsonb); end if;
 select coalesce(jsonb_agg(jsonb_build_object('asset',s.asset,'network',s.network,'address',s.withdraw_address) order by s.asset,s.network),'[]'::jsonb)
 into v_rows from public.dealer_payment_settings s where s.dealer_code_id=v_dealer and s.active and nullif(s.withdraw_address,'') is not null;
 return jsonb_build_object('dealer_managed',true,'addresses',v_rows);
end $$;

revoke all on function public.validate_signup_code(text),public.admin_dealer_snapshot(),public.admin_upsert_dealer_code(text,text,text,boolean),
 public.admin_set_dealer_active(uuid,boolean),public.dealer_portal_snapshot(),public.dealer_set_payment_settings(text,text,text,text,text),
 public.dealer_update_withdrawal_status(uuid,text,text,text),public.dealer_set_cfd_timed_round_override(uuid,text,text),
 public.dealer_approve_crypto_loan(uuid),public.dealer_reject_crypto_loan(uuid,text),public.user_withdrawal_assignment()
from public,anon;

grant execute on function public.validate_signup_code(text) to anon,authenticated;
grant execute on function public.admin_dealer_snapshot(),public.admin_upsert_dealer_code(text,text,text,boolean),public.admin_set_dealer_active(uuid,boolean) to authenticated;
grant execute on function public.dealer_portal_snapshot(),public.dealer_set_payment_settings(text,text,text,text,text),
 public.dealer_update_withdrawal_status(uuid,text,text,text),public.dealer_set_cfd_timed_round_override(uuid,text,text),
 public.dealer_approve_crypto_loan(uuid),public.dealer_reject_crypto_loan(uuid,text),public.user_withdrawal_assignment()
to authenticated;
