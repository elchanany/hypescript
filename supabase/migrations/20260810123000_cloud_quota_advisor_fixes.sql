-- Advisor follow-up for quota tables and owner-scoped policies.

create index if not exists cloud_jobs_result_asset_idx on public.cloud_jobs(result_asset_id);
create index if not exists cloud_subscriptions_plan_idx on public.cloud_subscriptions(plan_id);
create index if not exists cloud_usage_events_job_idx on public.cloud_usage_events(job_id);
create index if not exists cloud_usage_events_owner_idx on public.cloud_usage_events(owner_id, occurred_at desc);

drop policy if exists cloud_runtime_settings_no_client_access on public.cloud_runtime_settings;
create policy cloud_runtime_settings_no_client_access on public.cloud_runtime_settings
  for all to anon, authenticated using (false) with check (false);

drop policy if exists cloud_subscriptions_own_read on public.cloud_subscriptions;
create policy cloud_subscriptions_own_read on public.cloud_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists cloud_projects_owner_all on public.cloud_projects;
create policy cloud_projects_owner_all on public.cloud_projects
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists cloud_assets_owner_all on public.cloud_assets;
create policy cloud_assets_owner_all on public.cloud_assets
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid()) and exists (
      select 1 from public.cloud_projects p
      where p.id = project_id and p.owner_id = (select auth.uid())
    )
  );

drop policy if exists cloud_jobs_owner_all on public.cloud_jobs;
create policy cloud_jobs_owner_all on public.cloud_jobs
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid()) and exists (
      select 1 from public.cloud_projects p
      where p.id = project_id and p.owner_id = (select auth.uid())
    )
  );

drop policy if exists cloud_usage_owner_read on public.cloud_usage_events;
create policy cloud_usage_owner_read on public.cloud_usage_events
  for select to authenticated using (owner_id = (select auth.uid()));

-- These two read-only helpers do not need elevated privileges; RLS is sufficient.
alter function public.cloud_storage_usage_bytes() security invoker;
alter function public.cloud_storage_limit_bytes() security invoker;

