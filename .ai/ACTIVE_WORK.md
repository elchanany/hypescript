# ACTIVE_WORK.md

## 2026-09-08 — Timeline narration free-placement + CapCut image snap
- **Branch:** `cursor/timeline-audio-snap-placement-aec5`
- **Latest commit:** (see git log on branch)
- **Status:** Fixed and browser-verified; PR open
- **Bug:** Dragging narration/audio looked like it “snapped back” to t=0; no clear CapCut-style lock to an image/layer edge underneath.
- **Root cause:** Audio lane rendered `dedicatedAudio.filter(!gap)` then `assembledStart` on the gapless list → every free-placed narration packed to the start.
- **Fix:** Keep gaps in audio display; raise overlay/image edge snap priority; yellow guide only on magnetic lock; highlight aligned clip/layer; light overlay row when audio locks to it.
- **Verification:** Vitest freePlacement+time (16); Playwright demo metrics `stayedMoved: true` (delta ~267px); video shows yellow guide + narration stays after drop.
- **Continuation:** If users still want audio *track reorder* above a video still (not just temporal align), that’s a separate track-order UX pass.

