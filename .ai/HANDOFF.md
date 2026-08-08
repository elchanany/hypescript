# Goal
Build an honest per-time-span media understanding foundation: speech/audio events and gaps first, energy evidence later. Preserve script-as-ground-truth timing alignment and improve Hebrew caption grouping. Do not claim semantic cough/breath/laugh understanding beyond provider `audio_event` evidence.

# Current State
- main ב־`359b301`; audio fades landed in `0d7215b` and Graphify synced.
- Dirty visual-fade package: normalized linear fade-to/from-black spans Model, Inspector, Undo/Redo, CommandBus, Agent, rAF Preview opacity and FFmpeg `fade`. Web 45 files/241 tests, type-check/build and native render pass. Dedicated browser upload failed in the in-app chooser, so visual browser QA is pending.
- v0.3.0: CommandBus + Query API PARTIAL; CapCut-class editor foundations on main.

# Active Files
- Continuity: `.ai/ACTIVE_WORK.md`, `.ai/DECISIONS.md`, `docs/GAP_MAP.md`, `.ai/HANDOFF.md`.
- Current package: the same Preview/Inspector/model/commands/tracks/render/agent seam, extended with `visualFadeIn`/`visualFadeOut`.
- Next package edge: another local P3 capability with Preview+Export; transitions/keyframes remain larger unfinished systems. Package C remains blocked on working login.

# Changes Made
- `d3bc7b1`: `scriptToClips` clamps tolerated ASR overlap (≤~150ms) to the previous clip end and skips remainders shorter than `minClipSec`; `snapSpeechToWords` re-merges touching/overlapping same-source segments after snap+pad — no double-played boundary syllables.
- `7c61179`: `setClips` → `clip.replaceAll`; `setSubs` → `subtitle.replaceAll`; atomic collection-validated commits across bulk agent tools.
- `071ed3d`: semantic package preserves only direct evidence; transcript absence never becomes silence and dB evidence no longer claims breath/cough/chair semantics.
- `75337e7`: soft budget caption orphans rebalance from 3+1 to 2+2 when both sides fit; hard pause/punctuation boundaries never rebalance.
- `b11ab15`: contiguous equal-level energy windows merge with duration-weighted dB; source discontinuities, edit gaps and different relative levels remain separate.
- `b6ba1fa`: `ToolRunResult = string | ToolOutcome`; artifacts never enter JSON/history and identical Blob references are de-duplicated per tool completion.
- `2dd41c8`: contrast 0.5..2 and saturation 0..3; defaults 1, split inheritance, CSS `contrast/saturate`, FFmpeg `eq=contrast:saturation` before yuv conversion.
- `c60cfb2`: shared id/Hebrew-label lookup and exact value matching; `custom` is display-only and cannot be selected as a fake preset.
- `60c5357`: `updateClipFromInspector` now dispatches contrast/saturation through the existing `clip.setColorAdjustments` CommandBus command instead of silently dropping those patches.
- `2f3d0ed`: active per-clip gain is applied in Preview through Web Audio; the same normalized clip volume feeds FFmpeg Export.
- `0d7215b`: combined audio fade lengths normalize to clip duration; Preview gain updates every animation frame; export uses `afade`; track flattening preserves fade/color metadata.
- Dirty visual fades: the same bounded edge factor drives Preview opacity and FFmpeg fade-to-black; native render is proven, dedicated browser upload is pending after chooser timeouts.
- Docs updated: D-010 decision added; GAP_MAP notes bug fix + missing/partial semantic understanding; HANDOFF/ACTIVE_WORK refreshed.

# Failed Attempts
- Double-played boundary syllables at generated cut edges were reproduced and fixed in `d3bc7b1`. Global cut normalization was rejected (D-010) so intentional manual repeats stay possible.

# Tests and Verification
- 45 test files / 241 tests — passed; production build/type-check pass.
- `npx tsc --noEmit` clean; production Next build passed.
- Native render integration: `durationDelta=0`, `audioDrift=0`.
- Browser QA: upload/select real MP4, select monochrome, observe Preview CSS filter and Inspector values, then reset to neutral.
- Fade browser QA: 1.0s/0.5s values, gain `0.000` at start and `0.841` at 0.849s, Undo/Redo 0↔0.5s; native 20-cut render includes real `afade` with zero drift.
- Graphify update at `d3bc7b1`: 1596 nodes / 3403 edges.

# Open Risks
- **Auth**: bad production Supabase publishable/anon key → `Invalid API key` on Vercel; fix env + redeploy (only auth risk).
- Semantic event understanding (cough/breath/laugh) is missing/partial — must not overclaim beyond provider `audio_event`.
- PiP/alpha between tracks stays a future compositor; Query API now includes active clip/source/gap/overlay/caption context but broader generated-media I/O remains.
- Algorithm changes must land in both `web/lib` and `local/hypescript` (RULES §3).

# Exact Next Steps
1. Graphify + commit/push bounded visual fades.
2. Retry dedicated visual browser QA; then select the next local P3 effect/template.
3. Package C only after working login.
4. Query API audit + media-generated I/O boundary later; Package C only after working login.
