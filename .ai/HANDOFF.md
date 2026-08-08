# HANDOFF

## Auth
Production `Invalid API key` = bad Supabase public key on Vercel.
Code sanitizes quotes, rejects secret/service_role as public key, `/api/config` exposes safe diagnostics.

## User action
Vercel → `NEXT_PUBLIC_SUPABASE_URL` + Publishable/anon (not Secret) → Redeploy.

## Also on main
Dashboard project cards / timeline zoom merges.

## Next
AG-2: clip state (`86348eb`) ו-track rename/lock/mute (`a234152`) כבר על main. מקומית נוספו track height/reorder דרך CommandBus ל-UI+Agent ובדיקת parity; אומת tsc + 173/173 + build + Graphify. אחרי push: registry metadata. Package C רק אחרי login עובד.
