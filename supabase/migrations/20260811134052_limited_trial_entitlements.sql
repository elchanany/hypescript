-- A card-backed Lemon Squeezy trial receives intentionally reduced cloud limits.
-- The intended paid plan is retained separately and becomes effective after
-- Lemon reports the first successful charge.

insert into public.cloud_plans (
  id, version, name_he, price_monthly_ils, storage_bytes,
  monthly_render_seconds, max_projects, max_concurrent_renders,
  features, active, public
) values (
  'trial', 1, 'ניסיון', 0, 1073741824,
  1200, 5, 1,
  '{"browser_render":true,"cloud_render":true,"byok":true,"limited_trial":true}'::jsonb,
  true, false
)
on conflict (id) do update set
  name_he = excluded.name_he,
  storage_bytes = excluded.storage_bytes,
  monthly_render_seconds = excluded.monthly_render_seconds,
  max_projects = excluded.max_projects,
  max_concurrent_renders = excluded.max_concurrent_renders,
  features = excluded.features,
  active = excluded.active,
  public = excluded.public;

alter table public.cloud_subscriptions
  add column if not exists target_plan_id text references public.cloud_plans(id),
  add column if not exists trial_ends_at timestamptz,
  add column if not exists trial_used_at timestamptz;

update public.cloud_subscriptions
set target_plan_id = plan_id
where target_plan_id is null and plan_id in ('creator', 'pro');

alter table public.cloud_subscriptions
  drop constraint if exists cloud_subscriptions_target_plan_check;

alter table public.cloud_subscriptions
  add constraint cloud_subscriptions_target_plan_check
  check (target_plan_id is null or target_plan_id in ('creator', 'pro'));

create index if not exists cloud_subscriptions_trial_idx
  on public.cloud_subscriptions (status, trial_ends_at)
  where status = 'trialing';
