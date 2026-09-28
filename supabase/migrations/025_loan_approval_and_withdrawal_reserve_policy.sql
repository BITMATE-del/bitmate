-- Loan approval + account-level withdrawal reserve policy
-- Applications stay PENDING with no disbursement. Collateral reserve restricts withdrawals only.

alter table public.crypto_loans
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id),
  add column if not exists rejected_at timestamptz,
  add column if not exists rejected_by uuid references auth.users(id),
  add column if not exists rejection_reason text;

alter table public.crypto_loan_collaterals
  add column if not exists reserve_value_usdt numeric,
  add column if not exists activated_at timestamptz;

update public.crypto_loan_collaterals
set reserve_value_usdt=coalesce(reserve_value_usdt,initial_value)
where reserve_value_usdt is null;

alter table public.crypto_loan_collaterals
  alter column reserve_value_usdt set not null,
  alter column status set default 'RESERVED';

alter table public.crypto_loan_collaterals drop constraint if exists crypto_loan_collaterals_status_check;
alter table public.crypto_loan_collaterals add constraint crypto_loan_collaterals_status_check
check(status in ('RESERVED','ACTIVE','RELEASED','SEIZED'));

create or replace function private.crypto_loan_account_value(p_user uuid)
returns numeric language plpgsql security definer set search_path='' as $$
declare r record; v_price numeric; v_total numeric:=0;
begin
  for r in select asset,available,locked from public.demo_balances where user_id=p_user loop
    begin
      v_price:=private.crypto_loan_market_price(r.asset);
      v_total:=v_total+(coalesce(r.available,0)+coalesce(r.locked,0))*v_price;
    exception when others then null;
    end;
  end loop;
  return greatest(coalesce(v_total,0),0);
end $$;

create or replace function private.crypto_loan_reserved_value(p_user uuid)
returns numeric language sql security definer set search_path='' as $$
  select coalesce(sum(c.reserve_value_usdt),0)
  from public.crypto_loan_collaterals c
  join public.crypto_loans l on l.id=c.loan_id
  where c.user_id=p_user
    and c.status in ('RESERVED','ACTIVE')
    and l.status in ('PENDING','APPROVED','ACTIVE','EXTENSION_REQUESTED','EXTENSION_OFFERED','EXTENDED','OVERDUE_REVIEW','OVERDUE')
$$;

create or replace function private.crypto_loan_pending_withdrawal_value(p_user uuid)
returns numeric language plpgsql security definer set search_path='' as $$
declare r record; v_price numeric; v_total numeric:=0;
begin
  for r in select asset,amount,fee from public.withdrawal_requests where user_id=p_user and status in ('PENDING','REVIEW','APPROVED') loop
    begin
      v_price:=private.crypto_loan_market_price(r.asset);
      v_total:=v_total+(coalesce(r.amount,0)+coalesce(r.fee,0))*v_price;
    exception when others then null;
    end;
  end loop;
  return greatest(coalesce(v_total,0),0);
end $$;

create or replace function public.crypto_loan_withdrawal_capacity()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_total numeric; v_reserve numeric; v_pending numeric; v_free numeric;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  v_total:=private.crypto_loan_account_value(v_uid);
  v_reserve:=private.crypto_loan_reserved_value(v_uid);
  v_pending:=private.crypto_loan_pending_withdrawal_value(v_uid);
  v_free:=greatest(v_total-v_reserve-v_pending,0);
  return jsonb_build_object('total_asset_value',v_total,'loan_reserve_value',v_reserve,'pending_withdrawal_value',v_pending,'withdraw_available_value',v_free);
end $$;

