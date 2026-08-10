-- Fail-closed, transaction-safe cloud quotas.
-- All reservations happen in Postgres so concurrent requests cannot overrun limits.

alter table public.cloud_plans
  add column if not exists max_concurrent_renders integer not null default 1
  check (max_concurrent_renders between 1 and 20);

update public.cloud_plans set max_concurrent_renders = case id
  when 'pro' then 3
  when 'creator' then 2
  else 1
end;

create table if not exists public.cloud_runtime_settings (
  singleton boolean primary key default true check (singleton),
  rendering_enabled boolean not null default true,
  global_monthly_render_seconds integer not null default 3600 check (global_monthly_render_seconds >= 0),
  updated_at timestamptz not null default now()
);

insert into public.cloud_runtime_settings (singleton, rendering_enabled, global_monthly_render_seconds)
values (true, true, 3600)
on conflict (singleton) do nothing;

alter table public.cloud_runtime_settings enable row level security;
revoke all on public.cloud_runtime_settings from anon, authenticated;

create or replace function public.cloud_create_project(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_limit integer;
  v_count integer;
  v_id uuid;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 120 then
    raise exception 'project_name_required';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user::text));
  select coalesce(p.max_projects, 3) into v_limit
  from (select v_user as uid) u
  left join public.cloud_subscriptions s on s.user_id = u.uid and s.status in ('active', 'trialing')
  left join public.cloud_plans p on p.id = coalesce(s.plan_id, 'free') and p.active
  limit 1;
  select count(*) into v_count from public.cloud_projects
    where owner_id = v_user and state <> 'deleting';
  if v_count >= v_limit then raise exception 'project_quota_exceeded'; end if;

  insert into public.cloud_projects (owner_id, name)
  values (v_user, btrim(p_name)) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.cloud_reserve_asset(
  p_project_id uuid,
  p_object_key text,
  p_original_name text,
  p_mime_type text,
  p_media_kind text,
  p_size_bytes bigint
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_limit bigint;
  v_usage bigint;
  v_id uuid;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if p_size_bytes is null or p_size_bytes <= 0 then raise exception 'invalid_upload'; end if;
  if not exists (select 1 from public.cloud_projects where id = p_project_id and owner_id = v_user and state = 'active') then
    raise exception 'project_not_found';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user::text));
  select coalesce(p.storage_bytes, 2147483648) into v_limit
  from (select v_user as uid) u
  left join public.cloud_subscriptions s on s.user_id = u.uid and s.status in ('active', 'trialing')
  left join public.cloud_plans p on p.id = coalesce(s.plan_id, 'free') and p.active
  limit 1;
  select coalesce(sum(size_bytes), 0)::bigint into v_usage from public.cloud_assets
    where owner_id = v_user and state in ('pending', 'available');
  if v_usage + p_size_bytes > v_limit then raise exception 'storage_quota_exceeded'; end if;

  insert into public.cloud_assets (
    owner_id, project_id, object_key, original_name, mime_type, media_kind, size_bytes, state
  ) values (
    v_user, p_project_id, p_object_key, p_original_name, p_mime_type, p_media_kind, p_size_bytes, 'pending'
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.cloud_reserve_render(p_project_id uuid, p_estimated_seconds numeric)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_user_limit integer;
  v_concurrency_limit integer;
  v_global_limit integer;
  v_user_usage numeric;
  v_global_usage numeric;
  v_active integer;
  v_id uuid;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if p_estimated_seconds is null or p_estimated_seconds <= 0 or p_estimated_seconds > 86400 then
    raise exception 'invalid_render_duration';
  end if;
  if not exists (select 1 from public.cloud_projects where id = p_project_id and owner_id = v_user and state = 'active') then
    raise exception 'project_not_found';
  end if;

  -- Global lock first, then user lock: every caller uses the same order.
  perform pg_advisory_xact_lock(74919331);
  perform pg_advisory_xact_lock(hashtext(v_user::text));

  select global_monthly_render_seconds into v_global_limit
  from public.cloud_runtime_settings where singleton and rendering_enabled;
  if not found then raise exception 'cloud_render_paused'; end if;

  select coalesce(p.monthly_render_seconds, 600), coalesce(p.max_concurrent_renders, 1)
    into v_user_limit, v_concurrency_limit
  from (select v_user as uid) u
  left join public.cloud_subscriptions s on s.user_id = u.uid and s.status in ('active', 'trialing')
  left join public.cloud_plans p on p.id = coalesce(s.plan_id, 'free') and p.active
  limit 1;

  select count(*) into v_active from public.cloud_jobs
    where owner_id = v_user and status in ('dispatching', 'queued', 'running');
  if v_active >= v_concurrency_limit then raise exception 'render_concurrency_exceeded'; end if;

  select coalesce(sum(usage_seconds), 0) into v_user_usage from public.cloud_jobs
    where owner_id = v_user
      and created_at >= date_trunc('month', now())
      and status not in ('failed', 'cancelled');
  if v_user_usage + p_estimated_seconds > v_user_limit then raise exception 'render_quota_exceeded'; end if;

  select coalesce(sum(usage_seconds), 0) into v_global_usage from public.cloud_jobs
    where created_at >= date_trunc('month', now())
      and status not in ('failed', 'cancelled');
  if v_global_usage + p_estimated_seconds > v_global_limit then raise exception 'global_render_quota_exceeded'; end if;

  insert into public.cloud_jobs (
    owner_id, project_id, type, status, progress, usage_seconds
  ) values (
    v_user, p_project_id, 'render', 'dispatching', 0, p_estimated_seconds
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.cloud_usage_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_plan public.cloud_plans%rowtype;
  v_projects integer;
  v_storage bigint;
  v_render numeric;
  v_active integer;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  select p.* into v_plan
  from (select v_user as uid) u
  left join public.cloud_subscriptions s on s.user_id = u.uid and s.status in ('active', 'trialing')
  join public.cloud_plans p on p.id = coalesce(s.plan_id, 'free') and p.active
  limit 1;
  select count(*) into v_projects from public.cloud_projects where owner_id = v_user and state <> 'deleting';
  select coalesce(sum(size_bytes), 0)::bigint into v_storage from public.cloud_assets where owner_id = v_user and state in ('pending', 'available');
  select coalesce(sum(usage_seconds), 0) into v_render from public.cloud_jobs
    where owner_id = v_user and created_at >= date_trunc('month', now()) and status not in ('failed', 'cancelled');
  select count(*) into v_active from public.cloud_jobs where owner_id = v_user and status in ('dispatching', 'queued', 'running');
  return jsonb_build_object(
    'planId', v_plan.id,
    'projects', jsonb_build_object('used', v_projects, 'limit', v_plan.max_projects),
    'storageBytes', jsonb_build_object('used', v_storage, 'limit', v_plan.storage_bytes),
    'renderSeconds', jsonb_build_object('used', v_render, 'limit', v_plan.monthly_render_seconds),
    'activeRenders', jsonb_build_object('used', v_active, 'limit', v_plan.max_concurrent_renders)
  );
end;
$$;

create or replace function public.cloud_complete_render(
  p_job_id uuid,
  p_size_bytes bigint,
  p_render_seconds numeric
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.cloud_jobs%rowtype;
  v_limit bigint;
  v_usage bigint;
  v_asset_id uuid;
  v_seconds numeric;
begin
  -- This function is service-role only; it is never granted to end users.
  select * into v_job from public.cloud_jobs where id = p_job_id for update;
  if not found then raise exception 'job_not_found'; end if;
  if v_job.status = 'completed' and v_job.result_asset_id is not null then return v_job.result_asset_id; end if;
  if v_job.status in ('failed', 'cancelled') then raise exception 'job_already_terminal'; end if;
  if p_size_bytes is null or p_size_bytes <= 0 then raise exception 'invalid_render_output'; end if;

  perform pg_advisory_xact_lock(hashtext(v_job.owner_id::text));
  select coalesce(p.storage_bytes, 2147483648) into v_limit
  from (select v_job.owner_id as uid) u
  left join public.cloud_subscriptions s on s.user_id = u.uid and s.status in ('active', 'trialing')
  left join public.cloud_plans p on p.id = coalesce(s.plan_id, 'free') and p.active
  limit 1;
  select coalesce(sum(size_bytes), 0)::bigint into v_usage from public.cloud_assets
    where owner_id = v_job.owner_id and state in ('pending', 'available');
  if v_usage + p_size_bytes > v_limit then raise exception 'storage_quota_exceeded'; end if;

  select id into v_asset_id from public.cloud_assets where object_key = v_job.output_key;
  if v_asset_id is null then
    insert into public.cloud_assets (
      owner_id, project_id, object_key, original_name, mime_type, media_kind,
      size_bytes, state, uploaded_at, source
    ) values (
      v_job.owner_id, v_job.project_id, v_job.output_key, 'hypescript-' || p_job_id || '.mp4',
      'video/mp4', 'video', p_size_bytes, 'available', now(), 'render'
    ) returning id into v_asset_id;
  end if;

  v_seconds := greatest(0, least(86400, coalesce(p_render_seconds, v_job.usage_seconds)));
  update public.cloud_jobs set
    status = 'completed', progress = 1, result_asset_id = v_asset_id,
    usage_seconds = v_seconds, finished_at = now()
  where id = p_job_id;
  insert into public.cloud_usage_events (owner_id, job_id, metric, quantity, idempotency_key, meta)
  values (v_job.owner_id, p_job_id, 'render_seconds', v_seconds, 'render:' || p_job_id, jsonb_build_object('source', 'cloud_run'))
  on conflict (idempotency_key) do nothing;
  return v_asset_id;
end;
$$;

revoke execute on function public.cloud_create_project(text) from public, anon;
revoke execute on function public.cloud_reserve_asset(uuid, text, text, text, text, bigint) from public, anon;
revoke execute on function public.cloud_reserve_render(uuid, numeric) from public, anon;
revoke execute on function public.cloud_usage_snapshot() from public, anon;
revoke execute on function public.cloud_complete_render(uuid, bigint, numeric) from public, anon, authenticated;
revoke execute on function public.cloud_storage_usage_bytes() from public, anon;
revoke execute on function public.cloud_storage_limit_bytes() from public, anon;
revoke execute on function public.touch_cloud_project() from public, anon, authenticated;
grant execute on function public.cloud_create_project(text) to authenticated;
grant execute on function public.cloud_reserve_asset(uuid, text, text, text, text, bigint) to authenticated;
grant execute on function public.cloud_reserve_render(uuid, numeric) to authenticated;
grant execute on function public.cloud_usage_snapshot() to authenticated;
grant execute on function public.cloud_complete_render(uuid, bigint, numeric) to service_role;

-- Prevent bypassing quota RPCs through direct Data API writes.
revoke insert on public.cloud_projects from authenticated;
revoke insert, update, delete on public.cloud_assets from authenticated;
revoke insert, update, delete on public.cloud_jobs from authenticated;
revoke delete on public.cloud_projects from authenticated;
