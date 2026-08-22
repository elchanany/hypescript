-- Brand Kit בענן.
--
-- הרקע: הראוט /api/cloud/brand כתב וקרא מטבלה בשם public.user_profiles עם עמודה
-- brand_kit — טבלה שלא קיימת באף מיגרציה בריפו. התוצאה: כל סנכרון נכשל ב-500,
-- הקורא בלע את השגיאה עם catch ריק, וה-GET החזיר null גם כשהיה כשל. כלומר
-- ה-Brand Kit היה מקומי בלבד, בלי שאיש ידע — מכשיר שני נפתח בלי לוגו ובלי
-- הנחיות כתיבה לסוכן.
--
-- טבלה ייעודית ולא עמודה בפרופיל: ה-Brand Kit הוא ישות עצמאית שגדלה (לוגו,
-- צבעים, גופנים, טון כתיבה), ואין סיבה שכל קריאת פרופיל תגרור אותו.

create table if not exists public.user_brand_kits (
  user_id uuid not null primary key references auth.users(id) on delete cascade,
  brand_kit jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_brand_kits enable row level security;

-- המשתמש קורא וכותב את השורה שלו בלבד. אין כאן סודות (מפתחות API לעולם לא
-- נשמרים כאן), ולכן גישה ישירה מהדפדפן דרך RLS היא מתאימה — בשונה מ-
-- user_provider_secrets, שנגיש רק ל-service role.
drop policy if exists "brand kit owner select" on public.user_brand_kits;
create policy "brand kit owner select" on public.user_brand_kits
  for select using (auth.uid() = user_id);

drop policy if exists "brand kit owner upsert" on public.user_brand_kits;
create policy "brand kit owner upsert" on public.user_brand_kits
  for insert with check (auth.uid() = user_id);

drop policy if exists "brand kit owner update" on public.user_brand_kits;
create policy "brand kit owner update" on public.user_brand_kits
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "brand kit owner delete" on public.user_brand_kits;
create policy "brand kit owner delete" on public.user_brand_kits
  for delete using (auth.uid() = user_id);

comment on table public.user_brand_kits is
  'Per-user brand kit (logo reference, colours, fonts, tone). Owner-scoped via RLS. No credentials.';
