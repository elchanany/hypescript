# HANDOFF

## Auth
Production `Invalid API key` = bad Supabase public key on Vercel.
Code sanitizes quotes, rejects secret/service_role as public key, `/api/config` exposes safe diagnostics.

## User action
Vercel → `NEXT_PUBLIC_SUPABASE_URL` + Publishable/anon (not Secret) → Redeploy.

## Also on main
Dashboard project cards / timeline zoom merges.

## Next
AG-4 usage כבר על main ב־`c21fec7`. מקומית נוסף checkpoint לפני כל mutating tool + restore אטומי דרך EditorApi/useEditor History + בדיקה; tsc, 182/182 tests, production build ו־Graphify update עברו. להשלים commit+push; הבא audit plan approvals מול PR-1. Package C רק אחרי login עובד.