create or replace function public.apply_crypto_loan_v2(
  p_product uuid,p_collateral_asset text,p_collateral_quantity numeric,p_principal numeric,p_idempotency_key text
)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  v_uid uuid:=auth.uid(); v_product public.crypto_loan_products%rowtype; v_balance public.demo_balances%rowtype;
  v_asset text:=upper(trim(p_collateral_asset)); v_price numeric; v_value numeric; v_max numeric; v_interest numeric;
  v_loan uuid; v_loan_no text; v_account_value numeric; v_pending_withdraw numeric; v_existing_reserve numeric;
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

  select * into v_balance from public.demo_balances where user_id=v_uid and upper(asset)=v_asset for share;
  if not found or v_balance.available<p_collateral_quantity then raise exception 'INSUFFICIENT_COLLATERAL_BALANCE'; end if;

  v_price:=private.crypto_loan_market_price(v_asset);
  v_value:=round(p_collateral_quantity*v_price,10);
  v_max:=round(v_value*v_product.max_ltv,10);
  if p_principal>v_max then raise exception 'LTV_LIMIT_EXCEEDED'; end if;
  if p_principal<v_product.min_borrow or (v_product.max_borrow is not null and p_principal>v_product.max_borrow) then raise exception 'BORROW_AMOUNT_OUT_OF_RANGE'; end if;

  v_account_value:=private.crypto_loan_account_value(v_uid);
  v_pending_withdraw:=private.crypto_loan_pending_withdrawal_value(v_uid);
  v_existing_reserve:=private.crypto_loan_reserved_value(v_uid);
  if v_account_value-v_pending_withdraw < v_existing_reserve+v_value then raise exception 'INSUFFICIENT_ACCOUNT_VALUE_FOR_RESERVE'; end if;

  v_interest:=round(p_principal*v_product.base_interest_rate,10);
  v_loan_no:='LOAN-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));

  insert into public.crypto_loans(
    loan_no,user_id,product_id,borrow_asset,collateral_asset,principal,collateral_quantity,
    collateral_price_at_request,collateral_value_at_request,initial_ltv,margin_call_ltv,liquidation_ltv,
    hourly_rate,annual_rate,term_mode,term_days,current_collateral_price,current_collateral_value,current_ltv,
    status,terms_accepted_at,idempotency_key,interest_rate,overdue_interest_rate,interest_rate_type,
    interest_amount,total_repayment_amount,due_at
  ) values(
    v_loan_no,v_uid,v_product.id,v_product.borrow_asset,v_asset,p_principal,p_collateral_quantity,
    v_price,v_value,v_product.max_ltv,v_product.margin_call_ltv,v_product.liquidation_ltv,
    coalesce(v_product.hourly_rate,0),v_product.annual_rate,'FIXED',coalesce(v_product.term_days,7),
    v_price,v_value,p_principal/v_value,'PENDING',now(),p_idempotency_key,
    v_product.base_interest_rate,v_product.overdue_interest_rate,v_product.interest_rate_type,
    v_interest,p_principal+v_interest,now()+make_interval(days=>coalesce(v_product.term_days,7))
  ) returning id into v_loan;

  insert into public.crypto_loan_collaterals(
    loan_id,user_id,asset_symbol,quantity,initial_price,initial_value,current_price,current_value,reserve_value_usdt,status
  ) values(v_loan,v_uid,v_asset,p_collateral_quantity,v_price,v_value,v_price,v_value,v_value,'RESERVED');

  insert into public.ledger_entries(user_id,mode,asset,amount,entry_type,reference_id,idempotency_key)
  values(v_uid,'DEMO',v_asset,0,'collateral_lock',v_loan,'loan-collateral-reserve:'||p_idempotency_key)
  on conflict(user_id,idempotency_key) do nothing;

  insert into public.crypto_loan_events(loan_id,user_id,event_type,payload)
  values
    (v_loan,v_uid,'LOAN_REQUESTED',jsonb_build_object('principal',p_principal,'status','PENDING','disbursed',false,'collateral_reference_value',v_value,'reserve_value',v_value)),
    (v_loan,v_uid,'COLLATERAL_RESERVED',jsonb_build_object('asset',v_asset,'quantity',p_collateral_quantity,'price',v_price,'value',v_value,'trade_restricted',false,'withdraw_restricted',true));
  return v_loan;
exception when unique_violation then
  select id into v_loan from public.crypto_loans where user_id=v_uid and idempotency_key=p_idempotency_key;
  if v_loan is not null then return v_loan; end if;
  raise;
end $$;

