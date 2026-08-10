# ACTIVE_WORK.md

## 2026-08-10 — local organization/brand kit (main 7ab67e7)

- `/settings/brand` provides local-only IndexedDB organization/brand kits: org/name, tagline, writing guidelines, a normalized color picker palette, and logo/reference images with safe object URL cleanup; an active kit is selectable across projects.
- Agent `get_brand_kit` returns a binary-free summary only (no blobs reach the LLM). `use_brand_asset` imports the Blob through the explicit browser-only `EditorApi.addMediaAsset` boundary (not JSON CommandBus), then `logo_overlay` reuses the existing safe `overlay.addImage` path; `reference_media` imports only. Missing assets are never fabricated; duplicate imports are avoided.
- No cloud sync or new service; production Supabase auth key still broken.
- Verification: web 50 files / 342 tests pass, `tsc` clean; production build passed in the rebased isolated worktree including `/settings/brand` (a later primary invocation reached Next build start but timed out after 20m due environment/process contention — not claimed as passed); native render integration still `durationDelta=0`/`audioDrift=0`; graphify 1806 nodes / 4082 edges. `npm audit`: 8 existing vulnerabilities (3 moderate, 4 high, 1 critical), no audit fix applied.
- Next: browser E2E the brand UI / `use_brand_asset` and composited capture with real media; then complete the high-level CTA workflow (narration + image + popup) using existing generated media/audio/overlay boundaries and brand context, without fabricating assets.

## 2026-08-10 — gapless tight-cut pipeline

- Replaced transcript-only tight cutting with a hybrid: word timestamps protect speech, 20ms RMS windows place cuts in measured quiet valleys, and explicit provider `audio_event` still forces removal without inventing semantic labels from dB.
- Tight defaults are now 0.14s gap / 0.025s handles in web and local. Automatic results are repaired around whole spoken words and fail closed unless QA reports zero repeated source time, zero clipped words and zero invalid clips.
- Preview now keeps two media elements, preloads/seeks the next clip off-screen, swaps at the boundary, and observes playback each animation frame instead of relying on coarse `timeupdate` events.
- Export and local render use six-decimal half-open source ends and never extend a trim to the rounded CFR endpoint.
- Verification: web 47 files / 300 tests; local 9 tests; production build passed; native 20-cut content test proved 0 duration/audio drift, one-frame packet cadence, no silent joins, and the correct next-source tone after every join. Browser UI was auth-blocked, so real-session listening remains the acceptance step.

## 2026-08-09 — composited timeline frame capture (export-parity, opt-in)

- `main` ab2dcf1 + 58f39c6: `capture_frame` can now render an export-parity composited frame of the edited timeline. Explicit `timeline=true` (with an edited timeline) selects it; `timeline=false`, an explicit `source`, or an omitted `timeline` always stay on the fast raw source frame.
- Composited path reuses the export renderEDL flow: multi-track flatten/cutaway, active overlays, current styled caption, clip effects and export resolution; gaps and disabled clips render black. It renders a micro-segment, so it is slower by design and opt-in only.
- SYSTEM_PROMPT: after significant visual edits (overlay, cutaway, captions, color/flip/fades), verify once with `capture_frame(timeline=true)` at the changed point; no redundant or repeated captures.
- Verification: 47 files / 296 tests, `tsc` clean, production build passes; native export integration `durationDelta=0`/`audioDrift=0`; `graphify update .` → 1722 nodes / 3847 edges. Browser-live ffmpeg.wasm capture not yet manually E2E tested.
- Next product package (user-approved): local-first organization/brand kit — logos, colors picker, writing guidelines, reference images — selectable across projects and exposed safely to the agent, reusing the reliable mixed-media/logo agent workflow. IndexedDB first; cloud sync waits for working auth.

## 2026-08-09 — stable overlay identity, alpha preview and safe logo geometry

- Fixed the real multi-overlay Agent race: `add_image_overlay` is now one atomic command and never performs a stale second update against “the last overlay”. UI-facing EditorApi refs also advance synchronously across same-tick Agent commands.
- `list_overlays` exposes stable IDs; update/delete prefer `overlay_id` plus `expected_source`, reject mismatched assets, and refuse locked overlays. Agent rules prohibit touching an already-arranged end card or narration unless explicitly requested.
- Image natural dimensions are loaded before Agent placement. Shared geometry preserves aspect ratio, adds `fit_canvas`, and clamps UI/Agent move/resize inside the canvas.
- Removed the Preview checkerboard from transparent PNG overlays; alpha now reveals the underlying video, matching Export.
- Full verification: 46 files / 259 tests and production build pass. Browser QA confirmed transparent computed background, 3.5%/4.5% safe logo edges, preserved aspect ratio, and that adding a second image leaves the prior overlay geometry unchanged.

## 2026-08-08 — explicit logo workflow + designed cards

- Image insertion now has two named actions: full-frame timeline image versus timed logo/overlay. Image double-click chooses overlay; each media card also exposes both actions and a direct Agent mention button.
- An image accidentally inserted as a full-frame clip can be converted from Inspector into a small top-corner overlay without rebuilding the edit.
- Canvas overlays now have anchored corner resize, aspect-ratio preservation for images, layer badges, X/Y/W/H, quick top corners, corner radius, z-order and fade controls. Preview and FFmpeg Export share rounded images, text card borders/backgrounds/multiline content and overlay fades.
- The Agent resolves stable `@media:<id>` references, offers logo presets and source/speaker/dedication card presets, controls geometry/style/z/fades, and reports exact measured overlay state through `list_overlays`.
- Verification: 46 files / 256 tests pass, production build passes, and Browser QA confirmed styled dedication values, separate image actions, stable direct Agent mention and one-click 16%-width top-left logo placement. Final Graphify update and push remain.

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
Browser E2E the brand UI / `use_brand_asset` and composited capture with real media, then complete the high-level CTA workflow (narration + image + popup) using existing generated media/audio/overlay boundaries and brand context, without fabricating assets.

## Branch
`main`

## Latest package
Local organization/brand kit (IndexedDB, binary-free agent summary, browser-only Blob import via `EditorApi.addMediaAsset`, safe logo overlay reuse).

## Status
Merged: client-brief tight cutting, overlay safety, logo/card parity, export-parity composited frame capture (opt-in `timeline=true`), and the local organization/brand kit. Web 50 files / 342 tests, `tsc` clean; production build passed in the rebased isolated worktree including `/settings/brand` (primary invocation timed out after 20m — not claimed); native export `durationDelta=0`/`audioDrift=0`; graphify 1806 nodes / 4082 edges. Brand UI and composited capture are browser-untested with real media.

## Exact continuation point
Browser E2E the brand UI / `use_brand_asset` and composited capture with real media; then complete the high-level CTA workflow (narration + image + popup) using existing generated media/audio/overlay boundaries and brand context, without fabricating assets. Brand blobs stay local IndexedDB and outside LLM/JSON command history; only summaries reach the LLM, binary import crosses the explicit browser-only EditorApi boundary, then state changes use commands. No new cloud service while the production Supabase auth key is broken; no Auth/Supabase changes without explicit permission.
