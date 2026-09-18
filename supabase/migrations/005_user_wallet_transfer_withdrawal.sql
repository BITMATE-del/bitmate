-- User wallet snapshot, internal transfer and withdrawal request flow
create table if not exists public.internal_transfers(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 asset text not null default 'USDT', from_account text not null check(from_account in ('SPOT','FUTURES')),
 to_account text not null check(to_account in ('SPOT','FUTURES')), amount numeric(30,10) not null check(amount>0),
 status text not null default 'COMPLETED' check(status in ('COMPLETED','REVERSED','FAILED')),
 reference_id text not null unique, created_at timestamptz not null default now()
);
alter table public.internal_transfers enable row level security;
grant select on public.internal_transfers to authenticated;
drop policy if exists internal_transfers_self_read on public.internal_transfers;
create policy internal_transfers_self_read on public.internal_transfers for select to authenticated using(auth.uid()=user_id);

create or replace function public.user_wallet_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_spot jsonb; v_futures numeric:=0; v_withdrawals jsonb; v_transfers jsonb; v_networks jsonb;
begin
 if auth.uid() is null then raise exception 'auth_required'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('asset',asset,'available',available,'locked',locked) order by asset),'[]'::jsonb) into v_spot from public.demo_balances where user_id=auth.uid();
 select coalesce(balance,0) into v_futures from public.futures_accounts where user_id=auth.uid();
 select coalesce(jsonb_agg(to_jsonb(w) order by w.created_at desc),'[]'::jsonb) into v_withdrawals from (select id,asset,network,address,amount,fee,status,txid,note,created_at,reviewed_at from public.withdrawal_requests where user_id=auth.uid() order by created_at desc limit 50) w;
 select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc),'[]'::jsonb) into v_transfers from (select id,asset,from_account,to_account,amount,status,reference_id,created_at from public.internal_transfers where user_id=auth.uid() order by created_at desc limit 50) t;
 select coalesce(jsonb_agg(jsonb_build_object('asset',asset,'network',network,'display_name',display_name,'min_withdraw',min_withdraw,'withdraw_fee',withdraw_fee) order by asset,network),'[]'::jsonb) into v_networks from public.asset_networks where active and withdraw_enabled;
 return jsonb_build_object('spot',v_spot,'futures_usdt',v_futures,'withdrawals',v_withdrawals,'transfers',v_transfers,'withdraw_networks',v_networks);
end; $$;

create or replace function public.user_internal_transfer(p_from text,p_to text,p_amount numeric) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_from text:=upper(trim(p_from)); v_to text:=upper(trim(p_to)); v_spot numeric:=0; v_futures numeric:=0; v_ref text;
begin
 if auth.uid() is null then raise exception 'auth_required'; end if;
 if v_from=v_to or v_from not in ('SPOT','FUTURES') or v_to not in ('SPOT','FUTURES') then raise exception 'invalid_route'; end if;
 if p_amount<=0 then raise exception 'invalid_amount'; end if;
 insert into public.demo_balances(user_id,asset,available,locked) values(auth.uid(),'USDT',0,0) on conflict(user_id,asset) do nothing;
 insert into public.futures_accounts(user_id,balance) values(auth.uid(),0) on conflict(user_id) do nothing;
 select available into v_spot from public.demo_balances where user_id=auth.uid() and asset='USDT' for update;
 select balance into v_futures from public.futures_accounts where user_id=auth.uid() for update;
 if v_from='SPOT' then
  if v_spot<p_amount then raise exception 'insufficient_spot_balance'; end if;
  update public.demo_balances set available=available-p_amount,updated_at=now() where user_id=auth.uid() and asset='USDT';
  update public.futures_accounts set balance=balance+p_amount,updated_at=now() where user_id=auth.uid();
 else
  if v_futures<p_amount then raise exception 'insufficient_futures_balance'; end if;
  update public.futures_accounts set balance=balance-p_amount,updated_at=now() where user_id=auth.uid();
  update public.demo_balances set available=available+p_amount,updated_at=now() where user_id=auth.uid() and asset='USDT';
 end if;
 v_ref:='transfer-'||gen_random_uuid()::text;
 insert into public.internal_transfers(user_id,asset,from_account,to_account,amount,reference_id) values(auth.uid(),'USDT',v_from,v_to,p_amount,v_ref);
 insert into public.ledger_entries(user_id,mode,asset,amount,entry_type,idempotency_key) values(auth.uid(),'DEMO','USDT',case when v_from='SPOT' then -p_amount else p_amount end,'internal_transfer',v_ref||'-spot');
 insert into public.futures_ledger(user_id,entry_type,before_balance,amount,after_balance,reference_type,reference_id,idempotency_key,details)
 values(auth.uid(),'TRANSFER',v_futures,case when v_from='SPOT' then p_amount else -p_amount end,case when v_from='SPOT' then v_futures+p_amount else v_futures-p_amount end,'INTERNAL_TRANSFER',v_ref,v_ref||'-futures',jsonb_build_object('from',v_from,'to',v_to));
 return jsonb_build_object('reference_id',v_ref,'from',v_from,'to',v_to,'amount',p_amount);
