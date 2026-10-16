-- Synchronize USDT canonical wallet for future CFD admin corrections only.
CREATE OR REPLACE FUNCTION private.admin_correct_cfd_timed_trade(p_trade_id uuid, p_new_end_price numeric, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_trade public.cfd_timed_trades%rowtype;
  v_account public.cfd_accounts%rowtype;
  v_formula jsonb;
  v_new_result text;
  v_new_payout numeric;
  v_new_net numeric;
  v_delta numeric;
  v_avail_before numeric;
  v_hold_before numeric;
begin
  if not private.cfd_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_new_end_price is null or p_new_end_price<=0 then raise exception 'INVALID_PRICE'; end if;
  if coalesce(trim(p_reason),'')='' then raise exception 'REASON_REQUIRED'; end if;

  select * into v_trade from public.cfd_timed_trades where id=p_trade_id for update;
  if v_trade.id is null then raise exception 'TRADE_NOT_FOUND'; end if;
  if v_trade.status<>'SETTLED' then raise exception 'TRADE_NOT_SETTLED'; end if;

  v_formula:=private.cfd_timed_formula(v_trade.direction,v_trade.start_price,p_new_end_price,v_trade.amount);
  v_new_result:=v_formula->>'result';
  v_new_payout:=(v_formula->>'payout_amount')::numeric;
  v_new_net:=(v_formula->>'net_profit')::numeric;
  v_delta:=v_new_payout-coalesce(v_trade.payout_amount,0);

  select * into v_account from public.cfd_accounts where id=v_trade.account_id for update;
  v_avail_before:=v_account.available_balance; v_hold_before:=v_account.trade_hold_balance;
  -- Update the canonical wallet in the same transaction as the CFD correction.
  update public.demo_balances
     set available=available+v_delta,updated_at=now()
   where user_id=v_trade.user_id and asset='USDT'
     and available+v_delta>=0;
  if not found then raise exception 'CANONICAL_WALLET_MISSING_OR_INSUFFICIENT'; end if;

  update public.cfd_accounts
     set available_balance=available_balance+v_delta,
         wallet_balance=wallet_balance+v_delta,
         realized_pnl=realized_pnl+(v_new_net-coalesce(v_trade.net_profit,0)),
         updated_at=now()
   where id=v_account.id;

  insert into public.cfd_timed_trade_corrections(trade_id,admin_id,old_end_price,new_end_price,old_result,new_result,old_payout,new_payout,balance_delta,reason)
  values(v_trade.id,auth.uid(),v_trade.end_price,p_new_end_price,v_trade.result,v_new_result,coalesce(v_trade.payout_amount,0),v_new_payout,v_delta,p_reason);

  update public.cfd_timed_trades set end_price=p_new_end_price,result=v_new_result,payout_amount=v_new_payout,net_profit=v_new_net,updated_at=now() where id=v_trade.id;

  insert into public.cfd_timed_ledger(user_id,account_id,transaction_type,amount,available_before,available_after,trade_hold_before,trade_hold_after,reference_type,reference_id,description,idempotency_key)
  values(v_trade.user_id,v_trade.account_id,'CFD_TRADE_CORRECTION',v_delta,v_avail_before,v_avail_before+v_delta,v_hold_before,v_hold_before,'CFD_TIMED_TRADE',v_trade.id,'관리자 거래 정정: '||p_reason,'correction:'||v_trade.id||':'||gen_random_uuid());

  insert into public.cfd_admin_actions(admin_id,action_type,target_user,before_data,after_data,reason)
  values(auth.uid(),'TIMED_CFD_CORRECTED',v_trade.user_id,to_jsonb(v_trade),(select to_jsonb(x) from public.cfd_timed_trades x where x.id=v_trade.id),p_reason);

  return jsonb_build_object('trade_id',v_trade.id,'result',v_new_result,'payout_amount',v_new_payout,'net_profit',v_new_net,'balance_delta',v_delta);
end $function$
;
