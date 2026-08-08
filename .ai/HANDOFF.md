# Goal
Build an honest per-time-span media understanding foundation: speech/audio events and gaps first, energy evidence later. Preserve script-as-ground-truth timing alignment and improve Hebrew caption grouping. Do not claim semantic cough/breath/laugh understanding beyond provider `audio_event` evidence.

# Current State
- main ב־`2c7809c`; measured energy landed ב־`b11ab15` and Graphify synced.
- Dirty AG-2 artifact boundary: tools return text plus client-only Blob artifacts; runtime emits each Blob once to Chat and writes text only to provider history. Render, SRT, frame, narration and edited-audio outputs share the contract; narration no longer auto-downloads twice. Web 43 files/221 tests, type-check and production build pass; Graphify/push pending.
- v0.3.0: CommandBus + Query API PARTIAL; CapCut-class editor foundations on main.

# Active Files
- Continuity: `.ai/ACTIVE_WORK.md`, `.ai/DECISIONS.md`, `docs/GAP_MAP.md`, `.ai/HANDOFF.md`.
- Current package: `web/lib/agent/tools.ts`, `web/lib/agent/runtime.ts`, `web/components/Chat.tsx`, and `web/lib/agent/runtimeRetry.test.ts`.
- Next package edge: choose the next local P3 capability that can be previewed and exported honestly; Package C remains blocked on working login.

# Changes Made
- `d3bc7b1`: `scriptToClips` clamps tolerated ASR overlap (≤~150ms) to the previous clip end and skips remainders shorter than `minClipSec`; `snapSpeechToWords` re-merges touching/overlapping same-source segments after snap+pad — no double-played boundary syllables.
- `7c61179`: `setClips` → `clip.replaceAll`; `setSubs` → `subtitle.replaceAll`; atomic collection-validated commits across bulk agent tools.
- `071ed3d`: semantic package preserves only direct evidence; transcript absence never becomes silence and dB evidence no longer claims breath/cough/chair semantics.
- `75337e7`: soft budget caption orphans rebalance from 3+1 to 2+2 when both sides fit; hard pause/punctuation boundaries never rebalance.
- `b11ab15`: contiguous equal-level energy windows merge with duration-weighted dB; source discontinuities, edit gaps and different relative levels remain separate.
- Dirty AG-2: `ToolRunResult = string | ToolOutcome`; artifacts never enter JSON/history and identical Blob references are de-duplicated per tool completion.
- Docs updated: D-010 decision added; GAP_MAP notes bug fix + missing/partial semantic understanding; HANDOFF/ACTIVE_WORK refreshed.

# Failed Attempts
- Double-played boundary syllables at generated cut edges were reproduced and fixed in `d3bc7b1`. Global cut normalization was rejected (D-010) so intentional manual repeats stay possible.

# Tests and Verification
- 43 test files / 221 tests — passed; production build and type-check pass.
- `npx tsc --noEmit` clean; production Next build passed.
- Native render integration: `durationDelta=0`, `audioDrift=0`.
- Graphify update at `d3bc7b1`: 1596 nodes / 3403 edges.

# Open Risks
- **Auth**: bad production Supabase publishable/anon key → `Invalid API key` on Vercel; fix env + redeploy (only auth risk).
- Semantic event understanding (cough/breath/laugh) is missing/partial — must not overclaim beyond provider `audio_event`.
- PiP/alpha between tracks stays a future compositor; Query API now includes active clip/source/gap/overlay/caption context but broader generated-media I/O remains.
- Algorithm changes must land in both `web/lib` and `local/hypescript` (RULES §3).

# Exact Next Steps
1. Graphify + commit/push AG-2 artifact boundary.
2. Select and implement the next P3 preview+export capability that does not need Auth.
3. Package C only after working login.
4. Query API audit + media-generated I/O boundary later; Package C only after working login.
