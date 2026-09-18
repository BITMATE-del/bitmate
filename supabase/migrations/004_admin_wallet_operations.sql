-- Admin wallet operations and asset network configuration
create table if not exists public.asset_networks(
 id uuid primary key default gen_random_uuid(), asset text not null, network text not null, display_name text not null,
 confirmations int not null default 1 check(confirmations>=0), deposit_enabled boolean not null default true,
 withdraw_enabled boolean not null default false, min_deposit numeric(30,10) not null default 0,
 min_withdraw numeric(30,10) not null default 0, withdraw_fee numeric(30,10) not null default 0,
 active boolean not null default true, updated_at timestamptz not null default now(), unique(asset,network)
);
alter table public.asset_networks enable row level security;
grant select on public.asset_networks to anon, authenticated;
drop policy if exists asset_networks_public_read on public.asset_networks;
create policy asset_networks_public_read on public.asset_networks for select to anon,authenticated using(active=true);

insert into public.asset_networks(asset,network,display_name,confirmations,deposit_enabled,withdraw_enabled,min_deposit,min_withdraw,withdraw_fee,active) values
('BTC','BTC','Bitcoin',2,true,false,0,0,0,true),('ETH','ERC20','Ethereum (ERC20)',12,true,false,0,0,0,true),
('USDT','TRC20','TRON (TRC20)',20,true,false,0,0,0,true),('USDT','ERC20','Ethereum (ERC20)',12,true,false,0,0,0,true),
('USDT','BEP20','BNB Smart Chain (BEP20)',15,true,false,0,0,0,true),('TRX','TRC20','TRON (TRC20)',20,true,false,0,0,0,true),
('SOL','SOL','Solana',32,true,false,0,0,0,true) on conflict(asset,network) do nothing;

create table if not exists public.deposit_records(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 asset text not null, network text not null, address text, txid text, amount numeric(30,10) not null default 0,
 confirmations int not null default 0, status text not null default 'DETECTED' check(status in ('DETECTED','CONFIRMING','CREDITED','REJECTED')),
 created_at timestamptz not null default now(), credited_at timestamptz
);
alter table public.deposit_records enable row level security;
grant select on public.deposit_records to authenticated;
drop policy if exists deposit_records_self_read on public.deposit_records;
create policy deposit_records_self_read on public.deposit_records for select to authenticated using(auth.uid()=user_id);

create table if not exists public.withdrawal_requests(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 asset text not null, network text not null, address text not null, amount numeric(30,10) not null check(amount>0),
 fee numeric(30,10) not null default 0, status text not null default 'PENDING' check(status in ('PENDING','REVIEW','APPROVED','REJECTED','SENT','FAILED')),
 txid text, note text, created_at timestamptz not null default now(), reviewed_at timestamptz, updated_at timestamptz not null default now()
);
alter table public.withdrawal_requests enable row level security;
grant select on public.withdrawal_requests to authenticated;
drop policy if exists withdrawal_requests_self_read on public.withdrawal_requests;
create policy withdrawal_requests_self_read on public.withdrawal_requests for select to authenticated using(auth.uid()=user_id);

create or replace function public.admin_wallet_ops_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_networks jsonb; v_deposits jsonb; v_withdrawals jsonb; v_stats jsonb;
begin
 if not public.is_admin_user() then raise exception 'admin_required'; end if;
 select coalesce(jsonb_agg(to_jsonb(n) order by n.asset,n.network),'[]'::jsonb) into v_networks from public.asset_networks n;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_deposits from (select d.*,u.email from public.deposit_records d join auth.users u on u.id=d.user_id order by d.created_at desc limit 200) x;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_withdrawals from (select w.*,u.email from public.withdrawal_requests w join auth.users u on u.id=w.user_id order by w.created_at desc limit 200) x;
 select jsonb_build_object('networks',(select count(*) from public.asset_networks where active),'deposit_enabled',(select count(*) from public.asset_networks where active and deposit_enabled),'withdraw_enabled',(select count(*) from public.asset_networks where active and withdraw_enabled),'withdraw_pending',(select count(*) from public.withdrawal_requests where status in ('PENDING','REVIEW'))) into v_stats;
 return jsonb_build_object('networks',v_networks,'deposits',v_deposits,'withdrawals',v_withdrawals,'stats',v_stats);
end; $$;

create or replace function public.admin_update_asset_network(p_id uuid,p_deposit_enabled boolean,p_withdraw_enabled boolean,p_confirmations int,p_min_deposit numeric,p_min_withdraw numeric,p_withdraw_fee numeric,p_active boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_before jsonb;
begin
 if not public.is_admin_user() then raise exception 'admin_required'; end if;
 select to_jsonb(n) into v_before from public.asset_networks n where id=p_id;
 update public.asset_networks set deposit_enabled=p_deposit_enabled,withdraw_enabled=p_withdraw_enabled,confirmations=greatest(p_confirmations,0),min_deposit=greatest(p_min_deposit,0),min_withdraw=greatest(p_min_withdraw,0),withdraw_fee=greatest(p_withdraw_fee,0),active=p_active,updated_at=now() where id=p_id;
 insert into public.admin_logs(admin_user_id,action,target_type,target_id,before_value,after_value) select auth.uid(),'ASSET_NETWORK_UPDATE','asset_network',p_id::text,v_before,to_jsonb(n) from public.asset_networks n where n.id=p_id;
end; $$;

create or replace function public.admin_update_withdrawal_status(p_id uuid,p_status text,p_txid text default null,p_note text default null)
returns void language plpgsql security definer set search_path='' as $$
declare v_before jsonb;
begin
 if not public.is_admin_user() then raise exception 'admin_required'; end if;
 if upper(p_status) not in ('PENDING','REVIEW','APPROVED','REJECTED','SENT','FAILED') then raise exception 'invalid_status'; end if;
 select to_jsonb(w) into v_before from public.withdrawal_requests w where id=p_id;
 update public.withdrawal_requests set status=upper(p_status),txid=coalesce(nullif(trim(p_txid),''),txid),note=coalesce(p_note,note),reviewed_at=case when upper(p_status) in ('APPROVED','REJECTED','SENT','FAILED') then now() else reviewed_at end,updated_at=now() where id=p_id;
 insert into public.admin_logs(admin_user_id,action,target_type,target_id,before_value,after_value) select auth.uid(),'WITHDRAWAL_STATUS_UPDATE','withdrawal',p_id::text,v_before,to_jsonb(w) from public.withdrawal_requests w where w.id=p_id;
end; $$;

revoke all on function public.admin_wallet_ops_snapshot(), public.admin_update_asset_network(uuid,boolean,boolean,int,numeric,numeric,numeric,boolean), public.admin_update_withdrawal_status(uuid,text,text,text) from public,anon;
grant execute on function public.admin_wallet_ops_snapshot(), public.admin_update_asset_network(uuid,boolean,boolean,int,numeric,numeric,numeric,boolean), public.admin_update_withdrawal_status(uuid,text,text,text) to authenticated;
