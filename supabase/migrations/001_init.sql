create extension if not exists pgcrypto;

create type public.account_mode as enum ('DEMO','REAL');
create type public.order_side as enum ('BUY','SELL');
create type public.order_status as enum ('PENDING','FILLED','CANCELLED','REJECTED');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  vip_level text not null default 'BASIC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.demo_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset text not null,
  available numeric(30,10) not null default 0 check (available >= 0),
  locked numeric(30,10) not null default 0 check (locked >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,asset)
);

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode public.account_mode not null,
  asset text not null,
  amount numeric(30,10) not null,
  entry_type text not null check (entry_type in ('deposit','withdrawal','trade','fee','reward','adjustment')),
  reference_id uuid,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique(user_id,idempotency_key)
);

create table public.demo_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  side public.order_side not null,
  quote_amount numeric(30,10) not null check (quote_amount > 0),
  execution_price numeric(30,10),
  base_quantity numeric(30,10),
  status public.order_status not null default 'PENDING',
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,idempotency_key)
);

create table public.ai_strategies (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text not null,
  risk_level int not null check (risk_level between 1 and 5),
  allowed_assets text[] not null,
  real_enabled boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  strategy_id uuid not null references public.ai_strategies(id),
  mode public.account_mode not null,
  allocated_amount numeric(30,10) not null check (allocated_amount > 0),
  status text not null check(status in ('RUNNING','STOPPED','PAUSED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_logs (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.ai_subscriptions(id) on delete cascade,
  event_type text not null,
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid,
  action text not null,
  target_type text,
  target_id text,
  before_value jsonb,
  after_value jsonb,
  ip inet,
  created_at timestamptz not null default now()
);

create index demo_balances_user_id_idx on public.demo_balances(user_id);
create index ledger_entries_user_id_created_at_idx on public.ledger_entries(user_id, created_at desc);
create index demo_orders_user_id_created_at_idx on public.demo_orders(user_id, created_at desc);
create index ai_subscriptions_user_id_idx on public.ai_subscriptions(user_id);
create index ai_logs_subscription_id_created_at_idx on public.ai_logs(subscription_id, created_at desc);

insert into public.ai_strategies(code,name,description,risk_level,allowed_assets)
values
('SAFE','SAFE AI','낮은 포지션 비율과 손실 제한을 우선하는 안정형 전략',2,array['BTC','ETH']),
('BALANCED','BALANCED AI','추세·DCA·모멘텀을 조합한 균형형 전략',3,array['BTC','ETH','XRP','SOL']),
('ACTIVE','ACTIVE AI','높은 거래빈도와 엄격한 포지션 제한을 사용하는 적극형 전략',4,array['BTC','ETH','XRP','SOL','DOGE']);

insert into public.system_settings(key,value) values
('SPOT_REAL_ENABLED','false'::jsonb),
('AI_REAL_ENABLED','false'::jsonb),
('QUICK_TRADE_REAL_ENABLED','false'::jsonb),
('WITHDRAW_ENABLED','false'::jsonb);

alter table public.profiles enable row level security;
alter table public.demo_balances enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.demo_orders enable row level security;
alter table public.ai_strategies enable row level security;
alter table public.ai_subscriptions enable row level security;
alter table public.ai_logs enable row level security;
alter table public.system_settings enable row level security;
alter table public.admin_logs enable row level security;

revoke all on public.profiles, public.demo_balances, public.ledger_entries, public.demo_orders, public.ai_strategies, public.ai_subscriptions, public.ai_logs, public.system_settings, public.admin_logs from anon, authenticated;
grant select on public.profiles, public.demo_balances, public.ledger_entries, public.demo_orders, public.ai_strategies, public.ai_subscriptions, public.ai_logs to authenticated;
grant select on public.ai_strategies to anon;

create policy "profiles_self_read" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "demo_balances_self_read" on public.demo_balances for select to authenticated using ((select auth.uid()) = user_id);
create policy "ledger_self_read" on public.ledger_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy "demo_orders_self_read" on public.demo_orders for select to authenticated using ((select auth.uid()) = user_id);
create policy "ai_strategies_public_read" on public.ai_strategies for select to anon, authenticated using (active = true);
create policy "ai_subscriptions_self_read" on public.ai_subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy "ai_logs_self_read" on public.ai_logs for select to authenticated using (exists (select 1 from public.ai_subscriptions s where s.id = ai_logs.subscription_id and s.user_id = (select auth.uid())));
create policy "system_settings_no_client_access" on public.system_settings for all to anon, authenticated using (false) with check (false);
create policy "admin_logs_no_client_access" on public.admin_logs for all to anon, authenticated using (false) with check (false);

create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id,display_name)
  values(new.id,coalesce(new.raw_user_meta_data->>'name',''));
  insert into public.demo_balances(user_id,asset,available)
  values(new.id,'KRW',10000000);
  insert into public.ledger_entries(user_id,mode,asset,amount,entry_type,idempotency_key)
  values(new.id,'DEMO','KRW',10000000,'reward','signup-demo-grant');
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
