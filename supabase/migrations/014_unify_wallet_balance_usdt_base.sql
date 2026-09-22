-- Use one canonical cash wallet balance: USDT. KRW is display-only and must not exist as a separate wallet row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  insert into public.profiles(id,display_name)
  values(new.id,coalesce(new.raw_user_meta_data->>'name',''))
  on conflict(id) do nothing;

  insert into public.demo_balances(user_id,asset,available,locked)
  values(new.id,'USDT',0,0)
  on conflict(user_id,asset) do nothing;

  return new;
end;
$$;

insert into public.demo_balances(user_id,asset,available,locked)
select u.id,'USDT',0,0
from auth.users u
where not exists(
  select 1 from public.demo_balances b where b.user_id=u.id and b.asset='USDT'
);

delete from public.demo_balances where asset='KRW';

delete from public.ledger_entries
where asset='KRW' and idempotency_key='signup-demo-grant';

create or replace function public.user_wallet_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
 v_available numeric:=0;
 v_locked numeric:=0;
 v_futures numeric:=0;
 v_withdrawals jsonb;
 v_transfers jsonb;
 v_networks jsonb;
begin
 if auth.uid() is null then raise exception 'auth_required'; end if;

 insert into public.demo_balances(user_id,asset,available,locked)
 values(auth.uid(),'USDT',0,0)
 on conflict(user_id,asset) do nothing;

 select available,locked into v_available,v_locked
 from public.demo_balances
 where user_id=auth.uid() and asset='USDT';

 select coalesce(balance,0) into v_futures
 from public.futures_accounts where user_id=auth.uid();

 select coalesce(jsonb_agg(to_jsonb(w) order by w.created_at desc),'[]'::jsonb)
 into v_withdrawals
 from (
   select id,asset,network,address,amount,fee,status,txid,note,created_at,reviewed_at
   from public.withdrawal_requests
   where user_id=auth.uid()
   order by created_at desc limit 50
 ) w;

 select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc),'[]'::jsonb)
 into v_transfers
 from (
   select id,asset,from_account,to_account,amount,status,reference_id,created_at
   from public.internal_transfers
   where user_id=auth.uid()
   order by created_at desc limit 50
 ) t;

 select coalesce(jsonb_agg(jsonb_build_object(
   'asset',asset,'network',network,'display_name',display_name,
   'min_withdraw',min_withdraw,'withdraw_fee',withdraw_fee
 ) order by asset,network),'[]'::jsonb)
 into v_networks
 from public.asset_networks
 where active and withdraw_enabled;

 return jsonb_build_object(
   'wallet',jsonb_build_object(
     'base_currency','USDT',
     'available',v_available,
     'locked',v_locked,
     'total',v_available+v_locked
   ),
   'spot',jsonb_build_array(jsonb_build_object(
     'asset','USDT','available',v_available,'locked',v_locked
   )),
   'futures_usdt',v_futures,
   'withdrawals',v_withdrawals,
   'transfers',v_transfers,
   'withdraw_networks',v_networks
 );
end;
$$;

revoke all on function public.user_wallet_snapshot() from public,anon;
grant execute on function public.user_wallet_snapshot() to authenticated;
