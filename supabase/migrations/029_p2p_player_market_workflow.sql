-- P2P player/seller cards, order workflow, and private order chat
create table if not exists public.p2p_players(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references auth.users(id) on delete cascade,
 nickname text not null,
 status text not null default 'PENDING' check(status in ('PENDING','APPROVED','REJECTED','SUSPENDED')),
 fee_rate numeric(6,3) not null default 0 check(fee_rate>=0 and fee_rate<=10),
 primary_asset text not null default 'USDT',
 payment_methods text[] not null default '{}',
 min_order numeric(30,2) not null default 0,
 max_order numeric(30,2) not null default 0,
 bio text not null default '',
 completed_orders integer not null default 0,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.p2p_players enable row level security;
grant select on public.p2p_players to anon,authenticated;
drop policy if exists p2p_players_public_read on public.p2p_players;
create policy p2p_players_public_read on public.p2p_players for select to anon,authenticated
using(status='APPROVED' or auth.uid()=user_id);

alter table public.p2p_ads
 add column if not exists player_id uuid references public.p2p_players(id) on delete set null,
 add column if not exists fee_rate numeric(6,3) not null default 0,
 add column if not exists headline text not null default '',
 add column if not exists terms text not null default '';

alter table public.p2p_orders drop constraint if exists p2p_orders_status_check;
alter table public.p2p_orders add constraint p2p_orders_status_check
check(status in ('REQUESTED','ACCEPTED','PAID','RELEASED','REJECTED','CANCELLED','DISPUTED','REFUNDED'));
alter table public.p2p_orders alter column status set default 'REQUESTED';

create table if not exists public.p2p_messages(
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.p2p_orders(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 message text not null check(length(btrim(message)) between 1 and 1000),
 created_at timestamptz not null default now()
);
alter table public.p2p_messages enable row level security;
grant select on public.p2p_messages to authenticated;
drop policy if exists p2p_messages_party_read on public.p2p_messages;
create policy p2p_messages_party_read on public.p2p_messages for select to authenticated
using(exists(select 1 from public.p2p_orders o where o.id=order_id and auth.uid() in (o.buyer_id,o.seller_id)));

create or replace function public.p2p_apply_player(p_nickname text,p_fee_rate numeric,p_primary_asset text,p_payment_methods text[],p_min_order numeric,p_max_order numeric,p_bio text default '')
returns public.p2p_players language plpgsql security definer set search_path='' as $$
declare v public.p2p_players;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 if nullif(btrim(p_nickname),'') is null then raise exception 'nickname_required'; end if;
 if coalesce(p_fee_rate,0)<0 or coalesce(p_fee_rate,0)>10 then raise exception 'invalid_fee_rate'; end if;
 if coalesce(p_min_order,0)<0 or coalesce(p_max_order,0)<=0 or p_max_order<p_min_order then raise exception 'invalid_order_limit'; end if;
 insert into public.p2p_players(user_id,nickname,status,fee_rate,primary_asset,payment_methods,min_order,max_order,bio)
 values(auth.uid(),btrim(p_nickname),'PENDING',coalesce(p_fee_rate,0),upper(coalesce(nullif(btrim(p_primary_asset),''),'USDT')),coalesce(p_payment_methods,'{}'),coalesce(p_min_order,0),coalesce(p_max_order,0),coalesce(p_bio,''))
 on conflict(user_id) do update set nickname=excluded.nickname,status=case when public.p2p_players.status='APPROVED' then 'APPROVED' else 'PENDING' end,fee_rate=excluded.fee_rate,primary_asset=excluded.primary_asset,payment_methods=excluded.payment_methods,min_order=excluded.min_order,max_order=excluded.max_order,bio=excluded.bio,updated_at=now()
 returning * into v;
 return v;
end $$;

create or replace function public.p2p_create_ad(p_price numeric,p_available_amount numeric,p_min_order numeric,p_max_order numeric,p_payment_methods text[],p_fee_rate numeric default 0,p_headline text default '',p_terms text default '')
returns public.p2p_ads language plpgsql security definer set search_path='' as $$
declare v_player public.p2p_players;v public.p2p_ads;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select * into v_player from public.p2p_players where user_id=auth.uid() and status='APPROVED';
 if not found then raise exception 'approved_player_required'; end if;
 if p_price<=0 or p_available_amount<=0 then raise exception 'invalid_amount'; end if;
 if p_min_order<0 or p_max_order<=0 or p_max_order<p_min_order then raise exception 'invalid_order_limit'; end if;
 insert into public.p2p_ads(user_id,player_id,side,asset,fiat,price,available_amount,min_order,max_order,payment_methods,status,fee_rate,headline,terms)
 values(auth.uid(),v_player.id,'SELL',v_player.primary_asset,'KRW',p_price,p_available_amount,p_min_order,p_max_order,coalesce(p_payment_methods,v_player.payment_methods),'ACTIVE',coalesce(p_fee_rate,v_player.fee_rate),coalesce(p_headline,''),coalesce(p_terms,''))
 returning * into v;
 return v;
end $$;

create or replace function public.p2p_set_my_ad_status(p_id uuid,p_status text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 if upper(p_status) not in ('ACTIVE','PAUSED','CLOSED') then raise exception 'invalid_status'; end if;
 update public.p2p_ads set status=upper(p_status),updated_at=now() where id=p_id and user_id=auth.uid() and status<>'SUSPENDED';
 if not found then raise exception 'ad_not_found'; end if;
end $$;

create or replace function public.p2p_create_order(p_ad_id uuid,p_fiat_amount numeric,p_payment_method text)
returns public.p2p_orders language plpgsql security definer set search_path='' as $$
declare a public.p2p_ads;v public.p2p_orders;v_asset numeric;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select * into a from public.p2p_ads where id=p_ad_id and status='ACTIVE' for update;
 if not found then raise exception 'ad_not_available'; end if;
 if a.user_id=auth.uid() then raise exception 'self_trade_not_allowed'; end if;
 if p_fiat_amount<a.min_order or p_fiat_amount>a.max_order then raise exception 'outside_order_limit'; end if;
 if not (coalesce(p_payment_method,'')=any(a.payment_methods)) then raise exception 'payment_method_not_allowed'; end if;
 v_asset:=round((p_fiat_amount/a.price)::numeric,10);
 if v_asset<=0 or v_asset>a.available_amount then raise exception 'insufficient_ad_amount'; end if;
 insert into public.p2p_orders(ad_id,buyer_id,seller_id,asset,fiat,price,asset_amount,fiat_amount,payment_method,status)
 values(a.id,auth.uid(),a.user_id,a.asset,a.fiat,a.price,v_asset,p_fiat_amount,p_payment_method,'REQUESTED') returning * into v;
 return v;
end $$;

create or replace function public.p2p_order_action(p_order_id uuid,p_action text)
returns public.p2p_orders language plpgsql security definer set search_path='' as $$
declare o public.p2p_orders;a text:=upper(coalesce(p_action,''));
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select * into o from public.p2p_orders where id=p_order_id for update;
 if not found then raise exception 'order_not_found'; end if;
 if auth.uid() not in (o.buyer_id,o.seller_id) then raise exception 'not_order_party'; end if;
 if a='ACCEPT' then
  if auth.uid()<>o.seller_id or o.status<>'REQUESTED' then raise exception 'invalid_transition'; end if;
  update public.p2p_orders set status='ACCEPTED',updated_at=now() where id=o.id returning * into o;
 elsif a='REJECT' then
  if auth.uid()<>o.seller_id or o.status<>'REQUESTED' then raise exception 'invalid_transition'; end if;
  update public.p2p_orders set status='REJECTED',completed_at=now(),updated_at=now() where id=o.id returning * into o;
 elsif a='MARK_PAID' then
  if auth.uid()<>o.buyer_id or o.status<>'ACCEPTED' then raise exception 'invalid_transition'; end if;
  update public.p2p_orders set status='PAID',paid_at=now(),updated_at=now() where id=o.id returning * into o;
 elsif a='RELEASE' then
  if auth.uid()<>o.seller_id or o.status<>'PAID' then raise exception 'invalid_transition'; end if;
  update public.p2p_orders set status='RELEASED',completed_at=now(),updated_at=now() where id=o.id returning * into o;
  update public.p2p_players set completed_orders=completed_orders+1,updated_at=now() where user_id=o.seller_id;
 elsif a='CANCEL' then
  if o.status not in ('REQUESTED','ACCEPTED') then raise exception 'invalid_transition'; end if;
  update public.p2p_orders set status='CANCELLED',completed_at=now(),updated_at=now() where id=o.id returning * into o;
 elsif a='DISPUTE' then
  if o.status not in ('ACCEPTED','PAID') then raise exception 'invalid_transition'; end if;
  update public.p2p_orders set status='DISPUTED',updated_at=now() where id=o.id returning * into o;
 else raise exception 'invalid_action';
 end if;
 return o;
end $$;

create or replace function public.p2p_send_message(p_order_id uuid,p_message text)
returns public.p2p_messages language plpgsql security definer set search_path='' as $$
declare o public.p2p_orders;v public.p2p_messages;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select * into o from public.p2p_orders where id=p_order_id;
 if not found or auth.uid() not in (o.buyer_id,o.seller_id) then raise exception 'not_order_party'; end if;
 if nullif(btrim(p_message),'') is null or length(btrim(p_message))>1000 then raise exception 'invalid_message'; end if;
 insert into public.p2p_messages(order_id,sender_id,message) values(p_order_id,auth.uid(),btrim(p_message)) returning * into v;
 return v;
end $$;

create or replace function public.p2p_order_messages(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.p2p_orders;v jsonb;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select * into o from public.p2p_orders where id=p_order_id;
 if not found or auth.uid() not in (o.buyer_id,o.seller_id) then raise exception 'not_order_party'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'sender_id',m.sender_id,'message',m.message,'created_at',m.created_at) order by m.created_at),'[]'::jsonb) into v from public.p2p_messages m where m.order_id=p_order_id;
 return v;
end $$;

create or replace function public.p2p_market_snapshot()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_ads jsonb;v_player jsonb;v_orders jsonb;v_uid uuid:=auth.uid();
begin
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_ads from (
  select a.id,a.user_id,a.side,a.asset,a.fiat,a.price,a.available_amount,a.min_order,a.max_order,a.payment_methods,a.status,a.fee_rate,a.headline,a.terms,a.created_at,p.nickname,p.bio,p.completed_orders
  from public.p2p_ads a left join public.p2p_players p on p.id=a.player_id
  where a.status='ACTIVE' and (p.status='APPROVED' or p.id is null)
 ) x;
 if v_uid is null then v_player:='null'::jsonb;v_orders:='[]'::jsonb;
 else
  select to_jsonb(p) into v_player from public.p2p_players p where p.user_id=v_uid;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_orders from (
   select o.*,bp.nickname buyer_nickname,sp.nickname seller_nickname from public.p2p_orders o
   left join public.p2p_players bp on bp.user_id=o.buyer_id left join public.p2p_players sp on sp.user_id=o.seller_id
   where v_uid in (o.buyer_id,o.seller_id)
  ) x;
 end if;
 return jsonb_build_object('ads',v_ads,'my_player',v_player,'my_orders',v_orders);
end $$;

create or replace function public.admin_set_p2p_player_status(p_id uuid,p_status text)
returns void language plpgsql security definer set search_path='' as $$
declare v_before jsonb;
begin
 if not public.is_admin_user() then raise exception 'admin_required'; end if;
 if upper(p_status) not in ('PENDING','APPROVED','REJECTED','SUSPENDED') then raise exception 'invalid_status'; end if;
 select to_jsonb(p) into v_before from public.p2p_players p where id=p_id;
 update public.p2p_players set status=upper(p_status),updated_at=now() where id=p_id;
 if not found then raise exception 'player_not_found'; end if;
 insert into public.admin_logs(admin_user_id,action,target_type,target_id,before_value,after_value)
 select auth.uid(),'P2P_PLAYER_STATUS_UPDATE','p2p_player',p_id::text,v_before,to_jsonb(p) from public.p2p_players p where p.id=p_id;
end $$;

create or replace function public.admin_p2p_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_players jsonb;v_ads jsonb;v_orders jsonb;v_stats jsonb;
begin
 if not public.is_admin_user() then raise exception 'admin_required'; end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_players from (select p.*,u.email from public.p2p_players p join auth.users u on u.id=p.user_id order by p.created_at desc limit 200) x;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_ads from (select a.*,u.email from public.p2p_ads a join auth.users u on u.id=a.user_id order by a.created_at desc limit 200) x;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_orders from (select o.*,bu.email buyer_email,su.email seller_email from public.p2p_orders o join auth.users bu on bu.id=o.buyer_id join auth.users su on su.id=o.seller_id order by o.created_at desc limit 200) x;
 select jsonb_build_object('pending_players',(select count(*) from public.p2p_players where status='PENDING'),'active_players',(select count(*) from public.p2p_players where status='APPROVED'),'active_ads',(select count(*) from public.p2p_ads where status='ACTIVE'),'open_orders',(select count(*) from public.p2p_orders where status in ('REQUESTED','ACCEPTED','PAID','DISPUTED')),'disputes',(select count(*) from public.p2p_orders where status='DISPUTED')) into v_stats;
 return jsonb_build_object('players',v_players,'ads',v_ads,'orders',v_orders,'stats',v_stats);
end $$;

revoke all on function public.p2p_apply_player(text,numeric,text,text[],numeric,numeric,text),public.p2p_create_ad(numeric,numeric,numeric,numeric,text[],numeric,text,text),public.p2p_set_my_ad_status(uuid,text),public.p2p_create_order(uuid,numeric,text),public.p2p_order_action(uuid,text),public.p2p_send_message(uuid,text),public.p2p_order_messages(uuid),public.p2p_market_snapshot(),public.admin_set_p2p_player_status(uuid,text) from public,anon;
grant execute on function public.p2p_market_snapshot() to anon,authenticated;
grant execute on function public.p2p_apply_player(text,numeric,text,text[],numeric,numeric,text),public.p2p_create_ad(numeric,numeric,numeric,numeric,text[],numeric,text,text),public.p2p_set_my_ad_status(uuid,text),public.p2p_create_order(uuid,numeric,text),public.p2p_order_action(uuid,text),public.p2p_send_message(uuid,text),public.p2p_order_messages(uuid) to authenticated;
grant execute on function public.admin_set_p2p_player_status(uuid,text) to authenticated;
