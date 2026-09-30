create or replace function public.admin_ops_snapshot(p_query text default ''::text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_q text := lower(trim(coalesce(p_query,'')));
  v_users jsonb;
  v_kyc jsonb;
  v_deletions jsonb;
  v_settings jsonb;
  v_stats jsonb;
begin
  if not public.is_admin_user() then raise exception 'admin_required'; end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb)
  into v_users
  from (
    select u.id,
           u.email,
           u.phone,
           u.email_confirmed_at,
           u.phone_confirmed_at,
           (u.email_confirmed_at is not null) as email_verified,
           (u.phone_confirmed_at is not null) as phone_verified,
           u.created_at,
           u.last_sign_in_at,
           u.raw_app_meta_data->>'role' as role,
           p.display_name,
           p.vip_level,
           coalesce(k.status,'UNVERIFIED') as kyc_status,
           (u.banned_until is not null and u.banned_until>now()) as frozen,
           u.banned_until,
           coalesce((select jsonb_agg(jsonb_build_object('asset',b.asset,'available',b.available,'locked',b.locked) order by b.asset)
                     from public.demo_balances b where b.user_id=u.id),'[]'::jsonb) as balances
    from auth.users u
    left join public.profiles p on p.id=u.id
    left join public.kyc_requests k on k.user_id=u.id
    where v_q='' or lower(coalesce(u.email,'')) like '%'||v_q||'%'
      or lower(coalesce(u.phone,'')) like '%'||v_q||'%'
      or lower(coalesce(p.display_name,'')) like '%'||v_q||'%'
      or u.id::text like '%'||v_q||'%'
    order by u.created_at desc
    limit 100
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.submitted_at desc),'[]'::jsonb)
  into v_kyc
  from (
    select k.id,k.user_id,u.email,k.country,k.full_name,k.status,k.submitted_at,k.reviewed_at
    from public.kyc_requests k
    join auth.users u on u.id=k.user_id
    order by k.submitted_at desc
    limit 100
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb)
  into v_deletions
  from (
    select d.id,d.user_id,u.email,d.reason,d.status,d.created_at,d.updated_at
    from public.account_deletion_requests d
    join auth.users u on u.id=d.user_id
    order by d.created_at desc
    limit 100
  ) x;

  select coalesce(jsonb_object_agg(s.key,s.value),'{}'::jsonb)
  into v_settings
  from public.system_settings s;

  select jsonb_build_object(
    'users',(select count(*) from auth.users),
    'frozen_users',(select count(*) from auth.users where banned_until is not null and banned_until>now()),
    'kyc_pending',(select count(*) from public.kyc_requests where status='PENDING'),
    'deletion_pending',(select count(*) from public.account_deletion_requests where status='PENDING'),
    'api_active',(select count(*) from public.api_credentials where status='ACTIVE'),
    'sub_accounts',(select count(*) from public.sub_accounts where status='ACTIVE')
  ) into v_stats;

  return jsonb_build_object('users',v_users,'kyc',v_kyc,'deletions',v_deletions,'settings',v_settings,'stats',v_stats);
end;
$function$;
