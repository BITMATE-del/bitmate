-- Admin controls for API keys, sub-accounts, referral services and audit log
create or replace function public.admin_member_services_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_api jsonb; v_subs jsonb; v_codes jsonb; v_rewards jsonb; v_logs jsonb; v_stats jsonb;
begin
 if not public.is_admin_user() then raise exception 'admin_required'; end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_api from (
  select a.id,a.user_id,u.email,a.label,a.key_prefix,a.permissions,a.ip_whitelist,a.status,a.created_at,a.last_used_at
  from public.api_credentials a join auth.users u on u.id=a.user_id order by a.created_at desc limit 200) x;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_subs from (
  select s.id,s.user_id,u.email,s.name,s.status,s.created_at from public.sub_accounts s join auth.users u on u.id=s.user_id order by s.created_at desc limit 200) x;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_codes from (
  select c.id,c.user_id,u.email,c.code,c.active,c.created_at,
   (select count(*) from public.referrals r where r.referrer_user_id=c.user_id) as referrals_total,
   (select count(*) from public.referrals r where r.referrer_user_id=c.user_id and r.status='QUALIFIED') as referrals_qualified
  from public.referral_codes c join auth.users u on u.id=c.user_id order by c.created_at desc limit 200) x;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_rewards from (
  select e.id,e.user_id,u.email,e.referred_user_id,e.reward_type,e.amount,e.asset,e.status,e.reference_type,e.reference_id,e.created_at,e.paid_at
  from public.referral_reward_events e join auth.users u on u.id=e.user_id order by e.created_at desc limit 200) x;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_logs from (
  select l.id,l.admin_user_id,u.email as admin_email,l.action,l.target_type,l.target_id,l.before_value,l.after_value,l.ip,l.created_at
  from public.admin_logs l left join auth.users u on u.id=l.admin_user_id order by l.created_at desc limit 250) x;
 select jsonb_build_object('api_total',(select count(*) from public.api_credentials),'api_active',(select count(*) from public.api_credentials where status='ACTIVE'),'sub_total',(select count(*) from public.sub_accounts),'sub_active',(select count(*) from public.sub_accounts where status='ACTIVE'),'referral_codes',(select count(*) from public.referral_codes),'reward_pending',(select count(*) from public.referral_reward_events where status='PENDING')) into v_stats;
 return jsonb_build_object('api',v_api,'subs',v_subs,'codes',v_codes,'rewards',v_rewards,'logs',v_logs,'stats',v_stats);
end; $$;

create or replace function public.admin_set_api_status(p_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare v_before jsonb;
begin
 if not public.is_admin_user() then raise exception 'admin_required'; end if;
 if upper(p_status) not in ('ACTIVE','REVOKED','SUSPENDED') then raise exception 'invalid_status'; end if;
 select to_jsonb(a) into v_before from public.api_credentials a where a.id=p_id;
 update public.api_credentials set status=upper(p_status) where id=p_id;
 insert into public.admin_logs(admin_user_id,action,target_type,target_id,before_value,after_value) values(auth.uid(),'API_STATUS_UPDATE','api_credential',p_id::text,v_before,jsonb_build_object('status',upper(p_status)));
end; $$;

create or replace function public.admin_set_subaccount_status(p_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare v_before jsonb;
begin
 if not public.is_admin_user() then raise exception 'admin_required'; end if;
 if upper(p_status) not in ('ACTIVE','SUSPENDED','CLOSED') then raise exception 'invalid_status'; end if;
 select to_jsonb(a) into v_before from public.sub_accounts a where a.id=p_id;
 update public.sub_accounts set status=upper(p_status) where id=p_id;
 insert into public.admin_logs(admin_user_id,action,target_type,target_id,before_value,after_value) values(auth.uid(),'SUBACCOUNT_STATUS_UPDATE','sub_account',p_id::text,v_before,jsonb_build_object('status',upper(p_status)));
end; $$;

create or replace function public.admin_set_referral_code_active(p_id uuid,p_active boolean) returns void language plpgsql security definer set search_path='' as $$
declare v_before jsonb;
begin
 if not public.is_admin_user() then raise exception 'admin_required'; end if;
 select to_jsonb(c) into v_before from public.referral_codes c where c.id=p_id;
 update public.referral_codes set active=p_active where id=p_id;
 insert into public.admin_logs(admin_user_id,action,target_type,target_id,before_value,after_value) values(auth.uid(),'REFERRAL_CODE_UPDATE','referral_code',p_id::text,v_before,jsonb_build_object('active',p_active));
end; $$;

create or replace function public.admin_set_referral_reward_status(p_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare v_before jsonb;
begin
 if not public.is_admin_user() then raise exception 'admin_required'; end if;
 if upper(p_status) not in ('PENDING','APPROVED','PAID','REJECTED') then raise exception 'invalid_status'; end if;
 select to_jsonb(e) into v_before from public.referral_reward_events e where e.id=p_id;
 update public.referral_reward_events set status=upper(p_status),paid_at=case when upper(p_status)='PAID' then now() else paid_at end where id=p_id;
 insert into public.admin_logs(admin_user_id,action,target_type,target_id,before_value,after_value) values(auth.uid(),'REFERRAL_REWARD_UPDATE','referral_reward',p_id::text,v_before,jsonb_build_object('status',upper(p_status)));
end; $$;

revoke all on function public.admin_member_services_snapshot(), public.admin_set_api_status(uuid,text), public.admin_set_subaccount_status(uuid,text), public.admin_set_referral_code_active(uuid,boolean), public.admin_set_referral_reward_status(uuid,text) from public, anon;
grant execute on function public.admin_member_services_snapshot(), public.admin_set_api_status(uuid,text), public.admin_set_subaccount_status(uuid,text), public.admin_set_referral_code_active(uuid,boolean), public.admin_set_referral_reward_status(uuid,text) to authenticated;
