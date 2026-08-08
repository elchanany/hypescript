# HANDOFF

## Auth
Production `Invalid API key` = bad Supabase public key on Vercel.
Code sanitizes quotes, rejects secret/service_role as public key, `/api/config` exposes safe diagnostics.

## User action
Vercel → `NEXT_PUBLIC_SUPABASE_URL` + Publishable/anon (not Secret) → Redeploy.

## Also on main
Dashboard project cards / timeline zoom merges.

## Next
AG-4 retry/duration כבר על main ב־`0e4b30d`. מקומית נוספה token usage normalization לכל ארבעת הספקים + runtime event + session total בצ'אט; אין כסף בלי rate card. אומת tsc + 181/181 + build + Graphify. אחרי push: checkpoints. Package C רק אחרי login עובד.
