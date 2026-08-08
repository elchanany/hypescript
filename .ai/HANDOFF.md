# HANDOFF

## Auth
Production `Invalid API key` = bad Supabase public key on Vercel.
Code sanitizes quotes, rejects secret/service_role as public key, `/api/config` exposes safe diagnostics.

## User action
Vercel → `NEXT_PUBLIC_SUPABASE_URL` + Publishable/anon (not Secret) → Redeploy.

## Also on main
Dashboard project cards / timeline zoom merges.

## Next
AG-4 Plan approvals על main ב־`2d8e2a0`. מקומית PR-1 מפריד `configured_unverified` מ-`ready`, מעדכן Chat/Settings ובדיקות בלי לבצע probe שעלול לעלות כסף. tsc, 187/187 tests, production build ו־Graphify update עברו. להשלים commit+push; הבא provider billing policy/Zero-cost approval. Package C רק אחרי login עובד.
