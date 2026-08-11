create index if not exists cloud_subscriptions_target_plan_idx
  on public.cloud_subscriptions (target_plan_id)
  where target_plan_id is not null;
