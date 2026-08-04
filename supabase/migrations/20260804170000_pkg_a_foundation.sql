-- Package A — Foundation: profiles, RBAC, system owner protection, audit, settings stubs.
-- Additive only. Does not drop existing tables.
-- schemaVersion marker: saas_foundation = 1

-- Extensions
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  locale text not null default 'he',
  timezone text not null default 'Asia/Jerusalem',
  usage_type text check (usage_type in ('personal', 'nonprofit', 'business', 'team')),
  onboarding_completed boolean not null default false,
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  system_owner boolean not null default false,
  quota_exempt boolean not null default false,
  suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);

-- ---------------------------------------------------------------------------
-- User settings / preferences
-- ---------------------------------------------------------------------------
create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  theme text not null default 'system' check (theme in ('system', 'dark', 'light')),
  reduced_motion boolean not null default false,
  default_project_mode text not null default 'ask'
    check (default_project_mode in ('local', 'cloud', 'hybrid', 'ask')),
  notify_email boolean not null default true,
  notify_in_app boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RBAC
-- ---------------------------------------------------------------------------
create table if not exists public.roles (
  id text primary key,
  label_he text not null,
  rank integer not null default 100,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.permissions (
  id text primary key,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id text not null references public.roles (id) on delete cascade,
  permission_id text not null references public.permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id text not null references public.roles (id) on delete restrict,
  granted_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create index if not exists user_roles_role_idx on public.user_roles (role_id);

-- Seed roles
insert into public.roles (id, label_he, rank, description) values
  ('system_owner', 'בעלים', 0, 'System Owner — מוגן'),
  ('system_admin', 'מנהל מערכת', 10, 'Admin מערכת'),
  ('billing_admin', 'מנהל חיוב', 20, 'Billing'),
  ('provider_admin', 'מנהל ספקים', 20, 'Providers'),
  ('support_admin', 'תמיכה', 30, 'Support'),
  ('project_admin', 'מנהל פרויקטים', 40, 'Projects'),
  ('user', 'משתמש', 100, 'משתמש רגיל'),
  ('suspended', 'מושעה', 1000, 'חשבון מושעה')
on conflict (id) do nothing;

-- Seed core permissions (Package A subset; more in later packages)
insert into public.permissions (id, description) values
  ('users.read', 'קריאת משתמשים'),
  ('users.update', 'עדכון משתמשים'),
  ('users.suspend', 'השעיית משתמשים'),
  ('users.delete', 'מחיקת משתמשים'),
  ('roles.read', 'קריאת תפקידים'),
  ('roles.assign', 'הקצאת תפקידים'),
  ('admins.invite', 'הזמנת מנהלים'),
  ('admins.revoke', 'שלילת מנהלים'),
  ('audit.read', 'קריאת audit'),
  ('system_settings.write', 'כתיבת הגדרות מערכת'),
  ('branding.write', 'כתיבת מיתוג'),
  ('credits.read', 'קריאת יתרות'),
  ('credits.grant', 'הענקת יתרה'),
  ('projects.read_all', 'קריאת כל הפרויקטים'),
  ('support.access', 'גישת תמיכה')
on conflict (id) do nothing;

-- system_owner gets all permissions
insert into public.role_permissions (role_id, permission_id)
select 'system_owner', p.id from public.permissions p
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id) values
  ('system_admin', 'users.read'),
  ('system_admin', 'users.update'),
  ('system_admin', 'users.suspend'),
  ('system_admin', 'roles.read'),
  ('system_admin', 'admins.invite'),
  ('system_admin', 'audit.read'),
  ('system_admin', 'support.access'),
  ('support_admin', 'users.read'),
  ('support_admin', 'support.access'),
  ('support_admin', 'audit.read'),
  ('user', 'credits.read')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Audit + login events
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  action text not null,
  target_type text,
  target_id text,
  result text not null default 'ok',
  reason text,
  correlation_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs (action, created_at desc);

create table if not exists public.login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  event text not null,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists login_events_user_idx on public.login_events (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Credit account stub (Package C fills ledger; Package A creates account + trial flag)
-- ---------------------------------------------------------------------------
create table if not exists public.credit_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'frozen', 'closed')),
  quota_exempt boolean not null default false,
  cached_available_micro_ils bigint not null default 0,
  trial_granted boolean not null default false,
  currency_basis text not null default 'micro_ils',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

insert into public.system_settings (key, value) values
  ('free_trial_budget_ils', '5.00'::jsonb),
  ('saas_foundation_schema_version', '1'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_system_owner(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select system_owner from public.profiles where id = uid), false)
    or exists (select 1 from public.user_roles where user_id = uid and role_id = 'system_owner');
$$;

