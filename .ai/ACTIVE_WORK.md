# ACTIVE_WORK.md

## 2026-08-08 — mixed media + direct canvas UI package

- Preview now advances through full-frame image, video, gap and audio-only timelines; a dedicated audio track is synchronized during Preview and mixed during Export.
- `clip.add` accepts image clips on video tracks and audio clips on the audio track, including exact `timeline_start` insertion with split/gap behavior. Dragging an image onto a video lane therefore keeps it on that lane.
- Captions can be selected, edited and vertically repositioned on the canvas. Concurrent cues stack and receive an explicit overlap badge/style.
- Editor and Preview right-click use Hypescript context menus; shared buttons receive useful tooltips, including dynamically mounted controls.
- Text overlays support background + radius in Preview and Export. UI and Agent expose a real `source_popup` opening-title preset.
- Agent render includes the standalone audio track and returns its existing downloadable video/SRT/image/audio artifact cards.
- Verification: 45 test files / 251 tests passed before new regressions; focused new tests 37/37 passed; production build passed; Browser QA confirmed the popup control/tooltips and custom Preview context menu.
- Next: run final full suite after documentation, `graphify update .`, commit/push product package, then graph-only sync commit if needed.

## Current task
Agent/client-brief reliability: tight Hebrew speech cutting, zero repeated source-time boundaries, caption styling, and deferred-asset sequencing.

## Branch
`main`

## Latest commit
`f2442e3` — chore(graphify): sync clip flip controls

## Status
Dirty agent/core package replaces dB-first silence cutting with word-timestamp `tight` pacing (0.22s gap, 0.04s handles), removes explicit audio events/fillers, normalizes every automatic same-source/track boundary, and adds real Agent caption-style control. SYSTEM_PROMPT compiles client briefs into spoken keep text, edit instructions, deferred CTA assets, boundary verification and final fade. Web 45 files/251 tests, type-check and production build pass; local 8 tests pass.

## Exact continuation point
Run Graphify update, commit/push the agent/core package, then validate the workflow against a real uploaded lecture when source media is available. Do not claim acoustic breath classification without provider `audio_event`; no Supabase/Auth changes without explicit permission.
