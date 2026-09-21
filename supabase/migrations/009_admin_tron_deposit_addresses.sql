-- Admin TRON deposit address assignment and wallet snapshot extension
create unique index if not exists deposit_addresses_active_asset_address_uidx
on public.deposit_addresses(asset,network,address)
where active=true;

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
 v_stats jsonb;
begin
 if not public.is_admin_user() then raise exception 'admin_required'; end if;

 select coalesce(jsonb_agg(to_jsonb(n) order by n.asset,n.network),'[]'::jsonb)
 into v_networks
 from public.asset_networks n;

 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb)
 into v_deposits
 from (
   select d.*,u.email
   from public.deposit_records d
   join auth.users u on u.id=d.user_id
   order by d.created_at desc
   limit 200
 ) x;

 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb)
 into v_withdrawals
 from (
   select w.*,u.email
   from public.withdrawal_requests w
   join auth.users u on u.id=w.user_id
   order by w.created_at desc
   limit 200
 ) x;

 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb)
 into v_addresses
 from (
   select d.*,u.email
   from public.deposit_addresses d
   join auth.users u on u.id=d.user_id
   order by d.created_at desc
   limit 300
 ) x;

 select jsonb_build_object(
   'networks',(select count(*) from public.asset_networks where active),
   'deposit_enabled',(select count(*) from public.asset_networks where active and deposit_enabled),
   'withdraw_enabled',(select count(*) from public.asset_networks where active and withdraw_enabled),
   'withdraw_pending',(select count(*) from public.withdrawal_requests where status in ('PENDING','REVIEW')),
   'tron_addresses',(select count(distinct user_id) from public.deposit_addresses where active and network='TRC20')
 ) into v_stats;

 return jsonb_build_object(
   'networks',v_networks,
   'deposits',v_deposits,
   'withdrawals',v_withdrawals,
   'addresses',v_addresses,
   'stats',v_stats
 );
end;
$$;

create or replace function public.admin_assign_tron_deposit_address(
 p_email text,
 p_address text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
 v_user uuid;
 v_email text:=lower(trim(p_email));
 v_address text:=trim(p_address);
begin
 if not public.is_admin_user() then raise exception 'admin_required'; end if;
 if length(v_address)<>34 or left(v_address,1)<>'T' then raise exception 'invalid_tron_address'; end if;

 select id into v_user from auth.users where lower(email)=v_email limit 1;
 if v_user is null then raise exception 'user_not_found'; end if;

 update public.deposit_addresses
 set active=false,updated_at=now()
 where user_id=v_user and network='TRC20' and asset in ('USDT','TRX') and active;

 insert into public.deposit_addresses(user_id,asset,network,address,provider,active,scan_from)
 values
   (v_user,'USDT','TRC20',v_address,'TRONGRID',true,now()),
   (v_user,'TRX','TRC20',v_address,'TRONGRID',true,now())
 on conflict(user_id,asset,network,address)
 do update set active=true,provider='TRONGRID',scan_from=now(),updated_at=now();

 insert into public.admin_logs(admin_user_id,action,target_type,target_id,after_value)
 values(
   auth.uid(),'TRON_DEPOSIT_ADDRESS_ASSIGN','deposit_address',v_user::text,
   jsonb_build_object('email',v_email,'address',v_address,'assets',jsonb_build_array('USDT','TRX'))
 );

 return jsonb_build_object('user_id',v_user,'email',v_email,'address',v_address,'assets',jsonb_build_array('USDT','TRX'));
end;
$$;

revoke all on function public.admin_assign_tron_deposit_address(text,text) from public,anon;
grant execute on function public.admin_assign_tron_deposit_address(text,text) to authenticated;
