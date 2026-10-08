-- Read-only historical entry margin for the current user's closed futures positions.
-- Closed positions correctly release their live margin; reconstruct the original
-- margin from positive opening fills instead of displaying the cleared balance.
create or replace function public.futures_closed_position_margins()
returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_object_agg(z.position_id::text,z.entry_margin),'{}'::jsonb)
 from (
   select p.id position_id,
     round(coalesce(sum(case when f.position_delta>0 then abs(f.position_delta)*f.price else 0 end),0)
       / nullif(p.leverage,0),8) entry_margin
   from public.futures_positions p
   join public.futures_fills f on f.position_id=p.id and f.user_id=p.user_id
   where p.user_id=(select auth.uid()) and p.status in ('CLOSED','LIQUIDATED')
   group by p.id,p.leverage
 ) z
$$;
revoke all on function public.futures_closed_position_margins() from public,anon;
grant execute on function public.futures_closed_position_margins() to authenticated;
