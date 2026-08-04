# HANDOFF

## main (after merge)
Fix PKCE with `@supabase/ssr` + server `/auth/callback` route.

## Auth
- Browser: `createBrowserClient` (cookie PKCE verifier)
- Callback: Route Handler exchanges code server-side
- Continue page confirms session then routes to onboarding/dashboard
- Middleware refreshes cookies

## Next
Package C — Usage foundation.