create or replace function public.admin_approve_crypto_loan_v2(p_loan uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_admin uuid:=auth.uid(); v_loan public.crypto_loans%rowtype; v_product public.crypto_loan_products%rowtype;
  v_collateral public.crypto_loan_collaterals%rowtype; v_current_price numeric; v_current_value numeric;
  v_account_value numeric; v_pending_withdraw numeric; v_total_reserve numeric;
begin
  if v_admin is null or not private.cfd_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select * into v_loan from public.crypto_loans where id=p_loan for update;
  if not found then raise exception 'LOAN_NOT_FOUND'; end if;
  if v_loan.status<>'PENDING' then raise exception 'LOAN_NOT_PENDING'; end if;

  select * into v_product from public.crypto_loan_products where id=v_loan.product_id for share;
  if not found or v_product.status<>'ACTIVE' then raise exception 'LOAN_PRODUCT_UNAVAILABLE'; end if;
  select * into v_collateral from public.crypto_loan_collaterals where loan_id=v_loan.id for update;
  if not found or v_collateral.status<>'RESERVED' then raise exception 'COLLATERAL_NOT_RESERVED'; end if;

  v_current_price:=private.crypto_loan_market_price(v_collateral.asset_symbol);
  v_current_value:=v_current_price*v_collateral.quantity;
  if v_loan.principal > v_current_value*v_product.max_ltv then raise exception 'CURRENT_COLLATERAL_VALUE_INSUFFICIENT'; end if;

  v_account_value:=private.crypto_loan_account_value(v_loan.user_id);
  v_pending_withdraw:=private.crypto_loan_pending_withdrawal_value(v_loan.user_id);
  v_total_reserve:=private.crypto_loan_reserved_value(v_loan.user_id);
  if v_account_value-v_pending_withdraw < v_total_reserve then raise exception 'CURRENT_ACCOUNT_VALUE_INSUFFICIENT'; end if;

  insert into public.demo_balances(user_id,asset,available,locked) values(v_loan.user_id,'USDT',0,0) on conflict(user_id,asset) do nothing;
  update public.demo_balances set available=available+v_loan.principal,updated_at=now() where user_id=v_loan.user_id and asset='USDT';
  update public.crypto_loan_collaterals set status='ACTIVE',activated_at=now(),current_price=v_current_price,current_value=v_current_value,updated_at=now() where id=v_collateral.id;
  update public.crypto_loans
    set status='ACTIVE',approved_at=now(),approved_by=v_admin,funded_at=now(),
        due_at=now()+make_interval(days=>coalesce(term_days,7)),
        current_collateral_price=v_current_price,current_collateral_value=v_current_value,
        current_ltv=case when v_current_value>0 then principal/v_current_value else null end,
        provider_status='INTERNAL_FUNDED',disbursement_ref='INTERNAL:'||v_loan.id::text,updated_at=now()
  where id=v_loan.id;

  insert into public.ledger_entries(user_id,mode,asset,amount,entry_type,reference_id,idempotency_key)
  values(v_loan.user_id,'DEMO','USDT',v_loan.principal,'loan_disbursement',v_loan.id,'loan-disbursement:'||v_loan.id::text)
  on conflict(user_id,idempotency_key) do nothing;

  insert into public.crypto_loan_events(loan_id,user_id,event_type,payload,actor_type,actor_id)
  values
    (v_loan.id,v_loan.user_id,'LOAN_APPROVED',jsonb_build_object('principal',v_loan.principal,'account_value',v_account_value,'total_reserve_after_approval',v_total_reserve,'current_collateral_value',v_current_value),'ADMIN',v_admin),
    (v_loan.id,v_loan.user_id,'LOAN_STARTED',jsonb_build_object('principal',v_loan.principal,'disbursed',true,'due_at',now()+make_interval(days=>coalesce(v_loan.term_days,7))),'ADMIN',v_admin);

  insert into public.admin_logs(admin_user_id,action,target_type,target_id,after_value)
  values(v_admin,'CRYPTO_LOAN_APPROVE','crypto_loan',v_loan.id::text,jsonb_build_object('status','ACTIVE','principal',v_loan.principal,'approved_at',now(),'current_collateral_value',v_current_value,'reserve_value',v_collateral.reserve_value_usdt));
  return jsonb_build_object('loan_id',v_loan.id,'status','ACTIVE','disbursed',v_loan.principal,'reserve_value',v_collateral.reserve_value_usdt);
end $$;

create or replace function public.admin_reject_crypto_loan_v2(p_loan uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_admin uuid:=auth.uid(); v_loan public.crypto_loans%rowtype; v_collateral public.crypto_loan_collaterals%rowtype;
begin
  if v_admin is null or not private.cfd_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select * into v_loan from public.crypto_loans where id=p_loan for update;
  if not found then raise exception 'LOAN_NOT_FOUND'; end if;
  if v_loan.status<>'PENDING' then raise exception 'LOAN_NOT_PENDING'; end if;
  select * into v_collateral from public.crypto_loan_collaterals where loan_id=v_loan.id for update;
  if found and v_collateral.status='RESERVED' then
    update public.crypto_loan_collaterals set status='RELEASED',released_at=now(),updated_at=now() where id=v_collateral.id;
  end if;
  update public.crypto_loans
  set status='REJECTED',rejected_at=now(),rejected_by=v_admin,rejection_reason=coalesce(nullif(trim(p_reason),''),'관리자 거절'),
      failure_reason=coalesce(nullif(trim(p_reason),''),'관리자 거절'),closed_at=now(),updated_at=now()
  where id=v_loan.id;
  insert into public.crypto_loan_events(loan_id,user_id,event_type,payload,actor_type,actor_id)
  values(v_loan.id,v_loan.user_id,'LOAN_REJECTED',jsonb_build_object('reason',coalesce(nullif(trim(p_reason),''),'관리자 거절'),'reserve_released',true,'disbursed',false),'ADMIN',v_admin);
  insert into public.admin_logs(admin_user_id,action,target_type,target_id,after_value)
  values(v_admin,'CRYPTO_LOAN_REJECT','crypto_loan',v_loan.id::text,jsonb_build_object('status','REJECTED','reason',p_reason,'rejected_at',now(),'reserve_released',true));
  return jsonb_build_object('loan_id',v_loan.id,'status','REJECTED','disbursed',false,'reserve_released',true);
end $$;

create or replace function public.repay_crypto_loan_now(p_loan uuid,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_uid uuid:=auth.uid(); v_loan public.crypto_loans%rowtype; v_collateral public.crypto_loan_collaterals%rowtype;
  v_wallet public.demo_balances%rowtype; v_due numeric; v_interest_due numeric;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_loan from public.crypto_loans where id=p_loan and user_id=v_uid for update;
  if not found then raise exception 'LOAN_NOT_FOUND'; end if;
  if v_loan.status not in ('ACTIVE','EXTENDED','OVERDUE_REVIEW','OVERDUE','EXTENSION_REQUESTED','EXTENSION_OFFERED') then raise exception 'LOAN_NOT_REPAYABLE'; end if;
  select * into v_collateral from public.crypto_loan_collaterals where loan_id=v_loan.id for update;
  if not found or v_collateral.status<>'ACTIVE' then raise exception 'COLLATERAL_RESERVE_NOT_ACTIVE'; end if;

  v_interest_due:=greatest(v_loan.interest_amount-v_loan.repaid_interest,0);
  v_due:=greatest(v_loan.principal-v_loan.repaid_principal,0)+v_interest_due;
  select * into v_wallet from public.demo_balances where user_id=v_uid and asset='USDT' for update;
  if not found or v_wallet.available<v_due then raise exception 'INSUFFICIENT_BALANCE'; end if;

  update public.demo_balances set available=available-v_due,updated_at=now() where id=v_wallet.id;
  update public.crypto_loan_collaterals set status='RELEASED',released_at=now(),updated_at=now() where id=v_collateral.id;
  update public.crypto_loans set status='REPAID',repaid_principal=principal,repaid_interest=interest_amount,repaid_at=now(),updated_at=now() where id=v_loan.id;

  insert into public.crypto_loan_payments(loan_id,user_id,payment_type,principal_amount,interest_amount,total_amount,asset,status,idempotency_key,completed_at)
  values(v_loan.id,v_uid,'REPAYMENT',greatest(v_loan.principal-v_loan.repaid_principal,0),v_interest_due,v_due,'USDT','COMPLETED',p_idempotency_key,now());

  insert into public.ledger_entries(user_id,mode,asset,amount,entry_type,reference_id,idempotency_key)
  values
    (v_uid,'DEMO','USDT',-greatest(v_loan.principal-v_loan.repaid_principal,0),'loan_repayment',v_loan.id,'loan-repay-principal:'||p_idempotency_key),
    (v_uid,'DEMO','USDT',-v_interest_due,'loan_interest',v_loan.id,'loan-repay-interest:'||p_idempotency_key),
    (v_uid,'DEMO',v_collateral.asset_symbol,0,'collateral_release',v_loan.id,'loan-reserve-release:'||p_idempotency_key)
  on conflict(user_id,idempotency_key) do nothing;

  insert into public.crypto_loan_events(loan_id,user_id,event_type,payload)
  values
    (v_loan.id,v_uid,'REPAID',jsonb_build_object('total_amount',v_due,'principal',v_loan.principal,'interest',v_interest_due)),
    (v_loan.id,v_uid,'COLLATERAL_RELEASED',jsonb_build_object('reserve_value',v_collateral.reserve_value_usdt,'trade_balance_changed',false));

  return jsonb_build_object('loan_id',v_loan.id,'status','REPAID','paid',v_due,'reserve_released',true);
exception when unique_violation then
  return jsonb_build_object('loan_id',p_loan,'status','REPAID','idempotent',true);
end $$;

create or replace function public.user_create_withdrawal_request(p_asset text,p_network text,p_address text,p_amount numeric)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_asset text:=upper(trim(p_asset)); v_network text:=upper(trim(p_network)); v_address text:=trim(p_address);
  v_enabled boolean:=false; v_min numeric:=0; v_fee numeric:=0; v_available numeric:=0; v_id uuid;
  v_price numeric; v_total_value numeric; v_reserve_value numeric; v_pending_value numeric; v_new_withdraw_value numeric;
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  select coalesce((value)::boolean,false) into v_enabled from public.system_settings where key='WITHDRAW_ENABLED';
  if not v_enabled then raise exception 'withdraw_disabled'; end if;
  if length(v_address)<8 then raise exception 'invalid_address'; end if;
  if p_amount<=0 then raise exception 'invalid_amount'; end if;

  select min_withdraw,withdraw_fee into v_min,v_fee
  from public.asset_networks where asset=v_asset and network=v_network and active and withdraw_enabled;
  if not found then raise exception 'network_not_available'; end if;
  if p_amount<v_min then raise exception 'below_minimum'; end if;

  insert into public.demo_balances(user_id,asset,available,locked) values(auth.uid(),v_asset,0,0) on conflict(user_id,asset) do nothing;
  select available into v_available from public.demo_balances where user_id=auth.uid() and asset=v_asset for update;
  if v_available < p_amount+v_fee then raise exception 'insufficient_balance'; end if;

  v_price:=private.crypto_loan_market_price(v_asset);
  v_total_value:=private.crypto_loan_account_value(auth.uid());
  v_reserve_value:=private.crypto_loan_reserved_value(auth.uid());
  v_pending_value:=private.crypto_loan_pending_withdrawal_value(auth.uid());
  v_new_withdraw_value:=(p_amount+v_fee)*v_price;
  if v_total_value-v_pending_value-v_new_withdraw_value < v_reserve_value then raise exception 'loan_collateral_reserve_restriction'; end if;

  update public.demo_balances set available=available-(p_amount+v_fee),locked=locked+(p_amount+v_fee),updated_at=now()
  where user_id=auth.uid() and asset=v_asset;
  insert into public.withdrawal_requests(user_id,asset,network,address,amount,fee,status)
  values(auth.uid(),v_asset,v_network,v_address,p_amount,v_fee,'PENDING') returning id into v_id;
  insert into public.ledger_entries(user_id,mode,asset,amount,entry_type,idempotency_key)
  values(auth.uid(),'DEMO',v_asset,-(p_amount+v_fee),'withdrawal_hold','withdraw-hold-'||v_id::text);
  return jsonb_build_object('id',v_id,'asset',v_asset,'network',v_network,'amount',p_amount,'fee',v_fee,'status','PENDING','loan_reserve_value',v_reserve_value);
end $$;

create or replace function public.user_wallet_snapshot()
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_spot jsonb; v_futures numeric:=0; v_withdrawals jsonb; v_transfers jsonb; v_networks jsonb;
  v_total_value numeric; v_reserve_value numeric; v_pending_value numeric; v_free_value numeric;
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  v_total_value:=private.crypto_loan_account_value(auth.uid());
  v_reserve_value:=private.crypto_loan_reserved_value(auth.uid());
  v_pending_value:=private.crypto_loan_pending_withdrawal_value(auth.uid());
  v_free_value:=greatest(v_total_value-v_reserve_value-v_pending_value,0);

  select coalesce(jsonb_agg(jsonb_build_object(
    'asset',b.asset,'available',b.available,'locked',b.locked,
    'withdraw_available',least(b.available,case when private.crypto_loan_market_price(b.asset)>0 then v_free_value/private.crypto_loan_market_price(b.asset) else 0 end)
  ) order by b.asset),'[]'::jsonb)
  into v_spot from public.demo_balances b where b.user_id=auth.uid();

  select coalesce(balance,0) into v_futures from public.futures_accounts where user_id=auth.uid();
  select coalesce(jsonb_agg(to_jsonb(w) order by w.created_at desc),'[]'::jsonb) into v_withdrawals
  from (select id,asset,network,address,amount,fee,status,txid,note,created_at,reviewed_at from public.withdrawal_requests where user_id=auth.uid() order by created_at desc limit 50) w;
  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc),'[]'::jsonb) into v_transfers
  from (select id,asset,from_account,to_account,amount,status,reference_id,created_at from public.internal_transfers where user_id=auth.uid() order by created_at desc limit 50) t;
  select coalesce(jsonb_agg(jsonb_build_object('asset',asset,'network',network,'display_name',display_name,'min_withdraw',min_withdraw,'withdraw_fee',withdraw_fee) order by asset,network),'[]'::jsonb)
  into v_networks from public.asset_networks where active and withdraw_enabled;

  return jsonb_build_object(
    'spot',v_spot,'futures_usdt',v_futures,'withdrawals',v_withdrawals,'transfers',v_transfers,'withdraw_networks',v_networks,
    'loan_reserve_value',v_reserve_value,'pending_withdrawal_value',v_pending_value,'total_asset_value',v_total_value,'withdraw_available_value',v_free_value
  );
end $$;

create or replace function public.admin_crypto_loan_snapshot_v2()
returns jsonb language plpgsql security definer set search_path='' as $$
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
               c.current_value collateral_current_value,c.reserve_value_usdt,c.status collateral_status,
               e.id extension_id,e.status extension_status,e.new_due_at extension_new_due_at,
               e.new_interest_rate extension_new_interest_rate,e.additional_interest extension_additional_interest,e.admin_note extension_admin_note,
               private.crypto_loan_account_value(l.user_id) account_total_value,
               private.crypto_loan_reserved_value(l.user_id) account_total_reserve,
               private.crypto_loan_pending_withdrawal_value(l.user_id) pending_withdrawal_value,
               greatest(private.crypto_loan_account_value(l.user_id)-private.crypto_loan_reserved_value(l.user_id)-private.crypto_loan_pending_withdrawal_value(l.user_id),0) withdraw_available_value,
               case when l.status='PENDING' then
                 private.crypto_loan_account_value(l.user_id)-private.crypto_loan_pending_withdrawal_value(l.user_id)>=private.crypto_loan_reserved_value(l.user_id)
                 and c.status='RESERVED'
                 and l.principal <= (private.crypto_loan_market_price(c.asset_symbol)*c.quantity*p.max_ltv)
               else null end approval_available
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
end $$;

revoke all on function public.crypto_loan_withdrawal_capacity() from public,anon;
grant execute on function public.crypto_loan_withdrawal_capacity() to authenticated;
revoke all on function public.user_create_withdrawal_request(text,text,text,numeric) from public,anon;
grant execute on function public.user_create_withdrawal_request(text,text,text,numeric) to authenticated;
