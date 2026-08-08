# HANDOFF

## Auth
Production `Invalid API key` = bad Supabase public key on Vercel.
Code sanitizes quotes, rejects secret/service_role as public key, `/api/config` exposes safe diagnostics.

## User action
Vercel → `NEXT_PUBLIC_SUPABASE_URL` + Publishable/anon (not Secret) → Redeploy.

## Also on main
Dashboard project cards / timeline zoom merges.

## Next
PR-1 honest provider status על main ב־`c774c29`. מקומית Registry מסווג billing risk וקריאות LLM/STT/TTS נחסמות עד אישור מפורש מקומי לפי ספק; Chat מציג approval card והגדרות מאפשרות revoke. tsc, 189/189 tests, production build ו־Graphify update עברו. להשלים commit+push; הבא audit live health-check מול AG-2 dynamic surfaces. Package C רק אחרי login עובד.
