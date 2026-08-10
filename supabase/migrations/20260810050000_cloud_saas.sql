-- Hypescript cloud foundation: private projects/assets, render jobs and quota-aware plans.
-- Additive and idempotent. All user data is protected by owner-scoped RLS.
-- This migration can run without the optional Package A system_settings table.

create extension if not exists pgcrypto;

create table if not exists public.cloud_plans (
  id text primary key,
  version integer not null default 1,
  name_he text not null,
  price_monthly_ils numeric(10,2) not null default 0,
  storage_bytes bigint not null,
  monthly_render_seconds integer not null,
  max_projects integer not null,
  features jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  public boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.cloud_plans (id, name_he, price_monthly_ils, storage_bytes, monthly_render_seconds, max_projects, features) values
  ('free', 'חינמי', 0, 2147483648, 600, 3, '{"browser_render":true,"cloud_render":true,"byok":true}'::jsonb),
  ('creator', 'יוצר', 49, 21474836480, 7200, 50, '{"browser_render":true,"cloud_render":true,"byok":true,"priority":false}'::jsonb),
  ('pro', 'מקצועי', 119, 107374182400, 28800, 500, '{"browser_render":true,"cloud_render":true,"byok":true,"priority":true}'::jsonb)
on conflict (id) do update set
  name_he = excluded.name_he, price_monthly_ils = excluded.price_monthly_ils,
  storage_bytes = excluded.storage_bytes, monthly_render_seconds = excluded.monthly_render_seconds,
  max_projects = excluded.max_projects, features = excluded.features;

create table if not exists public.cloud_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null references public.cloud_plans(id) default 'free',
  plan_version integer not null default 1,
  status text not null default 'active' check (status in ('active','trialing','past_due','cancelled','paused')),
  provider text,
  provider_customer_id text unique,
  provider_subscription_id text unique,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cloud_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  state text not null default 'active' check (state in ('active','archived','deleting')),
  editor_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cloud_projects_owner_idx on public.cloud_projects(owner_id, updated_at desc);

create table if not exists public.cloud_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.cloud_projects(id) on delete cascade,
  object_key text not null unique,
  original_name text not null,
  mime_type text not null,
  media_kind text not null check (media_kind in ('video','audio','image','subtitle','other')),
  size_bytes bigint not null check (size_bytes >= 0),
  sha256 text,
  state text not null default 'pending' check (state in ('pending','available','failed','deleting')),
  source text not null default 'upload' check (source in ('upload','render','generated')),
  uploaded_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists cloud_assets_owner_idx on public.cloud_assets(owner_id, created_at desc);
create index if not exists cloud_assets_project_idx on public.cloud_assets(project_id, created_at desc);

create table if not exists public.cloud_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.cloud_projects(id) on delete cascade,
  type text not null check (type in ('render','proxy','transcribe')),
  status text not null default 'queued' check (status in ('dispatching','queued','running','completed','failed','cancelled')),
  stage text,
  progress numeric(5,4) not null default 0 check (progress between 0 and 1),
  provider_job_id text,
  output_key text,
  result_asset_id uuid references public.cloud_assets(id) on delete set null,
  cancel_requested boolean not null default false,
  error_code text,
  error_message text,
  usage_seconds numeric(12,3) not null default 0,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index if not exists cloud_jobs_owner_idx on public.cloud_jobs(owner_id, created_at desc);
create index if not exists cloud_jobs_project_idx on public.cloud_jobs(project_id, created_at desc);

create table if not exists public.cloud_usage_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.cloud_jobs(id) on delete set null,
  metric text not null check (metric in ('render_seconds','storage_byte_days','ai_units')),
  quantity numeric(20,4) not null check (quantity >= 0),
  idempotency_key text not null unique,
  occurred_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

create or replace function public.cloud_storage_usage_bytes()
returns bigint language sql stable security definer set search_path = public as $$
  select coalesce(sum(size_bytes), 0)::bigint from public.cloud_assets
  where owner_id = auth.uid() and state in ('pending','available');
$$;

create or replace function public.cloud_storage_limit_bytes()
returns bigint language sql stable security definer set search_path = public as $$
  select coalesce(p.storage_bytes, 2147483648)::bigint
  from (select auth.uid() as uid) u
  left join public.cloud_subscriptions s on s.user_id = u.uid and s.status in ('active','trialing')
  left join public.cloud_plans p on p.id = coalesce(s.plan_id, 'free')
  limit 1;
$$;

grant execute on function public.cloud_storage_usage_bytes() to authenticated;
grant execute on function public.cloud_storage_limit_bytes() to authenticated;

alter table public.cloud_plans enable row level security;
alter table public.cloud_subscriptions enable row level security;
alter table public.cloud_projects enable row level security;
alter table public.cloud_assets enable row level security;
alter table public.cloud_jobs enable row level security;
alter table public.cloud_usage_events enable row level security;

drop policy if exists cloud_plans_public_read on public.cloud_plans;
create policy cloud_plans_public_read on public.cloud_plans for select using (active and public);
drop policy if exists cloud_subscriptions_own_read on public.cloud_subscriptions;
create policy cloud_subscriptions_own_read on public.cloud_subscriptions for select using (user_id = auth.uid());

drop policy if exists cloud_projects_owner_all on public.cloud_projects;
create policy cloud_projects_owner_all on public.cloud_projects for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists cloud_assets_owner_all on public.cloud_assets;
create policy cloud_assets_owner_all on public.cloud_assets for all
  using (owner_id = auth.uid()) with check (
    owner_id = auth.uid() and exists (
      select 1 from public.cloud_projects p where p.id = project_id and p.owner_id = auth.uid()
    )
  );
drop policy if exists cloud_jobs_owner_all on public.cloud_jobs;
create policy cloud_jobs_owner_all on public.cloud_jobs for all
  using (owner_id = auth.uid()) with check (
    owner_id = auth.uid() and exists (
      select 1 from public.cloud_projects p where p.id = project_id and p.owner_id = auth.uid()
    )
  );
drop policy if exists cloud_usage_owner_read on public.cloud_usage_events;
create policy cloud_usage_owner_read on public.cloud_usage_events for select using (owner_id = auth.uid());

create or replace function public.touch_cloud_project()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.cloud_projects set updated_at = now() where id = coalesce(new.project_id, old.project_id);
  return coalesce(new, old);
end;
$$;
drop trigger if exists cloud_assets_touch_project on public.cloud_assets;
create trigger cloud_assets_touch_project after insert or update or delete on public.cloud_assets
for each row execute function public.touch_cloud_project();

-- Package A owns system_settings. Keep the cloud migration independent when
-- Package A was not installed, while still recording version/retention when it was.
do $migration$
begin
  if to_regclass('public.system_settings') is not null then
    execute $sql$
      insert into public.system_settings (key, value) values
        ('cloud_saas_schema_version', '1'::jsonb),
        ('cloud_default_retention_days', '30'::jsonb)
      on conflict (key) do update set value = excluded.value, updated_at = now()
    $sql$;
  end if;
end;
$migration$;
