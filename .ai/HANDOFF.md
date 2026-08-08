# HANDOFF

## Auth
Production `Invalid API key` = bad Supabase public key on Vercel.
Code sanitizes quotes, rejects secret/service_role as public key, `/api/config` exposes safe diagnostics.

## User action
Vercel → `NEXT_PUBLIC_SUPABASE_URL` + Publishable/anon (not Secret) → Redeploy.

## Also on main
Dashboard project cards / timeline zoom merges.

## Next
AG-2 dynamic Clip/Gap menus על main ב־`7739126`. מקומית נוסף Track context-menu דינמי: lock/mute/height/remove-safe נגזרים מסוג ומצב הרצועה ומה-Registry; rename/reorder לא מזויפים כי דורשים input/variant. tsc, 193/193 tests, production build ו־Graphify update עברו. להשלים commit+push; הבא Caption/Asset context-menu audit. Package C רק אחרי login עובד.
