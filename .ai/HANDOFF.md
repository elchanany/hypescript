# HANDOFF

## Auth
Production `Invalid API key` = bad Supabase public key on Vercel.
Code sanitizes quotes, rejects secret/service_role as public key, `/api/config` exposes safe diagnostics.

## User action
Vercel → `NEXT_PUBLIC_SUPABASE_URL` + Publishable/anon (not Secret) → Redeploy.

## Also on main
Dashboard project cards / timeline zoom merges.

## Next
Overlay parity על main ב־`4b55d2e` ו-Graphify sync ב־`1f6039a`. מקומית Inspector clip trim/enabled/volume, subtitle edit/retime, keyboard delete ו-timeline reorder עוברים דרך CommandBus. Clip opacity נשאר פער מפורש: נשמר במודל אך לא ב-Preview/Export. tsc, 202/202 tests, production build ו־Graphify update (1592/3389) עברו; להשלים commit+push, ואז media.add parity או opacity render path. Package C רק אחרי login עובד.
