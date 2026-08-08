# HANDOFF

## Auth
Production `Invalid API key` = bad Supabase public key on Vercel.
Code sanitizes quotes, rejects secret/service_role as public key, `/api/config` exposes safe diagnostics.

## User action
Vercel → `NEXT_PUBLIC_SUPABASE_URL` + Publishable/anon (not Secret) → Redeploy.

## Also on main
Dashboard project cards / timeline zoom merges.

## Next
AG-2 safe media removal על main ב־`b5af02d`. מקומית subtitle retime/clear וכל caption-style controls עוברים דרך CommandBus; TX-1 animation נשאר חסר ביושר כי export caption PNG סטטי. tsc, 200/200 tests, production build ו־Graphify update עברו. להשלים commit+push; הבא overlay mutation parity מול export-animation design. Package C רק אחרי login עובד.
