# HANDOFF

## Goal
CapCut-class editor + AI agent. Auth/Dashboard אופציונלי דרך Supabase.

## Current State
- `main` כולל Package A + Timeline gaps/CommandBus/Providers (PR #1 + #3 ממוזגים).
- ענף נוכחי: `cursor/auth-dashboard-505e`
  - `/login`, `/dashboard`, `/auth/callback`
  - Supabase client אופציונלי — **בלי env האפליקציה לא קורסת**
  - מדריך: `docs/SETUP_AUTH.md`
  - TopBar → קישור ללוח פרויקטים + אינדיקציית משתמש

## Exact Next Steps (למשתמש)
1. למזג PR Auth אחרי בדיקה.
2. לעקוב אחרי `docs/SETUP_AUTH.md` (Supabase + Google + Vercel env + Redeploy).
3. לבדוק `/login` → Google → `/dashboard`.

## Risks
- בלי Redeploy אחרי הוספת env ב-Vercel — Auth יישאר "לא מוגדר".
- service_role אסור בצד לקוח (לא נגענו).
