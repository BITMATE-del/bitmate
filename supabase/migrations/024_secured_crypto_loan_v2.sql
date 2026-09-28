-- BITMATE secured crypto loan v2
-- Adds the 7-day collateralized loan product, collateral locking, direct repayment,
-- extensions, overdue review/approval, collateral seizure, admin controls and audit-safe ledgers.

alter table public.crypto_loan_products
  add column if not exists description text,
  add column if not exists max_ltv numeric,
  add column if not exists base_interest_rate numeric,
  add column if not exists overdue_interest_rate numeric,
  add column if not exists interest_rate_type text,
  add column if not exists extension_allowed boolean not null default true,
  add column if not exists allowed_collateral_assets text[] not null default array[]::text[];

update public.crypto_loan_products
set max_ltv=coalesce(max_ltv,initial_ltv),
    base_interest_rate=coalesce(base_interest_rate,0.01),
    overdue_interest_rate=coalesce(overdue_interest_rate,0.028),
    interest_rate_type=coalesce(interest_rate_type,'FIXED_TERM')
where max_ltv is null
   or base_interest_rate is null
   or overdue_interest_rate is null
   or interest_rate_type is null;

alter table public.crypto_loan_products
  alter column max_ltv set not null,
  alter column base_interest_rate set not null,
  alter column overdue_interest_rate set not null,
  alter column interest_rate_type set not null;

alter table public.crypto_loans
  add column if not exists interest_rate numeric,
  add column if not exists overdue_interest_rate numeric,
  add column if not exists interest_rate_type text,
  add column if not exists interest_amount numeric not null default 0,
  add column if not exists total_repayment_amount numeric not null default 0,
  add column if not exists overdue_at timestamptz,
  add column if not exists extension_requested_at timestamptz,
  add column if not exists extension_count integer not null default 0;

alter table public.crypto_loans drop constraint if exists crypto_loans_status_check;
alter table public.crypto_loans add constraint crypto_loans_status_check
check (status in (
  'PENDING','APPROVED','ACTIVE',
  'EXTENSION_REQUESTED','EXTENSION_OFFERED','EXTENDED',
  'OVERDUE_REVIEW','OVERDUE',
  'REPAID','COLLATERAL_SEIZED','CANCELLED',
  'REQUESTED','COLLATERAL_PENDING','PROVIDER_PENDING',
  'MARGIN_CALL','REPAYMENT_PENDING','LIQUIDATION_PENDING','LIQUIDATING',
  'CLOSED','REJECTED','FAILED','CANCELED'
));

create table if not exists public.crypto_loan_collaterals(
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null unique references public.crypto_loans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_symbol text not null,
  quantity numeric not null check(quantity>0),
  initial_price numeric not null check(initial_price>0),
  initial_value numeric not null check(initial_value>0),
  current_price numeric,
  current_value numeric,
  status text not null default 'LOCKED' check(status in ('LOCKED','RELEASED','SEIZED')),
  locked_at timestamptz not null default now(),
  released_at timestamptz,
  seized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crypto_loan_extensions(
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.crypto_loans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  requested_by text not null default 'MEMBER',
  old_due_at timestamptz not null,
  new_due_at timestamptz,
  old_interest_rate numeric not null,
  new_interest_rate numeric,
  additional_interest numeric,
  admin_note text,
  status text not null default 'REQUESTED' check(status in ('REQUESTED','OFFERED','ACCEPTED','REJECTED','CANCELLED')),
  offered_by uuid references auth.users(id),
  approved_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.crypto_loan_collaterals enable row level security;
alter table public.crypto_loan_extensions enable row level security;

drop policy if exists crypto_loan_collaterals_self_read on public.crypto_loan_collaterals;
create policy crypto_loan_collaterals_self_read on public.crypto_loan_collaterals
for select to authenticated using (auth.uid()=user_id);

drop policy if exists crypto_loan_extensions_self_read on public.crypto_loan_extensions;
create policy crypto_loan_extensions_self_read on public.crypto_loan_extensions
for select to authenticated using (auth.uid()=user_id);

alter table public.ledger_entries drop constraint if exists ledger_entries_entry_type_check;
alter table public.ledger_entries add constraint ledger_entries_entry_type_check check (
  entry_type in (
    'deposit','withdrawal','trade','fee','reward','adjustment','deposit_credit',
    'internal_transfer','withdrawal_hold','withdrawal_release','withdrawal_sent',
    'admin_balance_adjustment',
    'loan_disbursement','loan_repayment','loan_interest',
    'collateral_lock','collateral_release','collateral_seizure'
  )
);

create or replace function public.get_crypto_loan_collateral_options(p_product uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid:=auth.uid();
  v_product public.crypto_loan_products%rowtype;
  v_rows jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_product from public.crypto_loan_products where id=p_product and status='ACTIVE' and visible=true;
  if not found then raise exception 'LOAN_PRODUCT_UNAVAILABLE'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'asset',b.asset,'available',b.available,'locked',b.locked,'total',b.available+b.locked,
    'price',private.crypto_loan_market_price(b.asset),
    'available_value',b.available*private.crypto_loan_market_price(b.asset),
    'max_borrow',b.available*private.crypto_loan_market_price(b.asset)*v_product.max_ltv
  ) order by b.asset),'[]'::jsonb)
  into v_rows
  from public.demo_balances b
  where b.user_id=v_uid and b.available>0
    and (cardinality(v_product.allowed_collateral_assets)=0 or upper(b.asset)=any(v_product.allowed_collateral_assets));
  return jsonb_build_object(
    'product_id',v_product.id,'max_ltv',v_product.max_ltv,
    'base_interest_rate',v_product.base_interest_rate,'overdue_interest_rate',v_product.overdue_interest_rate,
    'interest_rate_type',v_product.interest_rate_type,'term_days',v_product.term_days,'assets',v_rows
  );
