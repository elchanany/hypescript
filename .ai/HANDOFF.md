# HANDOFF

## Auth
Production `Invalid API key` = bad Supabase public key on Vercel.
Code sanitizes quotes, rejects secret/service_role as public key, `/api/config` exposes safe diagnostics.

## User action
Vercel → `NEXT_PUBLIC_SUPABASE_URL` + Publishable/anon (not Secret) → Redeploy.

## Also on main
Dashboard project cards / timeline zoom merges.

## Next
AG-2 subtitle parity על main ב־`dccf792`. מקומית media.remove עבר ל-CommandBus fail-closed: asset בשימוש אינו מוסר; asset פנוי מוסר ואז URL מבוטל. Asset context-menu מקבל remove מה-Registry ושומר add adapter למסלולי image/video השונים. tsc, 198/198 tests, production build ו־Graphify update עברו. להשלים commit+push; הבא AG-2 remaining UI מול TX-1 animation audit. Package C רק אחרי login עובד.
