-- CFD uses the single canonical USDT wallet instead of a separate demo balance.

-- private.close_cfd_position
CREATE OR REPLACE FUNCTION private.close_cfd_position(p_position_id uuid, p_percent numeric, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 uid uuid:=auth.uid(); p public.cfd_positions%rowtype; pr public.cfd_products%rowtype; a public.cfd_accounts%rowtype;
 close_qty numeric; px numeric; gross numeric; close_fee numeric; released_margin numeric; net numeric;
 new_qty numeric; new_margin numeric; tx_suffix text:=gen_random_uuid()::text; wallet_credit numeric;
begin
 if uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_percent<=0 or p_percent>100 then raise exception 'INVALID_CLOSE_PERCENT'; end if;

 select * into p from public.cfd_positions where id=p_position_id and user_id=uid for update;
 if p.id is null then raise exception 'POSITION_NOT_FOUND'; end if;
 if p.status not in ('OPEN','PARTIALLY_CLOSED') then raise exception 'POSITION_ALREADY_CLOSING'; end if;

 select * into pr from public.cfd_products where id=p.product_id;
 select * into a from public.cfd_accounts where id=p.account_id for update;

 px:=case when p.side='LONG' then coalesce(pr.bid,pr.current_price) else coalesce(pr.ask,pr.current_price) end;
 if px is null then raise exception 'PRICE_UNAVAILABLE'; end if;

 close_qty:=round(p.remaining_quantity*(p_percent/100),pr.quantity_precision);
 if close_qty<=0 then raise exception 'INVALID_CLOSE_QUANTITY'; end if;

 gross:=case when p.side='LONG' then (px-p.entry_price)*close_qty*pr.contract_size else (p.entry_price-px)*close_qty*pr.contract_size end;
 close_fee:=round((close_qty*px*pr.contract_size)*pr.trading_fee,10);
 released_margin:=round(p.remaining_margin*(close_qty/p.remaining_quantity),10);
 net:=gross-close_fee;
 wallet_credit:=greatest(0,released_margin+net);

 new_qty:=p.remaining_quantity-close_qty;
 new_margin:=greatest(0,p.remaining_margin-released_margin);

 update public.demo_balances
 set locked=greatest(0,locked-released_margin),
     available=available+wallet_credit,
     updated_at=now()
 where user_id=uid and asset='USDT';

 update public.cfd_accounts
 set available_balance=available_balance+wallet_credit,
     used_margin=greatest(0,used_margin-released_margin),
     wallet_balance=wallet_balance+net,
     realized_pnl=realized_pnl+net,
     fee_total=fee_total+close_fee,
     updated_at=now()
 where id=p.account_id;

 if net<>0 then
   insert into public.ledger_entries(user_id,mode,asset,amount,entry_type,idempotency_key)
   values(uid,'DEMO','USDT',net,'trade','cfd-realized:'||p.id||':'||tx_suffix)
   on conflict(user_id,idempotency_key) do nothing;
 end if;

 update public.cfd_positions
 set remaining_quantity=new_qty,
     remaining_margin=new_margin,
     position_value=case when p.remaining_quantity>0 then position_value*(new_qty/p.remaining_quantity) else 0 end,
     realized_pnl=realized_pnl+net,
     fees=fees+close_fee,
     current_price=px,
     unrealized_pnl=case when new_qty>0 then case when side='LONG' then (px-entry_price)*new_qty*pr.contract_size else (entry_price-px)*new_qty*pr.contract_size end else 0 end,
     status=case when new_qty<=0 then 'CLOSED' else 'PARTIALLY_CLOSED' end,
     close_reason=case when new_qty<=0 then p_reason else close_reason end,
     closed_at=case when new_qty<=0 then now() else closed_at end,
     updated_at=now()
 where id=p.id;

 insert into public.cfd_trade_executions(position_id,user_id,execution_type,price,quantity,gross_pnl,fee,net_pnl)
 values(p.id,uid,case when new_qty<=0 then 'FULL_CLOSE' else 'PARTIAL_CLOSE' end,px,close_qty,gross,close_fee,net);

 insert into public.cfd_fees(user_id,position_id,fee_type,rate,base_value,fee)
 values(uid,p.id,'CLOSE',pr.trading_fee,close_qty*px*pr.contract_size,close_fee);

 insert into public.cfd_margin_transactions(account_id,user_id,position_id,type,amount,balance_after,idempotency_key)
 values(p.account_id,uid,p.id,'MARGIN_RELEASE',released_margin,(select available_balance from public.cfd_accounts where id=p.account_id),'margin-release:'||p.id||':'||tx_suffix);

 insert into public.cfd_margin_transactions(account_id,user_id,position_id,type,amount,balance_after,idempotency_key)
 values(p.account_id,uid,p.id,'REALIZED_PNL',net,(select available_balance from public.cfd_accounts where id=p.account_id),'realized:'||p.id||':'||tx_suffix);

 insert into public.cfd_position_events(position_id,user_id,event_type,old_value,new_value)
 values(p.id,uid,case when new_qty<=0 then 'FULL_CLOSE' else 'PARTIAL_CLOSE' end,
   jsonb_build_object('quantity',p.remaining_quantity,'margin',p.remaining_margin),
   jsonb_build_object('quantity',new_qty,'margin',new_margin,'price',px,'net_pnl',net));
end;
$function$
;

-- private.ensure_cfd_demo_account
CREATE OR REPLACE FUNCTION private.ensure_cfd_demo_account()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid:=auth.uid();
  aid uuid;
  v_available numeric:=0;
  v_locked numeric:=0;
  v_has_exposure boolean:=false;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;

  insert into public.demo_balances(user_id,asset,available,locked)
  values(uid,'USDT',0,0)
  on conflict(user_id,asset) do nothing;

  select available,locked into v_available,v_locked
  from public.demo_balances
  where user_id=uid and asset='USDT'
  for update;

  select exists(
    select 1 from public.cfd_positions
    where user_id=uid and status in ('OPEN','PARTIALLY_CLOSED')
  ) or exists(
    select 1 from public.cfd_timed_trades
    where user_id=uid and status='ACTIVE'
  ) into v_has_exposure;

  select id into aid
  from public.cfd_accounts
  where user_id=uid and mode='DEMO' and asset='USDT'
  for update;

  if aid is null then
    insert into public.cfd_accounts(
      user_id,mode,asset,wallet_balance,available_balance,used_margin,trade_hold_balance
    )
    values(uid,'DEMO','USDT',v_available+v_locked,v_available,0,0)
    returning id into aid;
  elsif not v_has_exposure then
    update public.cfd_accounts
    set wallet_balance=v_available+v_locked,
        available_balance=v_available,
        used_margin=0,
        trade_hold_balance=0,
        updated_at=now()
    where id=aid;
  end if;

  return aid;
end;
$function$
;

-- private.open_cfd_market_order
CREATE OR REPLACE FUNCTION private.open_cfd_market_order(p_symbol text, p_side text, p_margin numeric, p_leverage integer, p_stop_loss numeric, p_take_profit numeric, p_client_order_id text, p_idempotency_key text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 uid uuid:=auth.uid(); aid uuid; pr public.cfd_products%rowtype; acc public.cfd_accounts%rowtype;
 px numeric; posval numeric; qty numeric; fee numeric; liq numeric; oid uuid; pid uuid; stale_sec int;
 v_wallet_available numeric; v_wallet_locked numeric;
begin
 if uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if coalesce((select value::text::boolean from public.cfd_settings where key='CFD_ENABLED'),false)=false then raise exception 'CFD_DISABLED'; end if;
 if p_side not in ('LONG','SHORT') then raise exception 'INVALID_SIDE'; end if;
 if p_margin<=0 then raise exception 'INVALID_MARGIN'; end if;

 aid:=private.ensure_cfd_demo_account();
 select * into acc from public.cfd_accounts where id=aid for update;
 if acc.status<>'CFD_ENABLED' then raise exception 'CFD_DISABLED'; end if;

 select * into pr from public.cfd_products where symbol=p_symbol for update;
 if pr.id is null then raise exception 'PRODUCT_NOT_FOUND'; end if;
 if pr.status<>'ACTIVE' or not pr.trading_enabled then raise exception 'PRODUCT_PAUSED'; end if;
 if not (p_leverage=any(pr.available_leverages)) then raise exception 'INVALID_LEVERAGE'; end if;
 if p_margin<pr.min_order or p_margin>pr.max_order then raise exception 'INVALID_MARGIN'; end if;

 stale_sec:=coalesce((select (value#>>'{}')::int from public.cfd_settings where key='PRICE_STALE_SECONDS'),120);
 if pr.current_price is null or pr.last_price_at is null then raise exception 'PRICE_UNAVAILABLE'; end if;
 if pr.last_price_at<now()-make_interval(secs=>stale_sec) then raise exception 'MARKET_DATA_STALE'; end if;

 if exists(select 1 from public.cfd_orders where user_id=uid and (client_order_id=p_client_order_id or idempotency_key=p_idempotency_key)) then
   select id into oid from public.cfd_orders where user_id=uid and (client_order_id=p_client_order_id or idempotency_key=p_idempotency_key) order by created_at limit 1;
   return oid;
 end if;

 px:=case when p_side='LONG' then coalesce(pr.ask,pr.current_price) else coalesce(pr.bid,pr.current_price) end;
 posval:=round(p_margin*p_leverage,10);
 qty:=round(posval/(px*pr.contract_size),pr.quantity_precision);
 fee:=round(posval*pr.trading_fee,10);

 select available,locked into v_wallet_available,v_wallet_locked
 from public.demo_balances
 where user_id=uid and asset='USDT'
 for update;

 if v_wallet_available < p_margin+fee then raise exception 'INSUFFICIENT_BALANCE'; end if;

 if p_side='LONG' then
   liq:=px*(1-(1/p_leverage)+pr.maintenance_margin_rate);
 else
   liq:=px*(1+(1/p_leverage)-pr.maintenance_margin_rate);
 end if;

 insert into public.cfd_orders(user_id,account_id,product_id,symbol,side,margin,leverage,position_value,quantity,requested_price,execution_price,stop_loss,take_profit,fee,status,client_order_id,idempotency_key)
 values(uid,aid,pr.id,pr.symbol,p_side,p_margin,p_leverage,posval,qty,px,px,p_stop_loss,p_take_profit,fee,'FILLED',p_client_order_id,p_idempotency_key)
 returning id into oid;

 update public.demo_balances
 set available=available-p_margin-fee,
     locked=locked+p_margin,
     updated_at=now()
 where user_id=uid and asset='USDT';

 update public.cfd_accounts
 set available_balance=available_balance-p_margin-fee,
     used_margin=used_margin+p_margin,
     wallet_balance=wallet_balance-fee,
     fee_total=fee_total+fee,
     updated_at=now()
 where id=aid;

 insert into public.ledger_entries(user_id,mode,asset,amount,entry_type,reference_id,idempotency_key)
 values(uid,'DEMO','USDT',-fee,'fee',oid,'cfd-open-fee:'||p_idempotency_key)
 on conflict(user_id,idempotency_key) do nothing;

 insert into public.cfd_positions(user_id,account_id,product_id,symbol,side,leverage,initial_margin,remaining_margin,position_value,quantity,remaining_quantity,entry_price,current_price,liquidation_price,stop_loss,take_profit,fees)
 values(uid,aid,pr.id,pr.symbol,p_side,p_leverage,p_margin,p_margin,posval,qty,qty,px,px,liq,p_stop_loss,p_take_profit,fee)
 returning id into pid;

 insert into public.cfd_trade_executions(position_id,order_id,user_id,execution_type,price,quantity,fee,net_pnl)
 values(pid,oid,uid,'OPEN',px,qty,fee,-fee);

 insert into public.cfd_fees(user_id,position_id,order_id,fee_type,rate,base_value,fee)
 values(uid,pid,oid,'OPEN',pr.trading_fee,posval,fee);

 insert into public.cfd_margin_transactions(account_id,user_id,position_id,type,amount,balance_after,idempotency_key)
 values(aid,uid,pid,'MARGIN_LOCK',-p_margin,(select available_balance from public.cfd_accounts where id=aid),'margin-lock:'||pid);

 insert into public.cfd_margin_transactions(account_id,user_id,position_id,type,amount,balance_after,idempotency_key)
 values(aid,uid,pid,'FEE',-fee,(select available_balance from public.cfd_accounts where id=aid),'open-fee:'||pid);

 insert into public.cfd_position_events(position_id,user_id,event_type,new_value)
 values(pid,uid,'POSITION_OPENED',jsonb_build_object('side',p_side,'entry_price',px,'margin',p_margin,'leverage',p_leverage,'quantity',qty));

 insert into public.cfd_logs(user_id,position_id,order_id,event_type,message,payload)
 values(uid,pid,oid,'ORDER_FILLED','CFD market order filled',jsonb_build_object('symbol',p_symbol,'side',p_side,'price',px));

 return oid;
end;
$function$
;

-- private.settle_cfd_timed_trade
CREATE OR REPLACE FUNCTION private.settle_cfd_timed_trade(p_trade_id uuid, p_forced_end_price numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_trade public.cfd_timed_trades%rowtype;
  v_account public.cfd_accounts%rowtype;
  v_end numeric(24,8);
  v_formula jsonb;
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
  v_result:=v_formula->>'result';
  v_payout:=(v_formula->>'payout_amount')::numeric;
  v_net:=(v_formula->>'net_profit')::numeric;

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

  insert into public.cfd_timed_ledger(user_id,account_id,transaction_type,amount,available_before,available_after,trade_hold_before,trade_hold_after,reference_type,reference_id,description,idempotency_key)
  values(v_trade.user_id,v_trade.account_id,'CFD_TRADE_SETTLEMENT',v_payout,v_avail_before,v_avail_before+v_payout,v_hold_before,v_hold_before-v_trade.amount,'CFD_TIMED_TRADE',v_trade.id,v_trade.symbol||' 거래 정산 '||v_result,'settle:'||v_trade.id)
  on conflict(idempotency_key) do nothing;

  return jsonb_build_object('trade_id',v_trade.id,'status','SETTLED','result',v_result,'end_price',v_end,'payout_amount',v_payout,'net_profit',v_net);
end;
$function$
;

-- private.start_cfd_timed_trade
CREATE OR REPLACE FUNCTION private.start_cfd_timed_trade(p_user_id uuid, p_symbol text, p_direction text, p_duration_minutes integer, p_amount numeric, p_idempotency_key text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_account public.cfd_accounts%rowtype;
  v_product public.cfd_products%rowtype;
  v_price numeric(24,8);
  v_trade_id uuid;
  v_avail_before numeric;
  v_hold_before numeric;
  v_wallet_available numeric;
begin
  if p_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_direction not in ('UP','DOWN') then raise exception 'INVALID_DIRECTION'; end if;
  if p_duration_minutes not in (3,5) then raise exception 'INVALID_DURATION'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'INVALID_AMOUNT'; end if;
  if coalesce(trim(p_idempotency_key),'')='' then raise exception 'IDEMPOTENCY_REQUIRED'; end if;

  select * into v_product from public.cfd_products where symbol=upper(p_symbol) for share;
  if v_product.id is null or v_product.status<>'ACTIVE' or not v_product.trading_enabled then raise exception 'PRODUCT_NOT_AVAILABLE'; end if;
  if p_amount<v_product.min_order or p_amount>v_product.max_order then raise exception 'INVALID_AMOUNT'; end if;

  select * into v_account from public.cfd_accounts
   where user_id=p_user_id and mode='DEMO' and asset='USDT'
   limit 1 for update;
  if v_account.id is null then raise exception 'CFD_ACCOUNT_NOT_FOUND'; end if;
  if v_account.status<>'CFD_ENABLED' then raise exception 'CFD_DISABLED'; end if;

  select id into v_trade_id from public.cfd_timed_trades where user_id=p_user_id and idempotency_key=p_idempotency_key;
  if v_trade_id is not null then return v_trade_id; end if;
  if exists(select 1 from public.cfd_timed_trades where user_id=p_user_id and status='ACTIVE') then raise exception 'ACTIVE_TRADE_EXISTS'; end if;

  select available into v_wallet_available
  from public.demo_balances
  where user_id=p_user_id and asset='USDT'
  for update;

  if coalesce(v_wallet_available,0)<p_amount then raise exception 'INSUFFICIENT_BALANCE'; end if;

  v_price:=private.cfd_server_price(upper(p_symbol));
  v_avail_before:=v_account.available_balance;
  v_hold_before:=v_account.trade_hold_balance;

  update public.demo_balances
     set available=available-p_amount,
         locked=locked+p_amount,
         updated_at=now()
   where user_id=p_user_id and asset='USDT';

  update public.cfd_accounts
     set available_balance=available_balance-p_amount,
         trade_hold_balance=trade_hold_balance+p_amount,
         updated_at=now()
   where id=v_account.id;

  insert into public.cfd_timed_trades(user_id,account_id,product_id,symbol,direction,duration_minutes,amount,start_price,idempotency_key,starts_at,expires_at)
  values(p_user_id,v_account.id,v_product.id,v_product.symbol,p_direction,p_duration_minutes,p_amount,v_price,p_idempotency_key,now(),now()+make_interval(mins=>p_duration_minutes))
  returning id into v_trade_id;

  insert into public.cfd_timed_ledger(user_id,account_id,transaction_type,amount,available_before,available_after,trade_hold_before,trade_hold_after,reference_type,reference_id,description,idempotency_key)
  values(p_user_id,v_account.id,'CFD_TRADE_HOLD',-p_amount,v_avail_before,v_avail_before-p_amount,v_hold_before,v_hold_before+p_amount,'CFD_TIMED_TRADE',v_trade_id,v_product.symbol||' '||p_direction||' 거래금액 보류','hold:'||v_trade_id);

  return v_trade_id;
exception when unique_violation then
  select id into v_trade_id from public.cfd_timed_trades where user_id=p_user_id and idempotency_key=p_idempotency_key;
  if v_trade_id is not null then return v_trade_id; end if;
  raise;
end;
$function$
;

-- public.get_cfd_account_summary
CREATE OR REPLACE FUNCTION public.get_cfd_account_summary()
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
 with w as (
   select available,locked
   from public.demo_balances
   where user_id=auth.uid() and asset='USDT'
   limit 1
 ), a as (
   select * from public.cfd_accounts
   where user_id=auth.uid() and mode='DEMO' and asset='USDT'
   limit 1
 ), p as (
   select coalesce(sum(unrealized_pnl),0) upnl,
          count(*) filter(where status in ('OPEN','PARTIALLY_CLOSED')) open_positions
   from public.cfd_positions
   where user_id=auth.uid()
 )
 select jsonb_build_object(
   'wallet_balance',coalesce(w.available,0)+coalesce(w.locked,0),
   'available_balance',coalesce(w.available,0),
   'locked_balance',coalesce(w.locked,0),
   'used_margin',coalesce(a.used_margin,0),
   'unrealized_pnl',p.upnl,
   'equity',coalesce(w.available,0)+coalesce(w.locked,0)+p.upnl,
   'free_margin',coalesce(w.available,0)+p.upnl,
   'margin_level',case when coalesce(a.used_margin,0)>0 then ((coalesce(w.available,0)+coalesce(w.locked,0)+p.upnl)/a.used_margin*100) else null end,
   'open_positions',p.open_positions,
   'mode','UNIFIED'
 )
 from w full join a on true full join p on true;
$function$
;

-- public.get_cfd_timed_account_summary
CREATE OR REPLACE FUNCTION public.get_cfd_timed_account_summary()
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
 with w as (
   select available,locked
   from public.demo_balances
   where user_id=auth.uid() and asset='USDT'
   limit 1
 ), a as (
   select * from public.cfd_accounts
   where user_id=auth.uid() and mode='DEMO' and asset='USDT'
   limit 1
 ), t as (
   select count(*) filter(where status='ACTIVE') active_trades,
          coalesce(sum(net_profit) filter(where status='SETTLED'),0) realized
   from public.cfd_timed_trades where user_id=auth.uid()
 )
 select jsonb_build_object(
   'wallet_balance',coalesce(w.available,0)+coalesce(w.locked,0),
   'available_balance',coalesce(w.available,0),
   'trade_hold_balance',coalesce(a.trade_hold_balance,0),
   'realized_pnl',coalesce(t.realized,0),
   'active_trades',coalesce(t.active_trades,0),
   'asset','USDT'
 )
 from w full join a on true full join t on true;
$function$
;

-- Existing CFD accounts with no open exposure are aligned to the canonical wallet immediately.
update public.cfd_accounts a
set wallet_balance=w.available+w.locked,
    available_balance=w.available,
    used_margin=0,
    trade_hold_balance=0,
    updated_at=now()
from public.demo_balances w
where a.user_id=w.user_id
  and a.mode='DEMO'
  and a.asset='USDT'
  and w.asset='USDT'
  and not exists(select 1 from public.cfd_positions p where p.user_id=a.user_id and p.status in ('OPEN','PARTIALLY_CLOSED'))
  and not exists(select 1 from public.cfd_timed_trades t where t.user_id=a.user_id and t.status='ACTIVE');
