-- Preserve existing INDEX investment logic while fixing a PL/pgSQL record/alias collision
-- discovered during authenticated execution verification.

create or replace function private.start_index_investment(
  p_product_id uuid,
  p_amount numeric,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid:=(select auth.uid());
  prod public.index_products%rowtype;
  ver uuid;
  bal public.demo_balances%rowtype;
  ord uuid;
  pos uuid;
  fee numeric;
  net numeric;
  v_asset record;
  alloc numeric;
  qty numeric;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into prod
  from public.index_products
  where id=p_product_id
  for share;

  if not found or prod.status<>'ACTIVE' then raise exception 'PRODUCT_UNAVAILABLE'; end if;
  if p_amount<prod.min_investment or (prod.max_investment is not null and p_amount>prod.max_investment) then
    raise exception 'INVALID_INVESTMENT_AMOUNT';
  end if;

  if exists(
    select 1 from public.index_orders
    where user_id=uid and idempotency_key=p_idempotency_key
  ) then
    select position_id into pos
    from public.index_orders
    where user_id=uid and idempotency_key=p_idempotency_key;
    return pos;
  end if;

  select id into ver
  from public.index_product_versions
  where product_id=prod.id
    and status='ACTIVE'
    and effective_from<=now()
  order by version_no desc
  limit 1;

  if ver is null then raise exception 'VERSION_UNAVAILABLE'; end if;

  if abs((
    select coalesce(sum(ipa.target_weight),0)
    from public.index_product_assets ipa
    where ipa.version_id=ver and ipa.status='ACTIVE'
  )-1)>0.000001 then
    raise exception 'INVALID_PRODUCT_WEIGHTS';
  end if;

  if exists(
    select 1
    from public.index_product_assets ipa
    left join public.index_market_prices mp on mp.symbol=ipa.asset_symbol
    where ipa.version_id=ver
      and ipa.status='ACTIVE'
      and (mp.symbol is null or mp.captured_at<now()-interval '3 minutes')
  ) then
    raise exception 'MARKET_DATA_STALE';
  end if;

  select * into bal
  from public.demo_balances
  where user_id=uid and asset='USDT'
  for update;

  if not found or bal.available<p_amount then raise exception 'INSUFFICIENT_BALANCE'; end if;

  fee:=round(p_amount*prod.entry_fee_rate,10);
  net:=p_amount-fee;

  update public.demo_balances
  set available=available-p_amount,updated_at=now()
  where id=bal.id;

  insert into public.index_positions(
    user_id,product_id,version_id,mode,status,
    initial_investment,total_investment,current_value
  )
  values(uid,prod.id,ver,'DEMO','ACTIVE',p_amount,p_amount,net)
  returning id into pos;

  insert into public.index_orders(
    user_id,position_id,product_id,order_type,amount,status,idempotency_key
  )
  values(uid,pos,prod.id,'INITIAL_BUY',p_amount,'FILLED',p_idempotency_key)
  returning id into ord;

  for v_asset in
    select ipa.asset_symbol,ipa.target_weight,mp.price
    from public.index_product_assets ipa
    join public.index_market_prices mp on mp.symbol=ipa.asset_symbol
    where ipa.version_id=ver and ipa.status='ACTIVE'
  loop
    alloc:=net*v_asset.target_weight;
    qty:=alloc/v_asset.price;

    insert into public.index_holdings(
      position_id,asset_symbol,target_weight,quantity,
      average_cost,current_price,current_value
    )
    values(pos,v_asset.asset_symbol,v_asset.target_weight,qty,v_asset.price,alloc,alloc);

    insert into public.index_transactions(
      user_id,position_id,order_id,asset_symbol,side,
      quantity,price,value,fee,reason
    )
    values(uid,pos,ord,v_asset.asset_symbol,'BUY',qty,v_asset.price,alloc,0,'INITIAL_BUY');
  end loop;

  if fee>0 then
    insert into public.index_fees(user_id,position_id,fee_type,amount)
    values(uid,pos,'ENTRY',fee);
  end if;

  insert into public.ledger_entries(
    user_id,mode,asset,amount,entry_type,reference_id,idempotency_key
  )
  values(uid,'DEMO','USDT',-p_amount,'trade',pos,'index-buy-'||p_idempotency_key);

  insert into public.index_logs(user_id,event_type,payload)
  values(uid,'INDEX_INVESTED',jsonb_build_object(
    'position_id',pos,'product_id',prod.id,'amount',p_amount
  ));

  return pos;
end;
$$;
