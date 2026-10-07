create or replace function public.dealer_portal_snapshot()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid:=private.current_dealer_code_id(); v_code public.dealer_codes%rowtype;
begin
 if v_id is null then raise exception 'dealer_required'; end if;
 select * into v_code from public.dealer_codes where id=v_id;
 return jsonb_build_object(
  'dealer',to_jsonb(v_code),
  'settings',(select coalesce(jsonb_agg(to_jsonb(s) order by s.asset,s.network),'[]'::jsonb) from public.dealer_payment_settings s where s.dealer_code_id=v_id),
  'members',(select coalesce(jsonb_agg(to_jsonb(x) order by x.joined_at desc),'[]'::jsonb) from (
    select m.user_id,m.joined_at,u.email,u.banned_until,coalesce(b.available,0) usdt_available,coalesce(b.locked,0) usdt_locked
    from public.dealer_members m join auth.users u on u.id=m.user_id
    left join public.demo_balances b on b.user_id=m.user_id and b.asset='USDT'
    where m.dealer_code_id=v_id
  ) x),
  'p2p_players',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from (
    select p.*,u.email
    from public.p2p_players p
    join public.dealer_members m on m.user_id=p.user_id and m.dealer_code_id=v_id
    join auth.users u on u.id=p.user_id
    order by p.created_at desc limit 200
  ) x),
  'deposits',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from (
    select r.*,u.email from public.deposit_records r
    join public.dealer_members m on m.user_id=r.user_id and m.dealer_code_id=v_id
    join auth.users u on u.id=r.user_id order by r.created_at desc limit 200
  ) x),
  'withdrawals',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from (
    select w.*,u.email from public.withdrawal_requests w
    join public.dealer_members m on m.user_id=w.user_id and m.dealer_code_id=v_id
    join auth.users u on u.id=w.user_id order by w.created_at desc limit 200
  ) x),
  'loans',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from (
    select l.*,u.email from public.crypto_loans l
    join public.dealer_members m on m.user_id=l.user_id and m.dealer_code_id=v_id
    join auth.users u on u.id=l.user_id order by l.created_at desc limit 200
  ) x),
  'cfd_trades',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from (
    select t.*,u.email,o.override_value,o.reason override_reason,o.updated_at override_updated_at
    from public.cfd_timed_trades t
    join public.dealer_members m on m.user_id=t.user_id and m.dealer_code_id=v_id
    join auth.users u on u.id=t.user_id
    left join public.cfd_timed_round_overrides o on o.trade_id=t.id
    order by t.created_at desc limit 200
  ) x)
 );
end $$;

create or replace function public.dealer_set_user_frozen(p_user_id uuid,p_frozen boolean,p_reason text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid:=private.current_dealer_code_id(); v_before timestamptz; v_after timestamptz; v_email text;
begin
 if v_id is null then raise exception 'dealer_required'; end if;
 if not private.dealer_owns_user(p_user_id) then raise exception 'not_allowed'; end if;
 if p_user_id=auth.uid() then raise exception 'cannot_freeze_self'; end if;
 select banned_until,email into v_before,v_email from auth.users where id=p_user_id for update;
 if not found then raise exception 'user_not_found'; end if;
 v_after:=case when p_frozen then '2099-12-31 23:59:59+00'::timestamptz else null end;
 update auth.users set banned_until=v_after,updated_at=now() where id=p_user_id;
 if p_frozen then delete from auth.sessions where user_id=p_user_id; end if;
 insert into public.dealer_audit_logs(dealer_code_id,dealer_user_id,action,target_type,target_id,payload)
 values(v_id,auth.uid(),case when p_frozen then 'USER_FREEZE' else 'USER_UNFREEZE' end,'user',p_user_id::text,
        jsonb_build_object('email',v_email,'before',v_before,'after',v_after,'reason',p_reason));
 return jsonb_build_object('user_id',p_user_id,'frozen',p_frozen,'banned_until',v_after);
end $$;

create or replace function public.dealer_set_p2p_player_status(p_id uuid,p_status text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid:=private.current_dealer_code_id(); v_before jsonb; v_user uuid; v_after jsonb;
begin
 if v_id is null then raise exception 'dealer_required'; end if;
 if upper(p_status) not in ('PENDING','APPROVED','REJECTED','SUSPENDED') then raise exception 'invalid_status'; end if;
 select p.user_id,to_jsonb(p) into v_user,v_before
 from public.p2p_players p
 join public.dealer_members m on m.user_id=p.user_id and m.dealer_code_id=v_id
 where p.id=p_id
 for update of p;
 if v_user is null then raise exception 'not_allowed'; end if;
 update public.p2p_players set status=upper(p_status),updated_at=now() where id=p_id;
 select to_jsonb(p) into v_after from public.p2p_players p where p.id=p_id;
 insert into public.dealer_audit_logs(dealer_code_id,dealer_user_id,action,target_type,target_id,payload)
 values(v_id,auth.uid(),'P2P_PLAYER_STATUS_UPDATE','p2p_player',p_id::text,jsonb_build_object('before',v_before,'after',v_after));
 return jsonb_build_object('id',p_id,'status',upper(p_status),'saved',true);
end $$;

revoke all on function public.dealer_set_user_frozen(uuid,boolean,text),public.dealer_set_p2p_player_status(uuid,text) from public,anon;
grant execute on function public.dealer_set_user_frozen(uuid,boolean,text),public.dealer_set_p2p_player_status(uuid,text) to authenticated;
