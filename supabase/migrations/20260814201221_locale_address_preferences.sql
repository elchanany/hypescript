-- Additive locale and grammatical-address preferences.
-- No raw IP or inferred demographic data is stored. The value only controls
-- how the interface addresses the signed-in user.
alter table public.profiles
  add column if not exists address_form text not null default 'unspecified';

alter table public.profiles drop constraint if exists profiles_locale_check;
alter table public.profiles add constraint profiles_locale_check
  check (locale in ('he', 'en', 'ar', 'ru', 'hi'));

alter table public.profiles drop constraint if exists profiles_address_form_check;
alter table public.profiles add constraint profiles_address_form_check
  check (address_form in ('male', 'female', 'plural', 'unspecified'));
