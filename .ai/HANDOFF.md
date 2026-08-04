# HANDOFF — Package A + Branding

## Branch
`cursor/saas-pkg-a-branding-505e` (base: `main`)

## Verified state
- Brand assets under `web/public/brand/` (sources + derivatives + favicon/PWA/OG)
- `BrandLogo` + `web/lib/brand/assets.ts` as single source of truth
- Theme: System/Dark/Light via `ThemeProvider` + no-flash script in layout
- Package A migration: `supabase/migrations/20260804170000_pkg_a_foundation.sql`
- Auth UI: login (Google/password/magic/reset), onboarding, legal stubs, bootstrap API
- Middleware soft-gates editor when Auth configured and guest disabled
- Docs: `docs/BRAND_GUIDELINES.md`, SETUP_AUTH + SECURITY_MODEL updated

## Not done (by design for Package A stop)
- MFA, session revoke UI, Admin dashboard, Ledger/Trial grants, Billing, BYOK
- Migration not applied to live Supabase from this environment (no production push)
- Do **not** merge to `main` without explicit approval

## Exact next step
After Package A approval: execute Package B (Dashboard projects wizard Local/Cloud/Hybrid).
