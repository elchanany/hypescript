# HANDOFF

## Goal
עורך CapCut-class + סוכן AI + ElevenLabs + Auth/Dashboard אופציונלי (Supabase).

## Current State (verified)
- `main` כולל Auth (PR #7), ElevenLabs, תיקוני זום/טיימליין.
- באג מדווח בפרודקשן: OAuth מגיע ל־`…/rest/v1/auth/v1/authorize` → `No API key found`.
  סיבה: `NEXT_PUBLIC_SUPABASE_URL` ב־Vercel כולל `/rest/v1`.
- ענף תיקון: `cursor/fix-supabase-url-505e` — נרמול URL בקוד + אזהרה במדריך.

## Exact Next Steps
1. ב־Vercel: לתקן ידנית `NEXT_PUBLIC_SUPABASE_URL` ל־`https://dbfednzsladjxjhlwfxr.supabase.co` (בלי `/rest/v1`) → Redeploy.
2. למזג את PR של `cursor/fix-supabase-url-505e` (הגנה מפני העתקה שגויה בעתיד).
3. לבדוק `/login` → Google → `/dashboard` ב־https://hypescript.vercel.app/login

## Risks
- בלי תיקון ה־env ב־Vercel — גם אחרי מיזוג הקוד, אם ה־URL עדיין עם `/rest/v1` הקוד החדש ינרמל; אבל Redeploy נדרש.
- Secret/service_role אסור בצד לקוח.
