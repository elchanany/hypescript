# HANDOFF

## Auth status
Production shows `Invalid API key` — env on Vercel has a bad/mismatched Supabase key.
Code now sanitizes quotes, rejects secret/service_role as public key, and surfaces diagnostics via `/api/config`.

## User action required
Vercel → set correct Publishable/anon key + URL → Redeploy.

## Next
Package C after login works.
