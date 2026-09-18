-- Unified admin operations controls
create or replace function public.is_admin_user() returns boolean language sql stable security definer set search_path='' as $$
  select coalesce((auth.jwt()->'app_metadata'->>'role') in ('admin','superadmin'), false)
      or coalesce((auth.jwt()->'app_metadata'->>'superadmin')::boolean, false);
$$;

revoke all on function public.is_admin_user() from public, anon;
grant execute on function public.is_admin_user() to authenticated;

create or replace function public.admin_ops_snapshot(p_query text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare v_q text := lower(trim(coalesce(p_query,''))); v_users jsonb; v_kyc jsonb; v_deletions jsonb; v_settings jsonb; v_stats jsonb;
begin
  if not public.is_admin_user() then raise exception 'admin_required'; end if;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_users from (
    select u.id,u.email,u.phone,u.created_at,u.last_sign_in_at,u.raw_app_meta_data->>'role' as role,
      p.display_name,p.vip_level,coalesce(k.status,'UNVERIFIED') as kyc_status,
      coalesce((select jsonb_agg(jsonb_build_object('asset',b.asset,'available',b.available,'locked',b.locked) order by b.asset) from public.demo_balances b where b.user_id=u.id),'[]'::jsonb) as balances
    from auth.users u left join public.profiles p on p.id=u.id left join public.kyc_requests k on k.user_id=u.id
    where v_q='' or lower(coalesce(u.email,'')) like '%'||v_q||'%' or lower(coalesce(p.display_name,'')) like '%'||v_q||'%' or u.id::text like '%'||v_q||'%'
    order by u.created_at desc limit 100) x;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.submitted_at desc),'[]'::jsonb) into v_kyc from (
    select k.id,k.user_id,u.email,k.country,k.full_name,k.status,k.submitted_at,k.reviewed_at from public.kyc_requests k join auth.users u on u.id=k.user_id order by k.submitted_at desc limit 100) x;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_deletions from (
    select d.id,d.user_id,u.email,d.reason,d.status,d.created_at,d.updated_at from public.account_deletion_requests d join auth.users u on u.id=d.user_id order by d.created_at desc limit 100) x;
  select coalesce(jsonb_object_agg(s.key,s.value),'{}'::jsonb) into v_settings from public.system_settings s;
  select jsonb_build_object('users',(select count(*) from auth.users),'kyc_pending',(select count(*) from public.kyc_requests where status='PENDING'),'deletion_pending',(select count(*) from public.account_deletion_requests where status='PENDING'),'api_active',(select count(*) from public.api_credentials where status='ACTIVE'),'sub_accounts',(select count(*) from public.sub_accounts where status='ACTIVE')) into v_stats;
  return jsonb_build_object('users',v_users,'kyc',v_kyc,'deletions',v_deletions,'settings',v_settings,'stats',v_stats);
end; $$;

revoke all on function public.admin_ops_snapshot(text) from public, anon;
grant execute on function public.admin_ops_snapshot(text) to authenticated;

create or replace function public.admin_update_profile(p_user_id uuid,p_display_name text,p_vip_level text) returns void language plpgsql security definer set search_path='' as $$
declare v_before jsonb;
begin
 if not public.is_admin_user() then raise exception 'admin_required'; end if;
 select to_jsonb(p) into v_before from public.profiles p where p.id=p_user_id;
 insert into public.profiles(id,display_name,vip_level,updated_at) values(p_user_id,nullif(trim(p_display_name),''),coalesce(nullif(trim(p_vip_level),''),'BASIC'),now())
 on conflict(id) do update set display_name=excluded.display_name,vip_level=excluded.vip_level,updated_at=now();
 insert into public.admin_logs(admin_user_id,action,target_type,target_id,before_value,after_value) values(auth.uid(),'PROFILE_UPDATE','user',p_user_id::text,v_before,jsonb_build_object('display_name',nullif(trim(p_display_name),''),'vip_level',coalesce(nullif(trim(p_vip_level),''),'BASIC')));
end; $$;

