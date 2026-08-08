# HANDOFF

## Auth
Production `Invalid API key` = bad Supabase public key on Vercel.
Code sanitizes quotes, rejects secret/service_role as public key, `/api/config` exposes safe diagnostics.

## User action
Vercel → `NEXT_PUBLIC_SUPABASE_URL` + Publishable/anon (not Secret) → Redeploy.

## Also on main
Dashboard project cards / timeline zoom merges.

## Next
AG-2 dynamic Ctrl/Cmd+K menu על main ב־`b879472`. מקומית גם Clip/Gap context-menu נגזר מה-Registry כולל target, order, icon, danger, shortcut ו-lock policy; אין duplication של actions. tsc, 192/192 tests, production build ו־Graphify update עברו. להשלים commit+push; הבא Track context-menu audit. Package C רק אחרי login עובד.
