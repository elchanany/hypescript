# HANDOFF

## Auth
Production `Invalid API key` = bad Supabase public key on Vercel.
Code sanitizes quotes, rejects secret/service_role as public key, `/api/config` exposes safe diagnostics.

## User action
Vercel → `NEXT_PUBLIC_SUPABASE_URL` + Publishable/anon (not Secret) → Redeploy.

## Also on main
Dashboard project cards / timeline zoom merges.

## Next
AG-2: Agent `set_clip_enabled` + `set_clip_volume` משתמשים כעת באותו CommandBus של ה-UI, עם `toolParity.test.ts`. אומת: tsc, 171/171 tests, build, Graphify. אחרי commit+push: track rename/lock/mute parity. Package C רק אחרי login עובד.
