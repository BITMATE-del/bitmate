-- Fix ON CONFLICT target for unified futures wallet ledger writes.
create or replace function futures_private.ledger(
  u uuid,
  kind text,
  delta numeric,
  ref_type text,
  ref_id text,
  key text,
  extra jsonb default '{}'::jsonb
)
returns void
language plpgsql
set search_path=''
as $$
declare
  a public.futures_accounts;
  d numeric:=round(delta,18);
begin
  a:=futures_private.lock_account(u);
  if exists(select 1 from public.futures_ledger where user_id=u and idempotency_key=key) then return; end if;

  insert into public.futures_ledger(user_id,entry_type,before_balance,amount,after_balance,reference_type,reference_id,idempotency_key,details)
  values(u,kind,a.balance,d,a.balance+d,ref_type,ref_id,key,extra);

  update public.futures_accounts
  set balance=balance+d,
      updated_at=clock_timestamp(),
      realized_pnl=realized_pnl+case when kind='REALIZED_PNL' then d else 0 end,
      trading_fees=trading_fees-case when kind in ('TRADING_FEE','LIQUIDATION_FEE') then d else 0 end,
      funding=funding+case when kind='FUNDING_FEE' then d else 0 end
  where user_id=u;

  if d<>0 and kind not in ('DEPOSIT','WITHDRAWAL') then
    update public.demo_balances
    set available=greatest(0,available+d),updated_at=clock_timestamp()
    where user_id=u and asset='USDT';

    insert into public.ledger_entries(user_id,mode,asset,amount,entry_type,idempotency_key)
    values(
      u,'DEMO','USDT',d,
      case
        when kind in ('TRADING_FEE','LIQUIDATION_FEE') then 'fee'
        when kind='REALIZED_PNL' then 'trade'
        when kind='FUNDING_FEE' then 'adjustment'
        else 'adjustment'
      end,
      'futures-'||key
    )
    on conflict(user_id,idempotency_key) do nothing;
  end if;
end;
$$;
