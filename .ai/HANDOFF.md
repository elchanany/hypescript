# Goal
Build an honest per-time-span media understanding foundation: speech/audio events and gaps first, energy evidence later. Preserve script-as-ground-truth timing alignment and improve Hebrew caption grouping. Do not claim semantic cough/breath/laugh understanding beyond provider `audio_event` evidence.

# Current State
- main ב־`afeb66e`; AG-2 artifact boundary landed ב־`b6ba1fa` and Graphify synced.
- Dirty P3 color package: optional clip contrast/saturation flow through Inspector/useEditor history, CommandBus, agent tool, CSS preview and FFmpeg `eq` export. Split inherits adjustments and values clamp to shared ranges. Web 43 files/225 tests, type-check/build and native 20-cut render pass; Graphify/push pending. No browser visual QA yet.
- v0.3.0: CommandBus + Query API PARTIAL; CapCut-class editor foundations on main.

# Active Files
- Continuity: `.ai/ACTIVE_WORK.md`, `.ai/DECISIONS.md`, `docs/GAP_MAP.md`, `.ai/HANDOFF.md`.
- Current package: `web/lib/editor/model.ts`, commands, `InspectorPanel.tsx`, `VideoPreview.tsx`, `web/lib/render/graph.ts`, agent tool and tests.
- Next package edge: another local P3 capability with Preview+Export; transitions/keyframes remain larger unfinished systems. Package C remains blocked on working login.

# Changes Made
- `d3bc7b1`: `scriptToClips` clamps tolerated ASR overlap (≤~150ms) to the previous clip end and skips remainders shorter than `minClipSec`; `snapSpeechToWords` re-merges touching/overlapping same-source segments after snap+pad — no double-played boundary syllables.
- `7c61179`: `setClips` → `clip.replaceAll`; `setSubs` → `subtitle.replaceAll`; atomic collection-validated commits across bulk agent tools.
- `071ed3d`: semantic package preserves only direct evidence; transcript absence never becomes silence and dB evidence no longer claims breath/cough/chair semantics.
- `75337e7`: soft budget caption orphans rebalance from 3+1 to 2+2 when both sides fit; hard pause/punctuation boundaries never rebalance.
- `b11ab15`: contiguous equal-level energy windows merge with duration-weighted dB; source discontinuities, edit gaps and different relative levels remain separate.
- `b6ba1fa`: `ToolRunResult = string | ToolOutcome`; artifacts never enter JSON/history and identical Blob references are de-duplicated per tool completion.
- Dirty color: contrast 0.5..2 and saturation 0..3; defaults 1, split inheritance, CSS `contrast/saturate`, FFmpeg `eq=contrast:saturation` before yuv conversion.
- Docs updated: D-010 decision added; GAP_MAP notes bug fix + missing/partial semantic understanding; HANDOFF/ACTIVE_WORK refreshed.

# Failed Attempts
- Double-played boundary syllables at generated cut edges were reproduced and fixed in `d3bc7b1`. Global cut normalization was rejected (D-010) so intentional manual repeats stay possible.

# Tests and Verification
- 43 test files / 225 tests — passed; production build/type-check and native render pass.
- `npx tsc --noEmit` clean; production Next build passed.
- Native render integration: `durationDelta=0`, `audioDrift=0`.
- Graphify update at `d3bc7b1`: 1596 nodes / 3403 edges.

# Open Risks
- **Auth**: bad production Supabase publishable/anon key → `Invalid API key` on Vercel; fix env + redeploy (only auth risk).
- Semantic event understanding (cough/breath/laugh) is missing/partial — must not overclaim beyond provider `audio_event`.
- PiP/alpha between tracks stays a future compositor; Query API now includes active clip/source/gap/overlay/caption context but broader generated-media I/O remains.
- Algorithm changes must land in both `web/lib` and `local/hypescript` (RULES §3).

# Exact Next Steps
1. Graphify + commit/push P3 color adjustments.
2. Select and implement the next P3 preview+export capability that does not need Auth; perform browser visual QA when a stable session is available.
3. Package C only after working login.
4. Query API audit + media-generated I/O boundary later; Package C only after working login.
