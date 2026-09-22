-- Align admin member balance with the header wallet USDT deposit/spot balance
create or replace function public.admin_wallet_ops_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
 v_networks jsonb;
 v_deposits jsonb;
 v_withdrawals jsonb;
 v_addresses jsonb;
 v_balances jsonb;
 v_stats jsonb;
begin
 if not public.is_admin_user() then raise exception 'admin_required'; end if;
 select coalesce(jsonb_agg(to_jsonb(n) order by n.asset,n.network),'[]'::jsonb) into v_networks from public.asset_networks n;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_deposits from (select d.*,u.email from public.deposit_records d join auth.users u on u.id=d.user_id order by d.created_at desc limit 200) x;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_withdrawals from (select w.*,u.email from public.withdrawal_requests w join auth.users u on u.id=w.user_id order by w.created_at desc limit 200) x;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_addresses from (select d.*,u.email from public.deposit_addresses d join auth.users u on u.id=d.user_id order by d.created_at desc limit 300) x;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.email),'[]'::jsonb) into v_balances from (
   select u.id as user_id,u.email,'USDT'::text as asset,coalesce(b.available,0) as available,coalesce(b.locked,0) as locked,b.created_at,coalesce(b.updated_at,u.created_at) as updated_at
   from auth.users u
   left join public.demo_balances b on b.user_id=u.id and b.asset='USDT'
   order by u.email
 ) x;
 select jsonb_build_object(
   'networks',(select count(*) from public.asset_networks where active),
   'deposit_enabled',(select count(*) from public.asset_networks where active and deposit_enabled),
   'withdraw_enabled',(select count(*) from public.asset_networks where active and withdraw_enabled),
   'withdraw_pending',(select count(*) from public.withdrawal_requests where status in ('PENDING','REVIEW')),
   'tron_addresses',(select count(distinct user_id) from public.deposit_addresses where active and network='TRC20'),
   'wallet_users',(select count(*) from auth.users)
 ) into v_stats;
 return jsonb_build_object('networks',v_networks,'deposits',v_deposits,'withdrawals',v_withdrawals,'addresses',v_addresses,'balances',v_balances,'stats',v_stats);
end;
$$;

create or replace function public.admin_set_user_usdt_balance(
 p_user_id uuid,
 p_available numeric,
 p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
 v_email text;
 v_before numeric:=0;
 v_locked numeric:=0;
 v_delta numeric:=0;
 v_key text;
begin
 if not public.is_admin_user() then raise exception 'admin_required'; end if;
 if p_user_id is null then raise exception 'user_required'; end if;
 if p_available < 0 then raise exception 'invalid_balance'; end if;
 select email into v_email from auth.users where id=p_user_id;
 if v_email is null then raise exception 'user_not_found'; end if;
 insert into public.demo_balances(user_id,asset,available,locked) values(p_user_id,'USDT',0,0) on conflict(user_id,asset) do nothing;
 select available,locked into v_before,v_locked from public.demo_balances where user_id=p_user_id and asset='USDT' for update;
 v_delta:=p_available-v_before;
 update public.demo_balances set available=p_available,updated_at=now() where user_id=p_user_id and asset='USDT';
 v_key:='admin-usdt-balance-'||gen_random_uuid()::text;
 if v_delta<>0 then
   insert into public.ledger_entries(user_id,mode,asset,amount,entry_type,idempotency_key) values(p_user_id,'DEMO','USDT',v_delta,'admin_balance_adjustment',v_key);
 end if;
 insert into public.admin_logs(admin_user_id,action,target_type,target_id,before_value,after_value)
 values(auth.uid(),'USER_USDT_BALANCE_SET','demo_balance',p_user_id::text,
   jsonb_build_object('email',v_email,'asset','USDT','available',v_before,'locked',v_locked),
   jsonb_build_object('email',v_email,'asset','USDT','available',p_available,'locked',v_locked,'delta',v_delta,'note',p_note));
 return jsonb_build_object('user_id',p_user_id,'email',v_email,'asset','USDT','before',v_before,'available',p_available,'locked',v_locked,'delta',v_delta);
end;
$$;

revoke all on function public.admin_set_user_usdt_balance(uuid,numeric,text) from public,anon;
grant execute on function public.admin_set_user_usdt_balance(uuid,numeric,text) to authenticated;
