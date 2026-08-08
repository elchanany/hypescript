# HANDOFF

## Auth
Production `Invalid API key` = bad Supabase public key on Vercel.
Code sanitizes quotes, rejects secret/service_role as public key, `/api/config` exposes safe diagnostics.

## User action
Vercel → `NEXT_PUBLIC_SUPABASE_URL` + Publishable/anon (not Secret) → Redeploy.

## Also on main
Dashboard project cards / timeline zoom merges.

## Next
AG-4 checkpoint restore כבר על main ב־`60f93e5`. מקומית נוסף Plan checklist + כרטיס אישור שמעביר ל-Act ומבצע את אותה תוכנית + בקשת שינוי שנשארת ב-Plan ללא כלים. tsc, 186/186 tests, production build ו־Graphify update עברו. להשלים commit+push; הבא PR-1 provider policy/health audit. Package C רק אחרי login עובד.
