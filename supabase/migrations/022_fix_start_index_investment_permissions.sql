-- Fix public.start_index_investment execution path for authenticated users.
-- Root cause: the public SQL wrapper was SECURITY INVOKER and called a private-schema
-- function that authenticated did not have permission to execute.

revoke all on function public.start_index_investment(uuid,numeric,text) from public;
revoke all on function public.start_index_investment(uuid,numeric,text) from anon;

create or replace function public.start_index_investment(
  p_product_id uuid,
  p_amount numeric,
  p_idempotency_key text
)
returns uuid
language sql
security definer
set search_path=''
as $$
  select private.start_index_investment($1,$2,$3)
$$;

grant execute on function public.start_index_investment(uuid,numeric,text) to authenticated;
grant execute on function public.start_index_investment(uuid,numeric,text) to service_role;
