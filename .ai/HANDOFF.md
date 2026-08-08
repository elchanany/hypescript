# Goal
Make the agent reliably turn a Hebrew client brief into a tight, script-grounded promotional cut: no repeated source time, no avoidable pauses, real styled captions, correct fade sequencing, and deferred missing assets requested only when their stage is reached.

# Current State
- `main` at `58f39c6`; composited timeline frame capture is merged and opt-in.
- Client-brief tight cutting, overlay safety and logo/card packages are merged; current focus is agent visual verification and the approved local-first organization/brand kit.
- v0.3.0 CommandBus + Query API remain PARTIAL; no Auth/Supabase changes.

# Active Files
- `web/lib/render/timelineFrame.ts` + `timelineFrame.test.ts`: export-parity composited micro-EDL frame capture.
- `web/lib/agent/tools.ts` + `toolParity.test.ts`: `capture_frame` opt-in mode decision and SYSTEM_PROMPT verification rule.
- `web/lib/ffmpeg.ts`: `renderTimelineFrame` browser implementation.
- Continuity: `.ai/ACTIVE_WORK.md`, `.ai/DECISIONS.md`, `docs/GAP_MAP.md`.

# Changes Made
- `capture_frame` adds an export-parity composited mode: explicit `timeline=true` renders the edited timeline at export resolution through the existing renderEDL path — multi-track flatten/cutaway, active overlays, current styled caption, clip effects (opacity/contrast/saturation/flip, baked visual-fade level); gaps and disabled clips render black. Raw source capture stays the fast default; `timeline=false`/`source`/omitted never composite.
- SYSTEM_PROMPT: after a significant visual edit (overlay, cutaway, captions, color/flip/fades), verify once with `capture_frame(timeline=true)` at the changed point; no redundant or repeated captures (micro-render is expensive).
- Earlier merged packages: tight word-timestamp cutting with `normalizeGeneratedCuts`, logo/full-frame split with stable overlay IDs and styled source/speaker/dedication cards (details in `.ai/ACTIVE_WORK.md`).

# Failed Attempts
- First focused test command used the repository root although npm lives under `web/`, and Python lacked `PYTHONPATH=local`. Corrected commands passed; this was command context, not a product defect.

# Tests and Verification
- Web: 47 files / 296 tests passed.
- `npx tsc --noEmit` clean; production Next build passed.
- Native FFmpeg export integration: `durationDelta=0`, `audioDriftSec=0`.
- `graphify update .`: 1722 nodes / 3847 edges.

# Open Risks
- Browser-live ffmpeg.wasm composited capture has not been manually E2E tested; it is slower by design and opt-in only.
- Without a real lecture file in the repository, acoustic/client acceptance is not yet browser-verified. Unit tests prove timing invariants, not perceived edit quality.
- “Breath” is only semantic when the transcription provider emits `audio_event`; otherwise the engine removes non-speech gaps based on word timing. dB never identifies sound type.
- Extremely inaccurate word timestamps can still require manual trim or a better STT model.
- Auth production key remains broken; no new cloud service (organization/brand cloud sync waits for working auth).

# Exact Next Steps
1. Build the approved local-first organization/brand kit: logos, colors picker, writing guidelines and reference images, selectable across projects and exposed safely to the agent; reuse the reliable mixed-media/logo agent workflow. IndexedDB first; cloud sync waits for working auth.
2. Browser E2E the composited capture once real media is available (raw default, opt-in `timeline=true`).
3. No new cloud service while the production Supabase auth key is broken; no Auth/Supabase changes without explicit permission.
