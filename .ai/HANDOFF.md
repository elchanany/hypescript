# HANDOFF

## Auth
Production `Invalid API key` = bad Supabase public key on Vercel.
Code sanitizes quotes, rejects secret/service_role as public key, `/api/config` exposes safe diagnostics.

## User action
Vercel → `NEXT_PUBLIC_SUPABASE_URL` + Publishable/anon (not Secret) → Redeploy.

## Also on main
Dashboard project cards / timeline zoom merges.

## Next
AG-2 contracts כבר על main עד `7450f59`. מקומית AG-4: exact tool retry עם אותם args, history תקין, duration בכרטיס, וכל כלי track הוגדרו mutating; אומת tsc + 177/177 + build + Graphify. אחרי push: checkpoints או cost telemetry. Package C רק אחרי login עובד.
