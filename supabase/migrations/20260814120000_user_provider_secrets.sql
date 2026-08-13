-- Encrypted BYOK credentials. No browser role receives direct table access.
create table if not exists public.user_provider_secrets (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('deepseek','openai','anthropic','gemini')),
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.user_provider_secrets enable row level security;
revoke all on table public.user_provider_secrets from anon, authenticated;

comment on table public.user_provider_secrets is
  'AES-256-GCM encrypted BYOK keys. Accessed only through service-role server routes.';
