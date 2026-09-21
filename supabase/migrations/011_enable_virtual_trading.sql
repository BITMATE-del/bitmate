-- Enable BITMATE internal virtual trading mode without enabling external REAL execution
insert into public.system_settings(key,value,updated_at) values
 ('VIRTUAL_TRADING_ENABLED','true'::jsonb,now()),
 ('SPOT_VIRTUAL_ENABLED','true'::jsonb,now()),
 ('FUTURES_VIRTUAL_ENABLED','true'::jsonb,now()),
 ('CFD_VIRTUAL_ENABLED','true'::jsonb,now()),
 ('AI_VIRTUAL_ENABLED','true'::jsonb,now()),
 ('COPY_VIRTUAL_ENABLED','true'::jsonb,now())
on conflict(key) do update set value=excluded.value,updated_at=now();

-- Keep external execution switches OFF until an exchange/broker bridge exists.
update public.system_settings
set value='false'::jsonb,updated_at=now()
where key in ('SPOT_REAL_ENABLED','AI_REAL_ENABLED','QUICK_TRADE_REAL_ENABLED','CFD_REAL_ENABLED','COPY_REAL_ENABLED','INDEX_REAL_ENABLED');

update public.futures_settings set enabled=true,updated_at=now();

insert into public.cfd_settings(key,value,updated_at)
values('CFD_ENABLED','true'::jsonb,now())
on conflict(key) do update set value='true'::jsonb,updated_at=now();

create or replace function public.spot_virtual_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid:=auth.uid();
  v_balances jsonb;
  v_orders jsonb;
begin
  if v_user is null then raise exception 'LOGIN_REQUIRED'; end if;
  if coalesce((select (value::text)::boolean from public.system_settings where key='SPOT_VIRTUAL_ENABLED'),false) is not true then
    raise exception 'SPOT_TRADING_DISABLED';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('asset',asset,'available',available,'locked',locked) order by asset),'[]'::jsonb)
  into v_balances
  from public.demo_balances
  where user_id=v_user;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb)
  into v_orders
  from (
    select id,symbol,side,quote_amount,execution_price,base_quantity,status,created_at
    from public.demo_orders
    where user_id=v_user
    order by created_at desc
    limit 100
  ) x;

  return jsonb_build_object('balances',v_balances,'orders',v_orders,'mode','VIRTUAL');
end;
$$;

create or replace function public.spot_virtual_market_order(
  p_symbol text,
  p_side text,
  p_amount numeric,
  p_client_order_id text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid:=auth.uid();
  v_symbol text:=upper(trim(p_symbol));
  v_side text:=upper(trim(p_side));
  v_quote text:='USDT';
  v_base text;
  v_price numeric;
  v_quote_amount numeric;
  v_base_qty numeric;
  v_order_id uuid;
  v_key text:='spot-virtual-'||trim(p_client_order_id);
  v_source_time timestamptz;
begin
  if v_user is null then raise exception 'LOGIN_REQUIRED'; end if;
  if coalesce((select (value::text)::boolean from public.system_settings where key='SPOT_VIRTUAL_ENABLED'),false) is not true then
    raise exception 'SPOT_TRADING_DISABLED';
  end if;
  if v_side not in ('BUY','SELL') then raise exception 'INVALID_SIDE'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'INVALID_AMOUNT'; end if;
  if length(trim(coalesce(p_client_order_id,'')))<8 then raise exception 'INVALID_CLIENT_ORDER_ID'; end if;
  if right(v_symbol,4)<>'USDT' then raise exception 'UNSUPPORTED_MARKET'; end if;

  v_base:=left(v_symbol,length(v_symbol)-4);

  select last_price,source_time into v_price,v_source_time
  from public.futures_market_prices
  where symbol=v_symbol;

  if v_price is null or v_price<=0 or v_source_time is null or v_source_time<clock_timestamp()-interval '30 seconds' then
    raise exception 'PRICE_UNAVAILABLE';
  end if;

  if exists(select 1 from public.demo_orders where user_id=v_user and idempotency_key=v_key) then
    select id into v_order_id from public.demo_orders where user_id=v_user and idempotency_key=v_key;
    return jsonb_build_object('duplicate',true,'order_id',v_order_id);
  end if;

  insert into public.demo_balances(user_id,asset,available,locked)
  values(v_user,v_quote,0,0),(v_user,v_base,0,0)
  on conflict(user_id,asset) do nothing;

  perform 1 from public.demo_balances where user_id=v_user and asset in (v_quote,v_base) order by asset for update;

  if v_side='BUY' then
    v_quote_amount:=p_amount;
    v_base_qty:=v_quote_amount/v_price;
    if (select available from public.demo_balances where user_id=v_user and asset=v_quote)<v_quote_amount then
      raise exception 'INSUFFICIENT_USDT';
    end if;
    update public.demo_balances set available=available-v_quote_amount,updated_at=now() where user_id=v_user and asset=v_quote;
    update public.demo_balances set available=available+v_base_qty,updated_at=now() where user_id=v_user and asset=v_base;
  else
    v_base_qty:=p_amount;
    v_quote_amount:=v_base_qty*v_price;
    if (select available from public.demo_balances where user_id=v_user and asset=v_base)<v_base_qty then
      raise exception 'INSUFFICIENT_ASSET';
    end if;
    update public.demo_balances set available=available-v_base_qty,updated_at=now() where user_id=v_user and asset=v_base;
    update public.demo_balances set available=available+v_quote_amount,updated_at=now() where user_id=v_user and asset=v_quote;
  end if;

  insert into public.demo_orders(user_id,symbol,side,quote_amount,execution_price,base_quantity,status,idempotency_key)
  values(v_user,v_symbol,v_side::public.order_side,v_quote_amount,v_price,v_base_qty,'FILLED',v_key)
  returning id into v_order_id;

  insert into public.ledger_entries(user_id,mode,asset,amount,entry_type,reference_id,idempotency_key)
  values
   (v_user,'DEMO',v_quote,case when v_side='BUY' then -v_quote_amount else v_quote_amount end,'trade',v_order_id,v_key||'-quote'),
   (v_user,'DEMO',v_base,case when v_side='BUY' then v_base_qty else -v_base_qty end,'trade',v_order_id,v_key||'-base');

  return jsonb_build_object(
    'order_id',v_order_id,'symbol',v_symbol,'side',v_side,
    'execution_price',v_price,'quote_amount',v_quote_amount,'base_quantity',v_base_qty,'status','FILLED'
  );
end;
$$;

revoke all on function public.spot_virtual_snapshot() from public,anon;
revoke all on function public.spot_virtual_market_order(text,text,numeric,text) from public,anon;
grant execute on function public.spot_virtual_snapshot() to authenticated;
grant execute on function public.spot_virtual_market_order(text,text,numeric,text) to authenticated;
