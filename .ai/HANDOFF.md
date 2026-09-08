# Goal
Keep the CapCut-style timeline trustworthy for Hebrew lesson editing — especially free placement of narration above images.

# Current State
- 2026-09-08: **Timeline narration no longer snaps back; CapCut-style image snap restored**
  1. **Root cause:** `Timeline.tsx` stripped gap spacers from the dedicated audio lane before layout, so `assembledStart` always drew free-placed narration at t=0 even when `moveClipAtTimeline` stored the correct time with leading gaps.
  2. **Fix:** Audio lane keeps gaps (same model as video). Magnetic snap prefers named overlay/image edges (priority 8), shows the yellow guide only while locked, and highlights the aligned clip/layer; dragging audio also lights the overlay row it locked onto.
  3. **Verification:** `freePlacement` + `time` tests green; Playwright drag demo left narration ~267px from origin (`stayedMoved: true`); screen recording shows yellow guide when aligning to `still-test` end and no snap-back after drop.
- Prior export/WASM/landing work remains as previously documented on `main`.

# Active Files
- `web/components/Timeline.tsx` — audio gap display, snap guide/highlights
- `web/app/globals.css` — `.snap-aligned` styling
- `web/lib/editor/freePlacement.test.ts`, `web/lib/editor/time.test.ts` — regressions

# Exact Next Steps
1. Merge PR for timeline audio snap after human review.
2. Optional: track-reorder UX if users need the audio *row* above a video still (distinct from temporal align).

# Open Risks
- Cloud project create still 503 in this environment without mocked `/api/cloud/projects` (unrelated to timeline drag).
- Safe-area guides on canvas remain PARTIAL per GAP_MAP.
