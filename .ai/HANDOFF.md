# Goal
Timeline narration free-placement + CapCut-style image snap is on `main` after merge.

# Current State
- **Merged:** PR #34 → `main` @ `3844862` (2026-09-08), no conflicts (`MERGEABLE` → merge commit).
- **Fix on main:** Audio lane keeps gaps so free-placed narration stays put; magnetic snap prefers overlay/image edges; yellow guide only while locked; aligned clip/layer highlight.
- **Files:** `web/components/Timeline.tsx`, `web/app/globals.css`, `web/lib/editor/freePlacement.test.ts`, `web/lib/editor/time.test.ts`, `docs/GAP_MAP.md`.
- **Production:** Vercel deploys from `main` automatically after this merge (agent did not run a separate deploy).

# Verification (pre-merge)
- Vitest 28/28 (`freePlacement`/`time`/`tracks`); `tsc` clean.
- Playwright: `stayedMoved: true`; yellow guide on still edge.

# Exact Next Steps
1. Confirm production Vercel deployment is Ready for `3844862`.
2. Hard-refresh the live editor and re-test narration drag above an image.
3. Optional later: audio *track-row* reorder (separate from temporal align).

# Open Risks
- CDN/browser cache may delay seeing the fix for a short time after deploy.
- Cloud project create can still 503 in some environments (unrelated).
