# HANDOFF

## Goal
עורך CapCut-class + סוכן AI + ElevenLabs + Auth/Dashboard אופציונלי (Supabase).

## Current State (verified)
- `main` כולל ElevenLabs, תיקוני ציטוט/זום/פאן, Package A / timeline / providers.
- ענף Auth: `cursor/auth-dashboard-505e` (PR #7)
  - `/login`, `/dashboard`, `/auth/callback`
  - Supabase אופציונלי (Publishable key) — בלי env לא קורס
  - מדריך: `docs/SETUP_AUTH.md`
- `ELEVENLABS_API_KEY` בשרת בלבד; סטטוס בהגדרות

## Exact Next Steps
1. למזג PR #7 ל-main + Redeploy ב-Vercel (המפתחות כבר שם).
2. להפעיל Google ב-Supabase Auth + OAuth ב-Google Cloud (ראה SETUP_AUTH).
3. לבדוק `/login` → Google → `/dashboard`.

## Risks
- בלי מיזוג #7 — `/login` לא קיים בפרודקשן גם אם המפתחות ב-Vercel.
- Secret/service_role אסור בצד לקוח.
- Forced Alignment של ElevenLabs לא מומלץ לעברית — Scribe word timestamps.
