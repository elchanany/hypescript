# HANDOFF

## Auth
Production `Invalid API key` = bad Supabase public key on Vercel.
Code sanitizes quotes, rejects secret/service_role as public key, `/api/config` exposes safe diagnostics.

## User action
Vercel → `NEXT_PUBLIC_SUPABASE_URL` + Publishable/anon (not Secret) → Redeploy.

## Also on main
Dashboard project cards / timeline zoom merges.

## Next
AG-2: clip/track parity כבר על main עד `96f53e9`. מקומית registry קיבל input/result schemas, permissions, contexts, agentCallable, arg validation ו-listAgentCommands; אומת tsc + 175/175 + build + Graphify. אחרי push: dynamic command surfaces או AG-4 לפי audit. Package C רק אחרי login עובד.
