# ACTIVE_WORK.md

## 2026-09-08 — Timeline narration free-placement + CapCut image snap
- **Branch:** `cursor/timeline-audio-snap-placement-aec5`
- **Latest commit:** `97bad5f` (continuity); fix commits `5166ae0` / `370b5a9`
- **PR:** https://github.com/elchanany/hypescript/pull/34 — OPEN / ready / MERGEABLE; **not merged to `main`**
- **Preview:** https://hypescript-git-cursor-timeline-audi-385fc3-elchanan-ys-projects.vercel.app
- **Status:** Code + docs on branch; continuity maintenance pass completed; awaiting merge for production
- **Bug:** Narration/audio drag appeared to snap back to t=0; weak CapCut-style lock to image/layer edges
- **Root cause:** Audio lane stripped gaps before layout → `assembledStart` packed clips to start
- **Fix:** Keep audio gaps; overlay/image snap priority 8; yellow guide only on lock; `.snap-aligned` + overlay-row highlight
- **Verification (this pass):** Vitest 28/28 (`freePlacement`/`time`/`tracks`); `tsc --noEmit` clean; prior Playwright `stayedMoved: true`
- **Graphify:** `graphify update .` → `.graphify/` (ignored); tracked `graphify-out` untouched
- **Continuation:** Merge PR #34 for live deploy; optional track-reorder UX is out of scope here
- **Non-change:** No production deploy; no PROJECT_STATE/DECISIONS update (bugfix of existing timeline magnet/free-placement)
