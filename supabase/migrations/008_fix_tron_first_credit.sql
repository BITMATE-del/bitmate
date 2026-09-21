-- Ensure first confirmed TRON event credits balance exactly once
create or replace function public.service_credit_tron_deposit(
 p_address text,
 p_asset text,
 p_txid text,
 p_amount numeric,
 p_confirmations int,
 p_event_index int default 0
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
 v_role text := coalesce(current_setting('request.jwt.claim.role',true),'');
 v_user uuid;
 v_required int := 20;
 v_min numeric := 0;
 v_id uuid;
 v_status text;
 v_asset text := upper(trim(p_asset));
 v_address text := trim(p_address);
 v_txid text := trim(p_txid);
 v_credit_key text;
begin
 if v_role <> 'service_role' then raise exception 'service_role_required'; end if;
 if v_asset not in ('USDT','TRX') then raise exception 'unsupported_asset'; end if;
 if p_amount <= 0 then raise exception 'invalid_amount'; end if;
 if length(v_txid) < 16 then raise exception 'invalid_txid'; end if;

 select d.user_id into v_user
 from public.deposit_addresses d
 where d.address=v_address
   and d.asset=v_asset
   and d.network='TRC20'
   and d.active
 order by d.created_at desc
 limit 1;
 if v_user is null then raise exception 'deposit_address_not_found'; end if;

 select n.confirmations,n.min_deposit into v_required,v_min
 from public.asset_networks n
 where n.asset=v_asset and n.network='TRC20' and n.active and n.deposit_enabled;
 if not found then raise exception 'network_not_available'; end if;
 if p_amount < v_min then raise exception 'below_minimum'; end if;

 insert into public.deposit_records(
   user_id,asset,network,address,txid,amount,confirmations,status,event_index
 )
 values(
   v_user,v_asset,'TRC20',v_address,v_txid,p_amount,greatest(p_confirmations,0),
   'CONFIRMING',greatest(p_event_index,0)
 )
 on conflict(network,txid,asset,event_index)
 where txid is not null
 do update set
   confirmations=greatest(public.deposit_records.confirmations,excluded.confirmations),
   amount=excluded.amount,
   address=excluded.address
 returning id,status into v_id,v_status;

 select status into v_status
 from public.deposit_records
 where id=v_id
 for update;

 v_credit_key:='deposit-trc20-'||v_txid||'-'||greatest(p_event_index,0)::text;

 if v_status <> 'CREDITED' and greatest(p_confirmations,0) >= v_required then
   if not exists(select 1 from public.ledger_entries where idempotency_key=v_credit_key) then
     insert into public.demo_balances(user_id,asset,available,locked)
     values(v_user,v_asset,p_amount,0)
     on conflict(user_id,asset)
     do update set available=public.demo_balances.available+excluded.available,updated_at=now();

     insert into public.ledger_entries(user_id,mode,asset,amount,entry_type,idempotency_key)
     values(v_user,'DEMO',v_asset,p_amount,'deposit_credit',v_credit_key);
   end if;

   update public.deposit_records
   set confirmations=greatest(confirmations,p_confirmations),
       status='CREDITED',
       credited_at=coalesce(credited_at,now())
   where id=v_id;
   v_status:='CREDITED';
 end if;

 return jsonb_build_object(
   'deposit_id',v_id,'user_id',v_user,'asset',v_asset,'network','TRC20',
   'amount',p_amount,'confirmations',greatest(p_confirmations,0),
   'required_confirmations',v_required,'status',v_status
 );
end;
$$;
revoke all on function public.service_credit_tron_deposit(text,text,text,numeric,int,int) from public,anon,authenticated;
grant execute on function public.service_credit_tron_deposit(text,text,text,numeric,int,int) to service_role;