create or replace function public.has_permission(uid uuid, perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_system_owner(uid)
    or exists (
      select 1
      from public.user_roles ur
      join public.role_permissions rp on rp.role_id = ur.role_id
      where ur.user_id = uid and rp.permission_id = perm
    );
$$;

-- ---------------------------------------------------------------------------
-- Profile bootstrap on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bootstrap_email text := lower(coalesce(current_setting('app.bootstrap_super_admin_email', true), ''));
  is_owner boolean := false;
begin
  if bootstrap_email <> '' and lower(coalesce(new.email, '')) = bootstrap_email then
    is_owner := true;
  end if;

  insert into public.profiles (id, email, display_name, avatar_url, system_owner, quota_exempt)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email,''), '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    is_owner,
    is_owner
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();

  insert into public.user_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.credit_accounts (user_id, quota_exempt)
  values (new.id, is_owner)
  on conflict (user_id) do nothing;

  if is_owner then
    insert into public.user_roles (user_id, role_id) values (new.id, 'system_owner')
    on conflict do nothing;
  else
    insert into public.user_roles (user_id, role_id) values (new.id, 'user')
    on conflict do nothing;
  end if;

  insert into public.audit_logs (actor_id, action, target_type, target_id, meta)
  values (new.id, 'auth.signup', 'user', new.id::text,
    jsonb_build_object('system_owner', is_owner, 'email', new.email));

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Protect System Owner (DB-level)
-- ---------------------------------------------------------------------------
create or replace function public.protect_system_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.system_owner then
      raise exception 'SYSTEM_OWNER_PROTECTED: cannot delete system owner profile';
    end if;
    return old;
  end if;

  if old.system_owner then
    if new.system_owner is distinct from true then
      raise exception 'SYSTEM_OWNER_PROTECTED: cannot demote system_owner flag';
    end if;
    if new.quota_exempt is distinct from true then
      raise exception 'SYSTEM_OWNER_PROTECTED: cannot clear quota_exempt';
    end if;
    if new.suspended is distinct from false then
      raise exception 'SYSTEM_OWNER_PROTECTED: cannot suspend system owner';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_protect_system_owner on public.profiles;
create trigger trg_protect_system_owner
  before update or delete on public.profiles
  for each row execute function public.protect_system_owner();

create or replace function public.protect_system_owner_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' and old.role_id = 'system_owner' then
    if (select count(*) from public.user_roles where role_id = 'system_owner') <= 1 then
      raise exception 'SYSTEM_OWNER_PROTECTED: cannot remove last system_owner role';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_system_owner_role on public.user_roles;
create trigger trg_protect_system_owner_role
  before delete on public.user_roles
  for each row execute function public.protect_system_owner_role();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.audit_logs enable row level security;
alter table public.login_events enable row level security;
alter table public.credit_accounts enable row level security;
alter table public.system_settings enable row level security;

-- Profiles: self read/update; admins with users.read can read all
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles
  for select using (
    auth.uid() = id
    or public.has_permission(auth.uid(), 'users.read')
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- User settings: self only
drop policy if exists user_settings_self on public.user_settings;
create policy user_settings_self on public.user_settings
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Roles/permissions: authenticated read
drop policy if exists roles_read_auth on public.roles;
create policy roles_read_auth on public.roles for select to authenticated using (true);
drop policy if exists permissions_read_auth on public.permissions;
create policy permissions_read_auth on public.permissions for select to authenticated using (true);
drop policy if exists role_permissions_read_auth on public.role_permissions;
create policy role_permissions_read_auth on public.role_permissions for select to authenticated using (true);

-- user_roles: self read; roles.read for all
drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select on public.user_roles
  for select using (
    auth.uid() = user_id
    or public.has_permission(auth.uid(), 'roles.read')
  );

-- Audit: audit.read only
drop policy if exists audit_read_admin on public.audit_logs;
create policy audit_read_admin on public.audit_logs
  for select using (public.has_permission(auth.uid(), 'audit.read'));

drop policy if exists login_events_self on public.login_events;
create policy login_events_self on public.login_events
  for select using (auth.uid() = user_id or public.has_permission(auth.uid(), 'audit.read'));

-- Credits: self read (display later as %); credits.read for admins
drop policy if exists credit_accounts_select on public.credit_accounts;
create policy credit_accounts_select on public.credit_accounts
  for select using (
    auth.uid() = user_id
    or public.has_permission(auth.uid(), 'credits.read')
  );

-- System settings: read for authenticated; write only system_settings.write
drop policy if exists system_settings_read on public.system_settings;
create policy system_settings_read on public.system_settings
  for select to authenticated using (true);

drop policy if exists system_settings_write on public.system_settings;
create policy system_settings_write on public.system_settings
  for all using (public.has_permission(auth.uid(), 'system_settings.write'))
  with check (public.has_permission(auth.uid(), 'system_settings.write'));
