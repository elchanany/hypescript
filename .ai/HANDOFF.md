# HANDOFF

## Auth
Production `Invalid API key` = bad Supabase public key on Vercel.
Code sanitizes quotes, rejects secret/service_role as public key, `/api/config` exposes safe diagnostics.

## User action
Vercel → `NEXT_PUBLIC_SUPABASE_URL` + Publishable/anon (not Secret) → Redeploy.

## Also on main
Dashboard project cards / timeline zoom merges.

## Next
PR-1 Zero-cost approval על main ב־`2c2f257`. מקומית AG-2 מוסיף Ctrl/Cmd+K dynamic command menu מה-Registry עם context/permission/schema/selection filtering והרצה דרך CommandBus. tsc, 191/191 tests, production build ו־Graphify update עברו. להשלים commit+push; הבא dynamic clip context-menu. Package C רק אחרי login עובד.
