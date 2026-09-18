-- P2P admin controls
create table if not exists public.p2p_ads(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 side text not null check(side in ('BUY','SELL')), asset text not null default 'USDT', fiat text not null default 'KRW',
 price numeric(30,8) not null check(price>0), available_amount numeric(30,10) not null default 0 check(available_amount>=0),
 min_order numeric(30,2) not null default 0, max_order numeric(30,2) not null default 0,
 payment_methods text[] not null default '{}', status text not null default 'ACTIVE' check(status in ('ACTIVE','PAUSED','CLOSED','SUSPENDED')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.p2p_ads enable row level security;
grant select on public.p2p_ads to anon,authenticated;
drop policy if exists p2p_ads_public_read on public.p2p_ads;
create policy p2p_ads_public_read on public.p2p_ads for select to anon,authenticated using(status='ACTIVE' or auth.uid()=user_id);

create table if not exists public.p2p_orders(
 id uuid primary key default gen_random_uuid(), ad_id uuid references public.p2p_ads(id) on delete set null,
 buyer_id uuid not null references auth.users(id), seller_id uuid not null references auth.users(id), asset text not null, fiat text not null,
 price numeric(30,8) not null, asset_amount numeric(30,10) not null check(asset_amount>0), fiat_amount numeric(30,2) not null check(fiat_amount>0),
 payment_method text, status text not null default 'PENDING_PAYMENT' check(status in ('PENDING_PAYMENT','PAID','RELEASED','CANCELLED','DISPUTED','REFUNDED')),
 created_at timestamptz not null default now(), paid_at timestamptz, completed_at timestamptz, updated_at timestamptz not null default now()
);
alter table public.p2p_orders enable row level security;
grant select on public.p2p_orders to authenticated;
drop policy if exists p2p_orders_party_read on public.p2p_orders;
create policy p2p_orders_party_read on public.p2p_orders for select to authenticated using(auth.uid()=buyer_id or auth.uid()=seller_id);

create or replace function public.admin_p2p_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_ads jsonb;v_orders jsonb;v_stats jsonb;
begin
 if not public.is_admin_user() then raise exception 'admin_required'; end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_ads from (
  select a.*,u.email from public.p2p_ads a join auth.users u on u.id=a.user_id order by a.created_at desc limit 200) x;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_orders from (
  select o.*,bu.email buyer_email,su.email seller_email from public.p2p_orders o
  join auth.users bu on bu.id=o.buyer_id join auth.users su on su.id=o.seller_id order by o.created_at desc limit 200) x;
 select jsonb_build_object('active_ads',(select count(*) from public.p2p_ads where status='ACTIVE'),'open_orders',(select count(*) from public.p2p_orders where status in ('PENDING_PAYMENT','PAID','DISPUTED')),'disputes',(select count(*) from public.p2p_orders where status='DISPUTED')) into v_stats;
 return jsonb_build_object('ads',v_ads,'orders',v_orders,'stats',v_stats);
end; $$;

create or replace function public.admin_set_p2p_ad_status(p_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare v_before jsonb;
begin
 if not public.is_admin_user() then raise exception 'admin_required'; end if;
 if upper(p_status) not in ('ACTIVE','PAUSED','CLOSED','SUSPENDED') then raise exception 'invalid_status'; end if;
 select to_jsonb(a) into v_before from public.p2p_ads a where id=p_id;
 update public.p2p_ads set status=upper(p_status),updated_at=now() where id=p_id;
 insert into public.admin_logs(admin_user_id,action,target_type,target_id,before_value,after_value) select auth.uid(),'P2P_AD_STATUS_UPDATE','p2p_ad',p_id::text,v_before,to_jsonb(a) from public.p2p_ads a where a.id=p_id;
end; $$;

create or replace function public.admin_set_p2p_order_status(p_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare v_before jsonb;
begin
 if not public.is_admin_user() then raise exception 'admin_required'; end if;
 if upper(p_status) not in ('PENDING_PAYMENT','PAID','RELEASED','CANCELLED','DISPUTED','REFUNDED') then raise exception 'invalid_status'; end if;
 select to_jsonb(o) into v_before from public.p2p_orders o where id=p_id;
 update public.p2p_orders set status=upper(p_status),paid_at=case when upper(p_status)='PAID' then coalesce(paid_at,now()) else paid_at end,completed_at=case when upper(p_status) in ('RELEASED','CANCELLED','REFUNDED') then now() else completed_at end,updated_at=now() where id=p_id;
 insert into public.admin_logs(admin_user_id,action,target_type,target_id,before_value,after_value) select auth.uid(),'P2P_ORDER_STATUS_UPDATE','p2p_order',p_id::text,v_before,to_jsonb(o) from public.p2p_orders o where o.id=p_id;
end; $$;

revoke all on function public.admin_p2p_snapshot(), public.admin_set_p2p_ad_status(uuid,text), public.admin_set_p2p_order_status(uuid,text) from public,anon;
grant execute on function public.admin_p2p_snapshot(), public.admin_set_p2p_ad_status(uuid,text), public.admin_set_p2p_order_status(uuid,text) to authenticated;
