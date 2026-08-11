-- Account preferences, consented product analytics and auditable credit ledger.
alter table public.user_settings
  add column if not exists analytics_consent boolean not null default false,
  add column if not exists cookie_consent text not null default 'essential' check (cookie_consent in ('essential','analytics')),
  add column if not exists high_contrast boolean not null default false,
  add column if not exists font_scale numeric(3,2) not null default 1 check (font_scale between .85 and 1.35),
  add column if not exists marketing_email boolean not null default false,
  add column if not exists provider_mode text not null default 'managed' check (provider_mode in ('managed','byok'));

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  path text,
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists analytics_events_user_time_idx on public.analytics_events(user_id, occurred_at desc);
create index if not exists analytics_events_name_time_idx on public.analytics_events(name, occurred_at desc);
alter table public.analytics_events enable row level security;
drop policy if exists analytics_insert_self on public.analytics_events;
create policy analytics_insert_self on public.analytics_events for insert to authenticated
  with check ((select auth.uid()) = user_id and exists(select 1 from public.user_settings s where s.user_id=(select auth.uid()) and s.analytics_consent));
drop policy if exists analytics_select_self_or_admin on public.analytics_events;
create policy analytics_select_self_or_admin on public.analytics_events for select to authenticated
  using ((select auth.uid()) = user_id or public.has_permission((select auth.uid()), 'audit.read'));

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_micro_ils bigint not null,
  kind text not null check (kind in ('purchase','usage','grant','refund','expiry')),
  provider_ref text unique,
  description text,
  created_at timestamptz not null default now()
);
create index if not exists credit_ledger_user_time_idx on public.credit_ledger(user_id, created_at desc);
alter table public.credit_ledger enable row level security;
drop policy if exists credit_ledger_read on public.credit_ledger;
create policy credit_ledger_read on public.credit_ledger for select to authenticated
  using ((select auth.uid()) = user_id or public.has_permission((select auth.uid()), 'credits.read'));
revoke insert, update, delete on public.credit_ledger from anon, authenticated;
grant select on public.analytics_events, public.credit_ledger to authenticated;
grant insert on public.analytics_events to authenticated;

insert into public.permissions(id,description) values ('analytics.read','קריאת אנליטיקת מוצר') on conflict do nothing;
insert into public.role_permissions(role_id,permission_id) values ('system_owner','analytics.read'),('system_admin','analytics.read') on conflict do nothing;