end; $$;

create or replace function public.user_create_withdrawal_request(p_asset text,p_network text,p_address text,p_amount numeric) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_asset text:=upper(trim(p_asset)); v_network text:=upper(trim(p_network)); v_address text:=trim(p_address); v_enabled boolean:=false; v_min numeric:=0; v_fee numeric:=0; v_available numeric:=0; v_id uuid;
begin
 if auth.uid() is null then raise exception 'auth_required'; end if;
 select coalesce((value)::boolean,false) into v_enabled from public.system_settings where key='WITHDRAW_ENABLED';
 if not v_enabled then raise exception 'withdraw_disabled'; end if;
 if length(v_address)<8 then raise exception 'invalid_address'; end if;
 if p_amount<=0 then raise exception 'invalid_amount'; end if;
 select min_withdraw,withdraw_fee into v_min,v_fee from public.asset_networks where asset=v_asset and network=v_network and active and withdraw_enabled;
 if not found then raise exception 'network_not_available'; end if;
 if p_amount<v_min then raise exception 'below_minimum'; end if;
 insert into public.demo_balances(user_id,asset,available,locked) values(auth.uid(),v_asset,0,0) on conflict(user_id,asset) do nothing;
 select available into v_available from public.demo_balances where user_id=auth.uid() and asset=v_asset for update;
 if v_available < p_amount+v_fee then raise exception 'insufficient_balance'; end if;
 update public.demo_balances set available=available-(p_amount+v_fee),locked=locked+(p_amount+v_fee),updated_at=now() where user_id=auth.uid() and asset=v_asset;
 insert into public.withdrawal_requests(user_id,asset,network,address,amount,fee,status) values(auth.uid(),v_asset,v_network,v_address,p_amount,v_fee,'PENDING') returning id into v_id;
 insert into public.ledger_entries(user_id,mode,asset,amount,entry_type,idempotency_key) values(auth.uid(),'DEMO',v_asset,-(p_amount+v_fee),'withdrawal_hold','withdraw-hold-'||v_id::text);
 return jsonb_build_object('id',v_id,'asset',v_asset,'network',v_network,'amount',p_amount,'fee',v_fee,'status','PENDING');
end; $$;

create or replace function public.admin_update_withdrawal_status(p_id uuid,p_status text,p_txid text default null,p_note text default null) returns void language plpgsql security definer set search_path='' as $$
declare v_before jsonb; v_row public.withdrawal_requests%rowtype; v_total numeric;
begin
 if not public.is_admin_user() then raise exception 'admin_required'; end if;
 if upper(p_status) not in ('PENDING','REVIEW','APPROVED','REJECTED','SENT','FAILED') then raise exception 'invalid_status'; end if;
 select * into v_row from public.withdrawal_requests where id=p_id for update;
 if not found then raise exception 'not_found'; end if;
 v_before:=to_jsonb(v_row); v_total:=v_row.amount+v_row.fee;
 if v_row.status in ('SENT','REJECTED','FAILED') and upper(p_status)<>v_row.status then raise exception 'terminal_status'; end if;
 if upper(p_status) in ('REJECTED','FAILED') and v_row.status not in ('REJECTED','FAILED','SENT') then
  update public.demo_balances set locked=greatest(locked-v_total,0),available=available+v_total,updated_at=now() where user_id=v_row.user_id and asset=v_row.asset;
  insert into public.ledger_entries(user_id,mode,asset,amount,entry_type,idempotency_key) values(v_row.user_id,'DEMO',v_row.asset,v_total,'withdrawal_release','withdraw-release-'||p_id::text);
 elsif upper(p_status)='SENT' and v_row.status<>'SENT' then
  if coalesce(nullif(trim(p_txid),''),'')='' then raise exception 'txid_required'; end if;
  update public.demo_balances set locked=greatest(locked-v_total,0),updated_at=now() where user_id=v_row.user_id and asset=v_row.asset;
  insert into public.ledger_entries(user_id,mode,asset,amount,entry_type,idempotency_key) values(v_row.user_id,'DEMO',v_row.asset,0,'withdrawal_sent','withdraw-sent-'||p_id::text);
 end if;
 update public.withdrawal_requests set status=upper(p_status),txid=coalesce(nullif(trim(p_txid),''),txid),note=coalesce(p_note,note),reviewed_at=case when upper(p_status) in ('APPROVED','REJECTED','SENT','FAILED') then now() else reviewed_at end,updated_at=now() where id=p_id;
 insert into public.admin_logs(admin_user_id,action,target_type,target_id,before_value,after_value) select auth.uid(),'WITHDRAWAL_STATUS_UPDATE','withdrawal',p_id::text,v_before,to_jsonb(w) from public.withdrawal_requests w where w.id=p_id;
end; $$;

revoke all on function public.user_wallet_snapshot(), public.user_internal_transfer(text,text,numeric), public.user_create_withdrawal_request(text,text,text,numeric) from public,anon;
grant execute on function public.user_wallet_snapshot(), public.user_internal_transfer(text,text,numeric), public.user_create_withdrawal_request(text,text,text,numeric) to authenticated;