create or replace function public.admin_update_kyc(p_request_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare v_before jsonb;
begin
 if not public.is_admin_user() then raise exception 'admin_required'; end if;
 if upper(p_status) not in ('PENDING','APPROVED','REJECTED') then raise exception 'invalid_status'; end if;
 select to_jsonb(k) into v_before from public.kyc_requests k where k.id=p_request_id;
 update public.kyc_requests set status=upper(p_status),reviewed_at=case when upper(p_status)='PENDING' then null else now() end where id=p_request_id;
 insert into public.admin_logs(admin_user_id,action,target_type,target_id,before_value,after_value) values(auth.uid(),'KYC_UPDATE','kyc',p_request_id::text,v_before,jsonb_build_object('status',upper(p_status)));
end; $$;

create or replace function public.admin_update_deletion(p_request_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare v_before jsonb;
begin
 if not public.is_admin_user() then raise exception 'admin_required'; end if;
 if upper(p_status) not in ('PENDING','APPROVED','REJECTED') then raise exception 'invalid_status'; end if;
 select to_jsonb(d) into v_before from public.account_deletion_requests d where d.id=p_request_id;
 update public.account_deletion_requests set status=upper(p_status),updated_at=now() where id=p_request_id;
 insert into public.admin_logs(admin_user_id,action,target_type,target_id,before_value,after_value) values(auth.uid(),'DELETION_REQUEST_UPDATE','account_deletion',p_request_id::text,v_before,jsonb_build_object('status',upper(p_status)));
end; $$;

create or replace function public.admin_adjust_demo_balance(p_user_id uuid,p_asset text,p_amount numeric,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_asset text:=upper(trim(p_asset)); v_before numeric; v_after numeric; v_key text;
begin
 if not public.is_admin_user() then raise exception 'admin_required'; end if;
 if v_asset='' or p_amount=0 then raise exception 'invalid_adjustment'; end if;
 if length(trim(coalesce(p_reason,'')))<3 then raise exception 'reason_required'; end if;
 insert into public.demo_balances(user_id,asset,available,locked) values(p_user_id,v_asset,0,0) on conflict(user_id,asset) do nothing;
 select available into v_before from public.demo_balances where user_id=p_user_id and asset=v_asset for update;
 v_after:=v_before+p_amount; if v_after<0 then raise exception 'insufficient_balance'; end if;
 update public.demo_balances set available=v_after,updated_at=now() where user_id=p_user_id and asset=v_asset;
 v_key:='admin-adjust-'||gen_random_uuid()::text;
 insert into public.ledger_entries(user_id,mode,asset,amount,entry_type,idempotency_key) values(p_user_id,'DEMO',v_asset,p_amount,'adjustment',v_key);
 insert into public.admin_logs(admin_user_id,action,target_type,target_id,before_value,after_value) values(auth.uid(),'DEMO_BALANCE_ADJUST','balance',p_user_id::text||':'||v_asset,jsonb_build_object('available',v_before),jsonb_build_object('available',v_after,'amount',p_amount,'reason',trim(p_reason)));
 return jsonb_build_object('before',v_before,'after',v_after,'asset',v_asset);
end; $$;

create or replace function public.admin_set_system_setting(p_key text,p_value jsonb) returns void language plpgsql security definer set search_path='' as $$
declare v_before jsonb;
begin
 if not public.is_admin_user() then raise exception 'admin_required'; end if;
 select value into v_before from public.system_settings where key=p_key;
 insert into public.system_settings(key,value,updated_at) values(upper(trim(p_key)),p_value,now()) on conflict(key) do update set value=excluded.value,updated_at=now();
 insert into public.admin_logs(admin_user_id,action,target_type,target_id,before_value,after_value) values(auth.uid(),'SYSTEM_SETTING_UPDATE','system_setting',upper(trim(p_key)),v_before,p_value);
end; $$;

revoke all on function public.admin_update_profile(uuid,text,text), public.admin_update_kyc(uuid,text), public.admin_update_deletion(uuid,text), public.admin_adjust_demo_balance(uuid,text,numeric,text), public.admin_set_system_setting(text,jsonb) from public, anon;
grant execute on function public.admin_update_profile(uuid,text,text), public.admin_update_kyc(uuid,text), public.admin_update_deletion(uuid,text), public.admin_adjust_demo_balance(uuid,text,numeric,text), public.admin_set_system_setting(text,jsonb) to authenticated;
