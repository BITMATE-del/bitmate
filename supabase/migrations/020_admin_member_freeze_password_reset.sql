-- Admin member security controls: freeze/unfreeze account and reset password.

create or replace function public.admin_set_user_frozen(
  p_user_id uuid,
  p_frozen boolean,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_before timestamptz;
  v_after timestamptz;
  v_email text;
begin
  if not public.is_admin_user() then raise exception 'admin_required'; end if;
  if p_user_id is null then raise exception 'user_required'; end if;
  if p_user_id=auth.uid() then raise exception 'cannot_freeze_self'; end if;

  select banned_until,email into v_before,v_email
  from auth.users
  where id=p_user_id
  for update;
  if not found then raise exception 'user_not_found'; end if;

  v_after:=case when p_frozen then '2099-12-31 23:59:59+00'::timestamptz else null end;

  update auth.users
  set banned_until=v_after,updated_at=now()
  where id=p_user_id;

  if p_frozen then
    delete from auth.sessions where user_id=p_user_id;
  end if;

  insert into public.admin_logs(admin_user_id,action,target_type,target_id,before_value,after_value)
  values(
    auth.uid(),
    case when p_frozen then 'USER_FREEZE' else 'USER_UNFREEZE' end,
    'user',
    p_user_id::text,
    jsonb_build_object('email',v_email,'banned_until',v_before),
    jsonb_build_object('email',v_email,'banned_until',v_after,'reason',nullif(trim(coalesce(p_reason,'')),''))
  );

  return jsonb_build_object('user_id',p_user_id,'frozen',p_frozen,'banned_until',v_after);
end;
$$;

create or replace function public.admin_reset_user_password(
  p_user_id uuid,
  p_temporary_password text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_email text;
begin
  if not public.is_admin_user() then raise exception 'admin_required'; end if;
  if p_user_id is null then raise exception 'user_required'; end if;
  if p_user_id=auth.uid() then raise exception 'cannot_reset_self'; end if;
  if length(coalesce(p_temporary_password,''))<8 then raise exception 'password_too_short'; end if;

  select email into v_email from auth.users where id=p_user_id for update;
  if not found then raise exception 'user_not_found'; end if;

  update auth.users
  set encrypted_password=extensions.crypt(p_temporary_password,extensions.gen_salt('bf',10)),
      updated_at=now()
  where id=p_user_id;

  delete from auth.sessions where user_id=p_user_id;

  insert into public.admin_logs(admin_user_id,action,target_type,target_id,before_value,after_value)
  values(
    auth.uid(),
    'USER_PASSWORD_RESET',
    'user',
    p_user_id::text,
    jsonb_build_object('email',v_email),
    jsonb_build_object('email',v_email,'sessions_revoked',true)
  );

  return jsonb_build_object('user_id',p_user_id,'reset',true);
end;
$$;

create or replace function public.admin_ops_snapshot(p_query text default '')
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
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
    select u.id,u.email,u.phone,u.created_at,u.last_sign_in_at,
           u.raw_app_meta_data->>'role' as role,
           p.display_name,p.vip_level,
           coalesce(k.status,'UNVERIFIED') as kyc_status,
           (u.banned_until is not null and u.banned_until>now()) as frozen,
           u.banned_until,
           coalesce((select jsonb_agg(jsonb_build_object('asset',b.asset,'available',b.available,'locked',b.locked) order by b.asset)
                     from public.demo_balances b where b.user_id=u.id),'[]'::jsonb) as balances
    from auth.users u
    left join public.profiles p on p.id=u.id
    left join public.kyc_requests k on k.user_id=u.id
    where v_q='' or lower(coalesce(u.email,'')) like '%'||v_q||'%'
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
$$;

grant execute on function public.admin_set_user_frozen(uuid,boolean,text) to authenticated;
grant execute on function public.admin_reset_user_password(uuid,text) to authenticated;
