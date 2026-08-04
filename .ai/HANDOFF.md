# HANDOFF

## main tip
`162847e` — fix OAuth login bounce

## Auth fix
Callback no longer redirects without a real session. PKCE exchange + waitForSession.
If still fails in production: Supabase Redirect URLs must include `/auth/callback` for the live domain + Redeploy.

## Next
Package C — Usage foundation (rate cards, credit ledger, trial grant, reservations).