end;
$$;

create or replace function public.get_crypto_loan_quote_v2(
  p_product uuid,p_collateral_asset text,p_collateral_quantity numeric,p_principal numeric
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid:=auth.uid(); v_product public.crypto_loan_products%rowtype;
  v_balance public.demo_balances%rowtype; v_asset text:=upper(trim(p_collateral_asset));
  v_price numeric; v_value numeric; v_max numeric; v_interest numeric;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if coalesce(p_collateral_quantity,0)<=0 then raise exception 'INVALID_COLLATERAL'; end if;
  if coalesce(p_principal,0)<=0 then raise exception 'INVALID_LOAN_AMOUNT'; end if;
  select * into v_product from public.crypto_loan_products where id=p_product and status='ACTIVE' and visible=true;
  if not found then raise exception 'LOAN_PRODUCT_UNAVAILABLE'; end if;
  if cardinality(v_product.allowed_collateral_assets)>0 and not (v_asset=any(v_product.allowed_collateral_assets)) then raise exception 'COLLATERAL_ASSET_NOT_ALLOWED'; end if;
  select * into v_balance from public.demo_balances where user_id=v_uid and upper(asset)=v_asset for share;
  if not found or v_balance.available<p_collateral_quantity then raise exception 'INSUFFICIENT_COLLATERAL_BALANCE'; end if;
  v_price:=private.crypto_loan_market_price(v_asset);
  v_value:=round(p_collateral_quantity*v_price,10);
  v_max:=round(v_value*v_product.max_ltv,10);
  if p_principal>v_max then raise exception 'LTV_LIMIT_EXCEEDED'; end if;
  if p_principal<v_product.min_borrow or (v_product.max_borrow is not null and p_principal>v_product.max_borrow) then raise exception 'BORROW_AMOUNT_OUT_OF_RANGE'; end if;
  v_interest:=round(p_principal*v_product.base_interest_rate,10);
  return jsonb_build_object(
    'product_id',v_product.id,'collateral_asset',v_asset,'collateral_quantity',p_collateral_quantity,
    'collateral_price',v_price,'collateral_value',v_value,'max_ltv',v_product.max_ltv,'max_borrow',v_max,
    'principal',p_principal,'base_interest_rate',v_product.base_interest_rate,
    'overdue_interest_rate',v_product.overdue_interest_rate,'interest_rate_type',v_product.interest_rate_type,
    'term_days',v_product.term_days,'estimated_interest',v_interest,
    'total_repayment_amount',p_principal+v_interest,
    'due_at',now()+make_interval(days=>coalesce(v_product.term_days,7))
  );
end;
$$;

create or replace function public.apply_crypto_loan_v2(
  p_product uuid,p_collateral_asset text,p_collateral_quantity numeric,p_principal numeric,p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid:=auth.uid(); v_product public.crypto_loan_products%rowtype;
  v_balance public.demo_balances%rowtype; v_asset text:=upper(trim(p_collateral_asset));
  v_price numeric; v_value numeric; v_max numeric; v_interest numeric; v_loan uuid; v_loan_no text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_idempotency_key is null or length(p_idempotency_key)<8 then raise exception 'IDEMPOTENCY_REQUIRED'; end if;
  select id into v_loan from public.crypto_loans where user_id=v_uid and idempotency_key=p_idempotency_key;
  if v_loan is not null then return v_loan; end if;
  select * into v_product from public.crypto_loan_products where id=p_product and status='ACTIVE' and visible=true for share;
  if not found then raise exception 'LOAN_PRODUCT_UNAVAILABLE'; end if;
  if coalesce(p_collateral_quantity,0)<=0 then raise exception 'INVALID_COLLATERAL'; end if;
  if coalesce(p_principal,0)<=0 then raise exception 'INVALID_LOAN_AMOUNT'; end if;
  if cardinality(v_product.allowed_collateral_assets)>0 and not (v_asset=any(v_product.allowed_collateral_assets)) then raise exception 'COLLATERAL_ASSET_NOT_ALLOWED'; end if;
  select * into v_balance from public.demo_balances where user_id=v_uid and upper(asset)=v_asset for update;
  if not found or v_balance.available<p_collateral_quantity then raise exception 'INSUFFICIENT_COLLATERAL_BALANCE'; end if;
  v_price:=private.crypto_loan_market_price(v_asset);
  v_value:=round(p_collateral_quantity*v_price,10);
  v_max:=round(v_value*v_product.max_ltv,10);
  if p_principal>v_max then raise exception 'LTV_LIMIT_EXCEEDED'; end if;
  if p_principal<v_product.min_borrow or (v_product.max_borrow is not null and p_principal>v_product.max_borrow) then raise exception 'BORROW_AMOUNT_OUT_OF_RANGE'; end if;
  v_interest:=round(p_principal*v_product.base_interest_rate,10);
  v_loan_no:='LOAN-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.crypto_loans(
    loan_no,user_id,product_id,borrow_asset,collateral_asset,principal,collateral_quantity,
    collateral_price_at_request,collateral_value_at_request,initial_ltv,margin_call_ltv,liquidation_ltv,
    hourly_rate,annual_rate,term_mode,term_days,current_collateral_price,current_collateral_value,current_ltv,
    status,terms_accepted_at,idempotency_key,interest_rate,overdue_interest_rate,interest_rate_type,
    interest_amount,total_repayment_amount
  )
  values(
    v_loan_no,v_uid,v_product.id,v_product.borrow_asset,v_asset,p_principal,p_collateral_quantity,
    v_price,v_value,v_product.max_ltv,v_product.margin_call_ltv,v_product.liquidation_ltv,
    coalesce(v_product.hourly_rate,0),v_product.annual_rate,'FIXED',coalesce(v_product.term_days,7),
    v_price,v_value,p_principal/v_value,'PENDING',now(),p_idempotency_key,
    v_product.base_interest_rate,v_product.overdue_interest_rate,v_product.interest_rate_type,
    v_interest,p_principal+v_interest
  ) returning id into v_loan;
  update public.demo_balances set available=available-p_collateral_quantity,locked=locked+p_collateral_quantity,updated_at=now() where id=v_balance.id;
  insert into public.crypto_loan_collaterals(loan_id,user_id,asset_symbol,quantity,initial_price,initial_value,current_price,current_value,status)
  values(v_loan,v_uid,v_asset,p_collateral_quantity,v_price,v_value,v_price,v_value,'LOCKED');
  insert into public.ledger_entries(user_id,mode,asset,amount,entry_type,reference_id,idempotency_key)
  values(v_uid,'DEMO',v_asset,0,'collateral_lock',v_loan,'loan-collateral-lock:'||p_idempotency_key)
  on conflict(user_id,idempotency_key) do nothing;
  insert into public.crypto_loan_events(loan_id,user_id,event_type,payload)
  values
    (v_loan,v_uid,'LOAN_REQUESTED',jsonb_build_object('principal',p_principal,'max_ltv',v_product.max_ltv,'collateral_value',v_value)),
    (v_loan,v_uid,'COLLATERAL_LOCKED',jsonb_build_object('asset',v_asset,'quantity',p_collateral_quantity,'price',v_price,'value',v_value));
  return v_loan;
exception when unique_violation then
  select id into v_loan from public.crypto_loans where user_id=v_uid and idempotency_key=p_idempotency_key;
  if v_loan is not null then return v_loan; end if;
  raise;
end;
$$;

create or replace function public.repay_crypto_loan_now(p_loan uuid,p_idempotency_key text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid:=auth.uid(); v_loan public.crypto_loans%rowtype;
  v_collateral public.crypto_loan_collaterals%rowtype; v_wallet public.demo_balances%rowtype;
  v_due numeric; v_interest_due numeric;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_loan from public.crypto_loans where id=p_loan and user_id=v_uid for update;
  if not found then raise exception 'LOAN_NOT_FOUND'; end if;
  if v_loan.status not in ('ACTIVE','EXTENDED','OVERDUE_REVIEW','OVERDUE','EXTENSION_REQUESTED','EXTENSION_OFFERED') then raise exception 'LOAN_NOT_REPAYABLE'; end if;
  select * into v_collateral from public.crypto_loan_collaterals where loan_id=v_loan.id for update;
  if not found or v_collateral.status<>'LOCKED' then raise exception 'COLLATERAL_NOT_LOCKED'; end if;
  v_interest_due:=greatest(v_loan.interest_amount-v_loan.repaid_interest,0);
  v_due:=greatest(v_loan.principal-v_loan.repaid_principal,0)+v_interest_due;
  select * into v_wallet from public.demo_balances where user_id=v_uid and asset='USDT' for update;
  if not found or v_wallet.available<v_due then raise exception 'INSUFFICIENT_BALANCE'; end if;
  update public.demo_balances set available=available-v_due,updated_at=now() where id=v_wallet.id;
  update public.demo_balances set available=available+v_collateral.quantity,locked=greatest(0,locked-v_collateral.quantity),updated_at=now()
  where user_id=v_uid and upper(asset)=upper(v_collateral.asset_symbol);
  update public.crypto_loan_collaterals set status='RELEASED',released_at=now(),updated_at=now() where id=v_collateral.id;
  update public.crypto_loans set status='REPAID',repaid_principal=principal,repaid_interest=interest_amount,repaid_at=now(),updated_at=now() where id=v_loan.id;
  insert into public.crypto_loan_payments(loan_id,user_id,payment_type,principal_amount,interest_amount,total_amount,asset,status,idempotency_key,completed_at)
  values(v_loan.id,v_uid,'REPAYMENT',greatest(v_loan.principal-v_loan.repaid_principal,0),v_interest_due,v_due,'USDT','COMPLETED',p_idempotency_key,now());
  insert into public.ledger_entries(user_id,mode,asset,amount,entry_type,reference_id,idempotency_key)
  values
    (v_uid,'DEMO','USDT',-greatest(v_loan.principal-v_loan.repaid_principal,0),'loan_repayment',v_loan.id,'loan-repay-principal:'||p_idempotency_key),
    (v_uid,'DEMO','USDT',-v_interest_due,'loan_interest',v_loan.id,'loan-repay-interest:'||p_idempotency_key),
    (v_uid,'DEMO',v_collateral.asset_symbol,0,'collateral_release',v_loan.id,'loan-collateral-release:'||p_idempotency_key)
  on conflict(user_id,idempotency_key) do nothing;
  insert into public.crypto_loan_events(loan_id,user_id,event_type,payload)
  values
    (v_loan.id,v_uid,'REPAID',jsonb_build_object('total_amount',v_due,'principal',v_loan.principal,'interest',v_interest_due)),
    (v_loan.id,v_uid,'COLLATERAL_RELEASED',jsonb_build_object('asset',v_collateral.asset_symbol,'quantity',v_collateral.quantity));
  return jsonb_build_object('loan_id',v_loan.id,'status','REPAID','paid',v_due,'collateral_released',true);
exception when unique_violation then
  return jsonb_build_object('loan_id',p_loan,'status','REPAID','idempotent',true);
end;
$$;

create or replace function public.request_crypto_loan_extension_v2(p_loan uuid)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare v_uid uuid:=auth.uid(); v_loan public.crypto_loans%rowtype; v_ext uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_loan from public.crypto_loans where id=p_loan and user_id=v_uid for update;
  if not found then raise exception 'LOAN_NOT_FOUND'; end if;
  if v_loan.status not in ('ACTIVE','EXTENDED') then raise exception 'EXTENSION_NOT_AVAILABLE'; end if;
  if v_loan.due_at is null or v_loan.due_at<=now() then raise exception 'LOAN_ALREADY_DUE'; end if;
  if exists(select 1 from public.crypto_loan_extensions where loan_id=v_loan.id and status in ('REQUESTED','OFFERED')) then
    select id into v_ext from public.crypto_loan_extensions where loan_id=v_loan.id and status in ('REQUESTED','OFFERED') order by created_at desc limit 1;
    return v_ext;
  end if;
  insert into public.crypto_loan_extensions(loan_id,user_id,old_due_at,old_interest_rate,status)
  values(v_loan.id,v_uid,v_loan.due_at,v_loan.interest_rate,'REQUESTED') returning id into v_ext;
  update public.crypto_loans set status='EXTENSION_REQUESTED',extension_requested_at=now(),updated_at=now() where id=v_loan.id;
  insert into public.crypto_loan_events(loan_id,user_id,event_type,payload)
  values(v_loan.id,v_uid,'EXTENSION_REQUESTED',jsonb_build_object('extension_id',v_ext,'old_due_at',v_loan.due_at));
  return v_ext;
end;
$$;

create or replace function public.accept_crypto_loan_extension(p_extension uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_uid uuid:=auth.uid(); v_ext public.crypto_loan_extensions%rowtype; v_loan public.crypto_loans%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_ext from public.crypto_loan_extensions where id=p_extension and user_id=v_uid for update;
  if not found or v_ext.status<>'OFFERED' then raise exception 'EXTENSION_OFFER_NOT_AVAILABLE'; end if;
  select * into v_loan from public.crypto_loans where id=v_ext.loan_id and user_id=v_uid for update;
  if not found or v_loan.status<>'EXTENSION_OFFERED' then raise exception 'INVALID_LOAN_STATE'; end if;
  update public.crypto_loan_extensions set status='ACCEPTED',accepted_at=now(),approved_at=coalesce(approved_at,now()),updated_at=now() where id=v_ext.id;
  update public.crypto_loans set status='EXTENDED',due_at=v_ext.new_due_at,interest_rate=v_ext.new_interest_rate,
    interest_amount=interest_amount+coalesce(v_ext.additional_interest,0),
    total_repayment_amount=principal+interest_amount+coalesce(v_ext.additional_interest,0),
    extension_count=extension_count+1,updated_at=now()
  where id=v_loan.id;
  insert into public.crypto_loan_events(loan_id,user_id,event_type,payload)
  values(v_loan.id,v_uid,'EXTENSION_ACCEPTED',jsonb_build_object('extension_id',v_ext.id,'new_due_at',v_ext.new_due_at,'new_interest_rate',v_ext.new_interest_rate,'additional_interest',v_ext.additional_interest));
  return jsonb_build_object('loan_id',v_loan.id,'status','EXTENDED','new_due_at',v_ext.new_due_at);
end;
$$;

create or replace function public.admin_offer_crypto_loan_extension(
  p_extension uuid,p_additional_days integer,p_new_interest_rate numeric,p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_admin uuid:=auth.uid(); v_ext public.crypto_loan_extensions%rowtype; v_loan public.crypto_loans%rowtype;
  v_new_due timestamptz; v_additional_interest numeric;
begin
  if v_admin is null or not private.cfd_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if coalesce(p_additional_days,0)<=0 then raise exception 'INVALID_EXTENSION_DAYS'; end if;
  if coalesce(p_new_interest_rate,0)<0 then raise exception 'INVALID_INTEREST_RATE'; end if;
  select * into v_ext from public.crypto_loan_extensions where id=p_extension for update;
  if not found or v_ext.status<>'REQUESTED' then raise exception 'EXTENSION_NOT_REQUESTED'; end if;
  select * into v_loan from public.crypto_loans where id=v_ext.loan_id for update;
  if not found or v_loan.status<>'EXTENSION_REQUESTED' then raise exception 'INVALID_LOAN_STATE'; end if;
  v_new_due:=v_ext.old_due_at+make_interval(days=>p_additional_days);
  v_additional_interest:=round(v_loan.principal*p_new_interest_rate,10);
  update public.crypto_loan_extensions
  set status='OFFERED',new_due_at=v_new_due,new_interest_rate=p_new_interest_rate,
      additional_interest=v_additional_interest,admin_note=p_admin_note,offered_by=v_admin,approved_at=now(),updated_at=now()
  where id=v_ext.id;
  update public.crypto_loans set status='EXTENSION_OFFERED',updated_at=now() where id=v_loan.id;
  insert into public.crypto_loan_events(loan_id,user_id,event_type,payload,actor_type,actor_id)
  values(v_loan.id,v_loan.user_id,'EXTENSION_OFFERED',jsonb_build_object('extension_id',v_ext.id,'additional_days',p_additional_days,'new_due_at',v_new_due,'new_interest_rate',p_new_interest_rate,'additional_interest',v_additional_interest),'ADMIN',v_admin);
  insert into public.admin_logs(admin_user_id,action,target_type,target_id,after_value)
  values(v_admin,'CRYPTO_LOAN_EXTENSION_OFFER','crypto_loan',v_loan.id::text,jsonb_build_object('extension_id',v_ext.id,'new_due_at',v_new_due,'new_interest_rate',p_new_interest_rate,'additional_interest',v_additional_interest));
  return jsonb_build_object('loan_id',v_loan.id,'extension_id',v_ext.id,'status','EXTENSION_OFFERED');
end;
$$;

create or replace function public.admin_reject_crypto_loan_extension(p_extension uuid,p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_admin uuid:=auth.uid(); v_ext public.crypto_loan_extensions%rowtype;
begin
  if v_admin is null or not private.cfd_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select * into v_ext from public.crypto_loan_extensions where id=p_extension for update;
  if not found or v_ext.status not in ('REQUESTED','OFFERED') then raise exception 'EXTENSION_NOT_PENDING'; end if;
  update public.crypto_loan_extensions set status='REJECTED',admin_note=coalesce(p_note,admin_note),updated_at=now() where id=v_ext.id;
  update public.crypto_loans set status=case when due_at<=now() then 'OVERDUE_REVIEW' else 'ACTIVE' end,updated_at=now()
  where id=v_ext.loan_id and status in ('EXTENSION_REQUESTED','EXTENSION_OFFERED');
  insert into public.admin_logs(admin_user_id,action,target_type,target_id,after_value)
  values(v_admin,'CRYPTO_LOAN_EXTENSION_REJECT','crypto_loan',v_ext.loan_id::text,jsonb_build_object('extension_id',v_ext.id,'note',p_note));
  return jsonb_build_object('loan_id',v_ext.loan_id,'status','EXTENSION_REJECTED');
end;
$$;

create or replace function public.admin_approve_crypto_loan_v2(p_loan uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_admin uuid:=auth.uid(); v_loan public.crypto_loans%rowtype; v_collateral public.crypto_loan_collaterals%rowtype;
begin
  if v_admin is null or not private.cfd_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select * into v_loan from public.crypto_loans where id=p_loan for update;
  if not found then raise exception 'LOAN_NOT_FOUND'; end if;
  if v_loan.status<>'PENDING' then raise exception 'LOAN_NOT_PENDING'; end if;
  select * into v_collateral from public.crypto_loan_collaterals where loan_id=v_loan.id for update;
  if not found or v_collateral.status<>'LOCKED' then raise exception 'COLLATERAL_NOT_LOCKED'; end if;
  insert into public.demo_balances(user_id,asset,available,locked) values(v_loan.user_id,'USDT',0,0) on conflict(user_id,asset) do nothing;
  update public.crypto_loans set status='APPROVED',updated_at=now() where id=v_loan.id;
  update public.demo_balances set available=available+v_loan.principal,updated_at=now() where user_id=v_loan.user_id and asset='USDT';
  update public.crypto_loans
  set status='ACTIVE',funded_at=now(),due_at=now()+make_interval(days=>coalesce(term_days,7)),
      provider_status='INTERNAL_FUNDED',disbursement_ref='INTERNAL:'||v_loan.id::text,updated_at=now()
  where id=v_loan.id;
  insert into public.ledger_entries(user_id,mode,asset,amount,entry_type,reference_id,idempotency_key)
  values(v_loan.user_id,'DEMO','USDT',v_loan.principal,'loan_disbursement',v_loan.id,'loan-disbursement:'||v_loan.id::text)
  on conflict(user_id,idempotency_key) do nothing;
  insert into public.crypto_loan_events(loan_id,user_id,event_type,payload,actor_type,actor_id)
  values
    (v_loan.id,v_loan.user_id,'LOAN_APPROVED','{}','ADMIN',v_admin),
    (v_loan.id,v_loan.user_id,'LOAN_STARTED',jsonb_build_object('principal',v_loan.principal,'due_at',now()+make_interval(days=>coalesce(v_loan.term_days,7))),'ADMIN',v_admin);
  insert into public.admin_logs(admin_user_id,action,target_type,target_id,after_value)
  values(v_admin,'CRYPTO_LOAN_APPROVE','crypto_loan',v_loan.id::text,jsonb_build_object('status','ACTIVE','principal',v_loan.principal));
  return jsonb_build_object('loan_id',v_loan.id,'status','ACTIVE');
end;
$$;

create or replace function public.admin_reject_crypto_loan_v2(p_loan uuid,p_reason text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_admin uuid:=auth.uid(); v_loan public.crypto_loans%rowtype; v_collateral public.crypto_loan_collaterals%rowtype;
begin
  if v_admin is null or not private.cfd_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select * into v_loan from public.crypto_loans where id=p_loan for update;
  if not found then raise exception 'LOAN_NOT_FOUND'; end if;
  if v_loan.status<>'PENDING' then raise exception 'LOAN_NOT_PENDING'; end if;
  select * into v_collateral from public.crypto_loan_collaterals where loan_id=v_loan.id for update;
  if found and v_collateral.status='LOCKED' then
    update public.demo_balances set available=available+v_collateral.quantity,locked=greatest(0,locked-v_collateral.quantity),updated_at=now()
    where user_id=v_loan.user_id and upper(asset)=upper(v_collateral.asset_symbol);
    update public.crypto_loan_collaterals set status='RELEASED',released_at=now(),updated_at=now() where id=v_collateral.id;
  end if;
  update public.crypto_loans set status='CANCELLED',failure_reason=coalesce(p_reason,'관리자 거절'),closed_at=now(),updated_at=now() where id=v_loan.id;
  insert into public.crypto_loan_events(loan_id,user_id,event_type,payload,actor_type,actor_id)
  values(v_loan.id,v_loan.user_id,'LOAN_REJECTED',jsonb_build_object('reason',p_reason),'ADMIN',v_admin);
  insert into public.admin_logs(admin_user_id,action,target_type,target_id,after_value)
  values(v_admin,'CRYPTO_LOAN_REJECT','crypto_loan',v_loan.id::text,jsonb_build_object('reason',p_reason));
  return jsonb_build_object('loan_id',v_loan.id,'status','CANCELLED');
end;
$$;

create or replace function public.admin_mark_crypto_loan_overdue(p_loan uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_admin uuid:=auth.uid(); v_loan public.crypto_loans%rowtype; v_interest numeric;
begin
  if v_admin is null or not private.cfd_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select * into v_loan from public.crypto_loans where id=p_loan for update;
  if not found then raise exception 'LOAN_NOT_FOUND'; end if;
  if v_loan.status<>'OVERDUE_REVIEW' then raise exception 'LOAN_NOT_IN_OVERDUE_REVIEW'; end if;
  v_interest:=greatest(v_loan.interest_amount,round(v_loan.principal*v_loan.overdue_interest_rate,10));
  update public.crypto_loans set status='OVERDUE',interest_rate=overdue_interest_rate,interest_amount=v_interest,total_repayment_amount=principal+v_interest,overdue_at=now(),updated_at=now() where id=v_loan.id;
  insert into public.crypto_loan_events(loan_id,user_id,event_type,payload,actor_type,actor_id)
  values(v_loan.id,v_loan.user_id,'OVERDUE_APPROVED',jsonb_build_object('overdue_interest_rate',v_loan.overdue_interest_rate,'interest_amount',v_interest),'ADMIN',v_admin);
  insert into public.admin_logs(admin_user_id,action,target_type,target_id,after_value)
  values(v_admin,'CRYPTO_LOAN_OVERDUE_APPROVE','crypto_loan',v_loan.id::text,jsonb_build_object('overdue_interest_rate',v_loan.overdue_interest_rate,'interest_amount',v_interest));
  return jsonb_build_object('loan_id',v_loan.id,'status','OVERDUE','interest_amount',v_interest);
end;
$$;

create or replace function public.admin_seize_crypto_loan_collateral(p_loan uuid,p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_admin uuid:=auth.uid(); v_loan public.crypto_loans%rowtype; v_collateral public.crypto_loan_collaterals%rowtype;
begin
  if v_admin is null or not private.cfd_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select * into v_loan from public.crypto_loans where id=p_loan for update;
  if not found then raise exception 'LOAN_NOT_FOUND'; end if;
  if v_loan.status='COLLATERAL_SEIZED' then raise exception 'COLLATERAL_ALREADY_SEIZED'; end if;
  if v_loan.status not in ('OVERDUE_REVIEW','OVERDUE') then raise exception 'LOAN_NOT_SEIZABLE'; end if;
  select * into v_collateral from public.crypto_loan_collaterals where loan_id=v_loan.id for update;
  if not found or v_collateral.status<>'LOCKED' then raise exception 'COLLATERAL_NOT_LOCKED'; end if;
  update public.demo_balances set locked=greatest(0,locked-v_collateral.quantity),updated_at=now()
  where user_id=v_loan.user_id and upper(asset)=upper(v_collateral.asset_symbol);
  update public.crypto_loan_collaterals set status='SEIZED',seized_at=now(),updated_at=now() where id=v_collateral.id;
  update public.crypto_loans set status='COLLATERAL_SEIZED',closed_at=now(),failure_reason=coalesce(p_reason,'담보 회수'),updated_at=now() where id=v_loan.id;
  insert into public.ledger_entries(user_id,mode,asset,amount,entry_type,reference_id,idempotency_key)
  values(v_loan.user_id,'DEMO',v_collateral.asset_symbol,0,'collateral_seizure',v_loan.id,'loan-collateral-seizure:'||v_loan.id::text)
  on conflict(user_id,idempotency_key) do nothing;
  insert into public.crypto_loan_events(loan_id,user_id,event_type,payload,actor_type,actor_id)
  values(v_loan.id,v_loan.user_id,'COLLATERAL_SEIZED',jsonb_build_object('asset',v_collateral.asset_symbol,'quantity',v_collateral.quantity,'reason',p_reason),'ADMIN',v_admin);
  insert into public.admin_logs(admin_user_id,action,target_type,target_id,after_value)
  values(v_admin,'CRYPTO_LOAN_COLLATERAL_SEIZE','crypto_loan',v_loan.id::text,jsonb_build_object('asset',v_collateral.asset_symbol,'quantity',v_collateral.quantity,'reason',p_reason));
  return jsonb_build_object('loan_id',v_loan.id,'status','COLLATERAL_SEIZED');
end;
$$;

create or replace function private.crypto_loan_risk_tick()
returns void
language plpgsql
security definer
set search_path=''
as $$
declare v_loan record; v_price numeric; v_value numeric; v_due numeric; v_ltv numeric; v_status text;
begin
  for v_loan in
    select l.*,c.id collateral_id,c.asset_symbol,c.quantity
    from public.crypto_loans l
    join public.crypto_loan_collaterals c on c.loan_id=l.id and c.status='LOCKED'
    where l.status in ('ACTIVE','EXTENDED','EXTENSION_REQUESTED','EXTENSION_OFFERED','OVERDUE_REVIEW','OVERDUE')
  loop
    begin
      v_price:=private.crypto_loan_market_price(v_loan.asset_symbol);
      v_value:=v_price*v_loan.quantity;
      v_due:=greatest(v_loan.principal-v_loan.repaid_principal,0)+greatest(v_loan.interest_amount-v_loan.repaid_interest,0);
      v_ltv:=case when v_value>0 then v_due/v_value else null end;
      v_status:=v_loan.status;
      if v_loan.due_at is not null and v_loan.due_at<=now() and v_loan.status in ('ACTIVE','EXTENDED') then v_status:='OVERDUE_REVIEW'; end if;
      update public.crypto_loan_collaterals set current_price=v_price,current_value=v_value,updated_at=now() where id=v_loan.collateral_id;
      update public.crypto_loans set current_collateral_price=v_price,current_collateral_value=v_value,current_ltv=v_ltv,status=v_status,updated_at=now() where id=v_loan.id;
      if v_status<>v_loan.status then
        insert into public.crypto_loan_events(loan_id,user_id,event_type,before_value,after_value)
        values(v_loan.id,v_loan.user_id,'OVERDUE_REVIEW_STARTED',jsonb_build_object('status',v_loan.status),jsonb_build_object('status',v_status,'ltv',v_ltv));
      end if;
    exception when others then
      insert into public.crypto_loan_events(loan_id,user_id,event_type,payload)
      values(v_loan.id,v_loan.user_id,'RISK_TICK_ERROR',jsonb_build_object('error',sqlerrm));
    end;
  end loop;
end;
$$;

create or replace function public.admin_crypto_loan_snapshot_v2()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
begin
  if not private.cfd_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  return jsonb_build_object(
    'products',(select coalesce(jsonb_agg(to_jsonb(p) order by p.sort_order,p.created_at),'[]'::jsonb) from public.crypto_loan_products p),
    'loans',(
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb)
      from (
        select l.*,u.email,p.name product_name,
               c.id collateral_lock_id,c.asset_symbol,c.quantity collateral_locked_quantity,
               c.initial_price,c.initial_value,c.current_price collateral_current_price,
               c.current_value collateral_current_value,c.status collateral_status,
               e.id extension_id,e.status extension_status,e.new_due_at extension_new_due_at,
               e.new_interest_rate extension_new_interest_rate,e.additional_interest extension_additional_interest,
               e.admin_note extension_admin_note
        from public.crypto_loans l
        left join auth.users u on u.id=l.user_id
        left join public.crypto_loan_products p on p.id=l.product_id
        left join public.crypto_loan_collaterals c on c.loan_id=l.id
        left join lateral (
          select * from public.crypto_loan_extensions ce where ce.loan_id=l.id order by ce.created_at desc limit 1
        ) e on true
        order by l.created_at desc limit 200
      ) x
    )
  );
end;
$$;

create or replace function public.admin_update_crypto_loan_product_terms(
  p_product uuid,p_base_interest_rate numeric,p_overdue_interest_rate numeric,p_term_days integer,p_max_ltv numeric,p_extension_allowed boolean
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_admin uuid:=auth.uid();
begin
  if v_admin is null or not private.cfd_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_base_interest_rate<0 or p_overdue_interest_rate<0 then raise exception 'INVALID_INTEREST_RATE'; end if;
  if p_term_days<=0 then raise exception 'INVALID_TERM'; end if;
  if p_max_ltv<=0 or p_max_ltv>=1 then raise exception 'INVALID_LTV'; end if;
  update public.crypto_loan_products
  set base_interest_rate=p_base_interest_rate,overdue_interest_rate=p_overdue_interest_rate,term_days=p_term_days,
      term_mode='FIXED',max_ltv=p_max_ltv,initial_ltv=p_max_ltv,extension_allowed=p_extension_allowed,updated_at=now()
  where id=p_product;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
  insert into public.admin_logs(admin_user_id,action,target_type,target_id,after_value)
  values(v_admin,'CRYPTO_LOAN_PRODUCT_TERMS_UPDATE','crypto_loan_product',p_product::text,jsonb_build_object(
    'base_interest_rate',p_base_interest_rate,'overdue_interest_rate',p_overdue_interest_rate,
    'term_days',p_term_days,'max_ltv',p_max_ltv,'extension_allowed',p_extension_allowed
  ));
  return jsonb_build_object('product_id',p_product,'updated',true);
end;
$$;

insert into public.crypto_loan_products(
  name,description,borrow_asset,collateral_asset,term_mode,term_days,hourly_rate,annual_rate,
  initial_ltv,margin_call_ltv,liquidation_ltv,min_borrow,max_borrow,status,visible,sort_order,
  max_ltv,base_interest_rate,overdue_interest_rate,interest_rate_type,extension_allowed,allowed_collateral_assets
)
select
  '코인 담보 7일 대출',
  '회원이 보유한 코인을 담보로 설정하고 담보 평가금액의 최대 80%까지 이용할 수 있는 7일 고정기간 대출',
  'USDT','MULTI','FIXED',7,0,null,0.80,0.90,0.95,10,null,'ACTIVE',true,1,
  0.80,0.01,0.028,'FIXED_TERM',true,array['BTC','ETH','SOL','XRP','USDT']::text[]
where not exists (select 1 from public.crypto_loan_products where name='코인 담보 7일 대출');

update public.crypto_loan_products
set description='회원이 보유한 코인을 담보로 설정하고 담보 평가금액의 최대 80%까지 이용할 수 있는 7일 고정기간 대출',
    borrow_asset='USDT',collateral_asset='MULTI',term_mode='FIXED',term_days=7,
    initial_ltv=0.80,margin_call_ltv=0.90,liquidation_ltv=0.95,max_ltv=0.80,
    base_interest_rate=0.01,overdue_interest_rate=0.028,interest_rate_type='FIXED_TERM',
    extension_allowed=true,allowed_collateral_assets=array['BTC','ETH','SOL','XRP','USDT']::text[],
    status='ACTIVE',visible=true,sort_order=1,updated_at=now()
where name='코인 담보 7일 대출';

revoke all on function public.get_crypto_loan_collateral_options(uuid) from public,anon;
revoke all on function public.get_crypto_loan_quote_v2(uuid,text,numeric,numeric) from public,anon;
revoke all on function public.apply_crypto_loan_v2(uuid,text,numeric,numeric,text) from public,anon;
revoke all on function public.repay_crypto_loan_now(uuid,text) from public,anon;
revoke all on function public.request_crypto_loan_extension_v2(uuid) from public,anon;
revoke all on function public.accept_crypto_loan_extension(uuid) from public,anon;
revoke all on function public.admin_offer_crypto_loan_extension(uuid,integer,numeric,text) from public,anon;
revoke all on function public.admin_reject_crypto_loan_extension(uuid,text) from public,anon;
revoke all on function public.admin_approve_crypto_loan_v2(uuid) from public,anon;
revoke all on function public.admin_reject_crypto_loan_v2(uuid,text) from public,anon;
revoke all on function public.admin_mark_crypto_loan_overdue(uuid) from public,anon;
revoke all on function public.admin_seize_crypto_loan_collateral(uuid,text) from public,anon;
revoke all on function public.admin_crypto_loan_snapshot_v2() from public,anon;
revoke all on function public.admin_update_crypto_loan_product_terms(uuid,numeric,numeric,integer,numeric,boolean) from public,anon;

grant execute on function public.get_crypto_loan_collateral_options(uuid) to authenticated;
grant execute on function public.get_crypto_loan_quote_v2(uuid,text,numeric,numeric) to authenticated;
grant execute on function public.apply_crypto_loan_v2(uuid,text,numeric,numeric,text) to authenticated;
grant execute on function public.repay_crypto_loan_now(uuid,text) to authenticated;
grant execute on function public.request_crypto_loan_extension_v2(uuid) to authenticated;
grant execute on function public.accept_crypto_loan_extension(uuid) to authenticated;
grant execute on function public.admin_offer_crypto_loan_extension(uuid,integer,numeric,text) to authenticated;
grant execute on function public.admin_reject_crypto_loan_extension(uuid,text) to authenticated;
grant execute on function public.admin_approve_crypto_loan_v2(uuid) to authenticated;
grant execute on function public.admin_reject_crypto_loan_v2(uuid,text) to authenticated;
grant execute on function public.admin_mark_crypto_loan_overdue(uuid) to authenticated;
grant execute on function public.admin_seize_crypto_loan_collateral(uuid,text) to authenticated;
grant execute on function public.admin_crypto_loan_snapshot_v2() to authenticated;
grant execute on function public.admin_update_crypto_loan_product_terms(uuid,numeric,numeric,integer,numeric,boolean) to authenticated;
