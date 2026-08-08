# HANDOFF

## Auth
Production `Invalid API key` = bad Supabase public key on Vercel.
Code sanitizes quotes, rejects secret/service_role as public key, `/api/config` exposes safe diagnostics.

## User action
Vercel → `NEXT_PUBLIC_SUPABASE_URL` + Publishable/anon (not Secret) → Redeploy.

## Also on main
Dashboard project cards / timeline zoom merges.

## Next
AG-2 subtitle completion על main ב־`b279664`. מקומית overlay add/update/delete של הסוכן וה-UI עוברים דרך CommandBus; preview drag נשאר transaction רציף ל-Undo יחיד. TX-1 animation נשאר חסר ביושר כי export caption PNG סטטי. tsc, 202/202 tests, production build ו־Graphify update (1592/3391) עברו; להשלים commit+push, ואז audit יתר פעולות UI ו-media.add מול export-animation design. Package C רק אחרי login עובד.
