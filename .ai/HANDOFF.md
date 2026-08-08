# Goal
Make the agent reliably turn a Hebrew client brief into a tight, script-grounded promotional cut: no repeated source time, no avoidable pauses, real styled captions, correct fade sequencing, and deferred missing assets requested only when their stage is reached.

## 2026-08-08 continuation

The mixed-media/UI parity package is implemented but not yet committed at this note: full-frame images and standalone audio are first-class timeline clips, Preview and Export share standalone-audio fades/volume, captions edit/move directly on canvas, overlaps are unmistakable, custom right-click covers blank editor/Preview surfaces, and tooltips cover buttons mounted later. The Agent now distinguishes a full-frame image from a logo overlay, supports exact `timeline_start`, generates the real `source_popup` preset, and renders the audio track. Finish with full tests/build, Graphify update/query, direct `main` push, then Graphify-only push if output changes.

# Current State
- `main` at `f2442e3`; flip package and Graphify sync are pushed.
- Dirty client-brief package spans word-timestamp tight cutting, explicit event/filler boundaries, generated-cut normalization after script and EDL intersection, Agent caption styling, and strict brief sequencing.
- v0.3.0 CommandBus + Query API remain PARTIAL; no Auth/Supabase changes.

# Active Files
- `web/lib/editor/clipFilter.ts` + tests: generated-cut invariant and tight word islands.
- `web/lib/agent/tools.ts` + `toolParity.test.ts`: tool behavior, caption styling and agent operating rules.
- `web/lib/editing.ts` and `local/hypescript/editing.py`: synchronized explicit audio-event boundary behavior.
- `local/hypescript/cli.py`, `gui.py`, README and `local/tests/test_editing.py`: tight defaults and parity proof.
- Continuity: `.ai/ACTIVE_WORK.md`, `.ai/DECISIONS.md`, `docs/GAP_MAP.md`.

# Changes Made
- `normalizeGeneratedCuts`: adjacent machine-generated clips on the same source/track may touch but cannot replay the same source time. A 29.8 end followed by 29.7 start becomes 29.8; covered/tiny remainders drop. Manual repeats and cross-track overlap remain legal.
- `tightSpeechFromWords`: default 0.22s gap and 0.04s handles for promotional pacing. Explicit provider `audio_event` forces a removable boundary.
- `remove_silence`: word timestamps first; dB only as a no-transcript fallback. Tight mode converts default fillers to removable boundaries and stays within an existing script selection.
- `set_caption_style`: Agent can now apply real project caption style through CommandBus, shared by Preview and Export.
- Agent brief compiler rules distinguish spoken keep text, edit instructions, new CTA text and deferred assets. It must verify clip boundaries, apply the final spoken clip fade, and request later assets only when their stage is reached.
- local CLI/GUI defaults changed from 0.4/0.1 to 0.22/0.04; explicit audio events are excluded and split speech in both cores.

# Failed Attempts
- First focused test command used the repository root although npm lives under `web/`, and Python lacked `PYTHONPATH=local`. Corrected commands passed; this was command context, not a product defect.

# Tests and Verification
- Web: 45 files / 251 tests passed.
- `npx tsc --noEmit` passed.
- Local: 8 unittest tests passed with `PYTHONPATH=local`.
- Existing native FFmpeg integration still reports 20 cuts, `durationDelta=0`, `audioDriftSec=0`, 312/312 frames and max video gap 0.0333s.
- Production Next build passed after the package and documentation changes.

# Open Risks
- Without a real lecture file in the repository, acoustic/client acceptance is not yet browser-verified. Unit tests prove timing invariants, not perceived edit quality.
- “Breath” is only semantic when the transcription provider emits `audio_event`; otherwise the engine removes non-speech gaps based on word timing. dB never identifies sound type.
- Extremely inaccurate word timestamps can still require manual trim or a better STT model.
- Auth production key remains a separate known risk and is outside current permission.

# Exact Next Steps
1. `graphify update .`, commit/push product changes, then commit/push Graphify hook output if dirtied.
2. With real lecture media: Act-mode acceptance test of script → tight cut → remap → subtitles/style → boundary audit → fade → ask for outro assets.
3. Continue improving agent/core behavior before peripheral effects; no Auth/Supabase without explicit permission.
