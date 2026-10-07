create or replace function public.dealer_set_user_usdt_balance(p_user_id uuid,p_available numeric,p_note text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid:=private.current_dealer_code_id(); v_email text; v_before numeric:=0; v_locked numeric:=0; v_delta numeric:=0; v_key text;
begin
 if v_id is null then raise exception 'dealer_required'; end if;
 if not private.dealer_owns_user(p_user_id) then raise exception 'not_allowed'; end if;
 if p_available<0 then raise exception 'invalid_balance'; end if;
 select email into v_email from auth.users where id=p_user_id;
 if v_email is null then raise exception 'user_not_found'; end if;
 insert into public.demo_balances(user_id,asset,available,locked) values(p_user_id,'USDT',0,0) on conflict(user_id,asset) do nothing;
 select available,locked into v_before,v_locked from public.demo_balances where user_id=p_user_id and asset='USDT' for update;
 v_delta:=p_available-v_before;
 update public.demo_balances set available=p_available,updated_at=now() where user_id=p_user_id and asset='USDT';
 v_key:='dealer-usdt-balance-'||gen_random_uuid()::text;
 if v_delta<>0 then
   insert into public.ledger_entries(user_id,mode,asset,amount,entry_type,idempotency_key)
   values(p_user_id,'DEMO','USDT',v_delta,'admin_balance_adjustment',v_key);
 end if;
 insert into public.dealer_audit_logs(dealer_code_id,dealer_user_id,action,target_type,target_id,payload)
 values(v_id,auth.uid(),'USER_USDT_BALANCE_SET','demo_balance',p_user_id::text,
        jsonb_build_object('email',v_email,'before',v_before,'available',p_available,'locked',v_locked,'delta',v_delta,'note',p_note));
 return jsonb_build_object('user_id',p_user_id,'before',v_before,'available',p_available,'locked',v_locked,'delta',v_delta);
end $$;
revoke all on function public.dealer_set_user_usdt_balance(uuid,numeric,text) from public,anon;
grant execute on function public.dealer_set_user_usdt_balance(uuid,numeric,text) to authenticated;
