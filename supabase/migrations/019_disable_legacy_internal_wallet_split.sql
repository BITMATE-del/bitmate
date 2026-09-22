-- Unified wallet: internal Spot/Futures transfer is obsolete and must not split the user's balance.
create or replace function public.user_internal_transfer(p_from text,p_to text,p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  raise exception 'unified_wallet_no_transfer_required';
end;
$$;
