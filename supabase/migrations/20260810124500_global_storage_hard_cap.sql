-- Keep R2 usage below its 10 GB free tier with an 8 GiB database-enforced ceiling.

alter table public.cloud_runtime_settings
  add column if not exists global_storage_bytes bigint not null default 8589934592
  check (global_storage_bytes >= 0);

update public.cloud_runtime_settings
set global_storage_bytes = least(global_storage_bytes, 8589934592), updated_at = now()
where singleton;

create or replace function public.enforce_cloud_asset_quota()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_global_limit bigint;
  v_global_usage bigint;
  v_user_limit bigint;
  v_user_usage bigint;
begin
  if new.state not in ('pending', 'available') then return new; end if;

  -- A storage-only global lock serializes reservations across users.
  perform pg_advisory_xact_lock(74919332);
  select global_storage_bytes into v_global_limit
    from public.cloud_runtime_settings where singleton;
  select coalesce(sum(size_bytes), 0)::bigint into v_global_usage
    from public.cloud_assets
    where state in ('pending', 'available') and id <> new.id;
  if v_global_usage + new.size_bytes > v_global_limit then
    raise exception 'global_storage_quota_exceeded';
  end if;

  select coalesce(p.storage_bytes, 2147483648) into v_user_limit
  from (select new.owner_id as uid) u
  left join public.cloud_subscriptions s on s.user_id = u.uid and s.status in ('active', 'trialing')
  left join public.cloud_plans p on p.id = coalesce(s.plan_id, 'free') and p.active
  limit 1;
  select coalesce(sum(size_bytes), 0)::bigint into v_user_usage
    from public.cloud_assets
    where owner_id = new.owner_id and state in ('pending', 'available') and id <> new.id;
  if v_user_usage + new.size_bytes > v_user_limit then
    raise exception 'storage_quota_exceeded';
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_cloud_asset_quota() from public, anon, authenticated;
drop trigger if exists enforce_cloud_asset_quota on public.cloud_assets;
create trigger enforce_cloud_asset_quota
before insert or update of owner_id, size_bytes, state on public.cloud_assets
for each row execute function public.enforce_cloud_asset_quota();

