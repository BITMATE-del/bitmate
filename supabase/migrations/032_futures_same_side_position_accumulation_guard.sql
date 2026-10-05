create or replace function futures_private.guard_position_direction()
returns trigger
language plpgsql
set search_path=''
as $$
declare
  p public.futures_positions;
  incoming_side text;
begin
  if new.reduce_only then return new; end if;

  incoming_side:=case when new.side='BUY' then 'LONG' else 'SHORT' end;

  select *
  into p
  from public.futures_positions
  where user_id=new.user_id
    and symbol=new.symbol
    and position_side=new.position_side
    and status='OPEN'
  limit 1;

  if found and p.side<>incoming_side then
    raise exception '반대 방향 포지션이 열려 있습니다. 기존 포지션을 먼저 청산하거나 Hedge 모드를 사용하세요.';
  end if;

  return new;
end;
$$;

drop trigger if exists futures_guard_position_direction on public.futures_orders;
create trigger futures_guard_position_direction
before insert on public.futures_orders
for each row
execute function futures_private.guard_position_direction();
