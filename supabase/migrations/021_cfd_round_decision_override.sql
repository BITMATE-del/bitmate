-- CFD 회차 판정 보정
alter table public.cfd_timed_trades
  drop constraint if exists cfd_timed_trades_result_check;

alter table public.cfd_timed_trades
  add constraint cfd_timed_trades_result_check
  check (result is null or result in ('WIN','LOSS','DRAW','VOID'));

create table if not exists public.cfd_timed_round_overrides(
  trade_id uuid primary key references public.cfd_timed_trades(id) on delete cascade,
  override_value text not null check (override_value in ('WIN','LOSS','VOID')),
  reason text not null,
  admin_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cfd_timed_round_overrides enable row level security;

create or replace function public.admin_set_cfd_timed_round_override(
  p_trade_id uuid,
  p_override text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_trade public.cfd_timed_trades%rowtype;
  v_override text:=upper(trim(coalesce(p_override,'AUTO')));
  v_before jsonb;
  v_after jsonb;
begin
  if not public.is_admin_user() then raise exception 'admin_required'; end if;
  if p_trade_id is null then raise exception 'trade_required'; end if;
  if v_override not in ('AUTO','WIN','LOSS','VOID') then raise exception 'invalid_override'; end if;
  if length(trim(coalesce(p_reason,'')))<5 then raise exception 'reason_required'; end if;

  select * into v_trade from public.cfd_timed_trades where id=p_trade_id for update;
  if v_trade.id is null then raise exception 'trade_not_found'; end if;
  if v_trade.status<>'ACTIVE' then raise exception 'trade_already_finalized'; end if;

  select to_jsonb(o) into v_before from public.cfd_timed_round_overrides o where o.trade_id=p_trade_id;

  if v_override='AUTO' then
    delete from public.cfd_timed_round_overrides where trade_id=p_trade_id;
  else
    insert into public.cfd_timed_round_overrides(trade_id,override_value,reason,admin_user_id)
    values(p_trade_id,v_override,trim(p_reason),auth.uid())
    on conflict(trade_id) do update
      set override_value=excluded.override_value,
          reason=excluded.reason,
          admin_user_id=excluded.admin_user_id,
          updated_at=now();
  end if;

  select to_jsonb(o) into v_after from public.cfd_timed_round_overrides o where o.trade_id=p_trade_id;

  insert into public.admin_logs(admin_user_id,action,target_type,target_id,before_value,after_value)
  values(
    auth.uid(),'CFD_ROUND_DECISION_OVERRIDE','cfd_timed_trade',p_trade_id::text,
    coalesce(v_before,'{}'::jsonb),
    jsonb_build_object('override_value',v_override,'reason',trim(p_reason),'state',coalesce(v_after,'{}'::jsonb))
  );

  return jsonb_build_object('trade_id',p_trade_id,'override_value',v_override,'saved',true);
end;
$$;

grant execute on function public.admin_set_cfd_timed_round_override(uuid,text,text) to authenticated;

create or replace function private.settle_cfd_timed_trade(
  p_trade_id uuid,
  p_forced_end_price numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_trade public.cfd_timed_trades%rowtype;
  v_account public.cfd_accounts%rowtype;
  v_end numeric(24,8);
  v_formula jsonb;
  v_auto_result text;
  v_override text;
  v_result text;
  v_payout numeric;
  v_net numeric;
  v_avail_before numeric;
  v_hold_before numeric;
begin
  select * into v_trade from public.cfd_timed_trades where id=p_trade_id for update;
  if v_trade.id is null then raise exception 'TRADE_NOT_FOUND'; end if;
  if v_trade.status='SETTLED' then
    return jsonb_build_object('trade_id',v_trade.id,'status','SETTLED','result',v_trade.result,'payout_amount',v_trade.payout_amount,'net_profit',v_trade.net_profit);
  end if;
  if v_trade.status<>'ACTIVE' then raise exception 'TRADE_NOT_ACTIVE'; end if;
  if v_trade.expires_at>now() then raise exception 'TRADE_NOT_EXPIRED'; end if;

  v_end:=coalesce(p_forced_end_price,private.cfd_server_price(v_trade.symbol));
  v_formula:=private.cfd_timed_formula(v_trade.direction,v_trade.start_price,v_end,v_trade.amount);
  v_auto_result:=v_formula->>'result';

  select o.override_value into v_override
  from public.cfd_timed_round_overrides o
  where o.trade_id=v_trade.id;

  if v_override='WIN' then
    v_result:='WIN'; v_payout:=floor(v_trade.amount*1.95);
  elsif v_override='LOSS' then
    v_result:='LOSS'; v_payout:=0;
  elsif v_override='VOID' then
    v_result:='VOID'; v_payout:=v_trade.amount;
  else
    v_result:=v_auto_result; v_payout:=(v_formula->>'payout_amount')::numeric;
  end if;
  v_net:=v_payout-v_trade.amount;

  select * into v_account from public.cfd_accounts where id=v_trade.account_id for update;
  if v_account.trade_hold_balance<v_trade.amount then raise exception 'HOLD_BALANCE_INCONSISTENT'; end if;
  v_avail_before:=v_account.available_balance;
  v_hold_before:=v_account.trade_hold_balance;

  update public.demo_balances
  set locked=greatest(0,locked-v_trade.amount),
      available=available+v_payout,
      updated_at=now()
  where user_id=v_trade.user_id and asset='USDT';

  update public.cfd_accounts
  set trade_hold_balance=trade_hold_balance-v_trade.amount,
      available_balance=available_balance+v_payout,
      wallet_balance=wallet_balance+v_net,
      realized_pnl=realized_pnl+v_net,
      updated_at=now()
  where id=v_account.id;

  if v_net<>0 then
    insert into public.ledger_entries(user_id,mode,asset,amount,entry_type,idempotency_key)
    values(v_trade.user_id,'DEMO','USDT',v_net,'trade','cfd-timed-settle:'||v_trade.id)
    on conflict(user_id,idempotency_key) do nothing;
  end if;

  update public.cfd_timed_trades
  set end_price=v_end,status='SETTLED',result=v_result,payout_amount=v_payout,net_profit=v_net,settled_at=now(),updated_at=now()
  where id=v_trade.id and status='ACTIVE';

  insert into public.cfd_timed_ledger(
    user_id,account_id,transaction_type,amount,available_before,available_after,
    trade_hold_before,trade_hold_after,reference_type,reference_id,description,idempotency_key
  )
  values(
    v_trade.user_id,v_trade.account_id,'CFD_TRADE_SETTLEMENT',v_payout,
    v_avail_before,v_avail_before+v_payout,v_hold_before,v_hold_before-v_trade.amount,
    'CFD_TIMED_TRADE',v_trade.id,v_trade.symbol||' 거래 정산 '||v_result,'settle:'||v_trade.id
  )
  on conflict(idempotency_key) do nothing;

  return jsonb_build_object(
    'trade_id',v_trade.id,'status','SETTLED','auto_result',v_auto_result,
    'override_value',coalesce(v_override,'AUTO'),'result',v_result,'end_price',v_end,
    'payout_amount',v_payout,'net_profit',v_net
  );
end;
$$;

create or replace function private.admin_get_cfd_dashboard()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
begin
  if not private.cfd_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  return jsonb_build_object(
    'products',(select coalesce(jsonb_agg(to_jsonb(x) order by sort_order),'[]'::jsonb) from public.cfd_products x),
    'accounts',(select coalesce(jsonb_agg(to_jsonb(x) order by updated_at desc),'[]'::jsonb) from (select * from public.cfd_accounts order by updated_at desc limit 100) x),
    'orders',(select coalesce(jsonb_agg(to_jsonb(x) order by created_at desc),'[]'::jsonb) from (select * from public.cfd_orders order by created_at desc limit 100) x),
    'positions',(select coalesce(jsonb_agg(to_jsonb(x) order by created_at desc),'[]'::jsonb) from (select * from public.cfd_positions order by created_at desc limit 100) x),
    'timed_trades',(
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb)
      from (
        select t.id,t.user_id,u.email,t.symbol,t.direction,t.duration_minutes,t.amount,
               t.start_price,t.end_price,t.status,t.result,t.payout_amount,t.net_profit,
               t.starts_at,t.expires_at,t.settled_at,t.created_at,t.updated_at,
               case when t.end_price is null then null else private.cfd_timed_formula(t.direction,t.start_price,t.end_price,t.amount)->>'result' end as auto_result,
               coalesce(o.override_value,'AUTO') as override_value,
               o.reason as override_reason,o.admin_user_id as override_admin_id,
               au.email as override_admin_email,o.updated_at as override_at,
               case
                 when t.status='SETTLED' then t.result
                 when o.override_value='WIN' then 'WIN'
                 when o.override_value='LOSS' then 'LOSS'
                 when o.override_value='VOID' then 'VOID'
                 else null
               end as final_result
        from public.cfd_timed_trades t
        left join auth.users u on u.id=t.user_id
        left join public.cfd_timed_round_overrides o on o.trade_id=t.id
        left join auth.users au on au.id=o.admin_user_id
        order by t.created_at desc
        limit 150
      ) x
    ),
    'liquidations',(select coalesce(jsonb_agg(to_jsonb(x) order by created_at desc),'[]'::jsonb) from (select * from public.cfd_liquidations order by created_at desc limit 100) x),
    'settings',(select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) from public.cfd_settings)
  );
end;
$$;
