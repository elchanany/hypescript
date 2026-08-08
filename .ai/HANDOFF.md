# Goal
Build an honest per-time-span media understanding foundation: speech/audio events and gaps first, energy evidence later. Preserve script-as-ground-truth timing alignment and improve Hebrew caption grouping. Do not claim semantic cough/breath/laugh understanding beyond provider `audio_event` evidence.

# Current State
- main ב־`0834e53`; AG-2 bulk state commits landed ב־`7c61179` and Graphify synced.
- Dirty semantic evidence package: direct speech/provider `audio_event`/explicit gap spans in web+local, read-only agent inspection, richer active-time Query API, and honest energy-only audio wording. Web 43 files/217 tests, local 2/2, type-check and production build pass; Graphify/push pending.
- v0.3.0: CommandBus + Query API PARTIAL; CapCut-class editor foundations on main.

# Active Files
- Continuity: `.ai/ACTIVE_WORK.md`, `.ai/DECISIONS.md`, `docs/GAP_MAP.md`, `.ai/HANDOFF.md`.
- Semantic package: `web/lib/editor/semanticTimeline.ts`, `local/hypescript/semantic_timeline.py`, `web/lib/agent/tools.ts`, `web/lib/editor/commands.ts`, and tests.
- Next package edge: `web/lib/editor/subtitlesEdl.ts`, `local/hypescript/subtitles.py`, and Hebrew caption tests.

# Changes Made
- `d3bc7b1`: `scriptToClips` clamps tolerated ASR overlap (≤~150ms) to the previous clip end and skips remainders shorter than `minClipSec`; `snapSpeechToWords` re-merges touching/overlapping same-source segments after snap+pad — no double-played boundary syllables.
- `7c61179`: `setClips` → `clip.replaceAll`; `setSubs` → `subtitle.replaceAll`; atomic collection-validated commits across bulk agent tools.
- Dirty semantic package preserves only direct evidence; transcript absence never becomes silence and dB evidence no longer claims breath/cough/chair semantics.
- Docs updated: D-010 decision added; GAP_MAP notes bug fix + missing/partial semantic understanding; HANDOFF/ACTIVE_WORK refreshed.

# Failed Attempts
- Double-played boundary syllables at generated cut edges were reproduced and fixed in `d3bc7b1`. Global cut normalization was rejected (D-010) so intentional manual repeats stay possible.

# Tests and Verification
- 43 test files / 217 tests — passed.
- `npx tsc --noEmit` clean; production Next build passed.
- Native render integration: `durationDelta=0`, `audioDrift=0`.
- Graphify update at `d3bc7b1`: 1596 nodes / 3403 edges.

# Open Risks
- **Auth**: bad production Supabase publishable/anon key → `Invalid API key` on Vercel; fix env + redeploy (only auth risk).
- Semantic event understanding (cough/breath/laugh) is missing/partial — must not overclaim beyond provider `audio_event`.
- PiP/alpha between tracks stays a future compositor; Query API now includes active clip/source/gap/overlay/caption context but broader generated-media I/O remains.
- Algorithm changes must land in both `web/lib` and `local/hypescript` (RULES §3).

# Exact Next Steps
1. Full-test/build and commit/push semantic evidence package; update Graphify.
2. Improve Hebrew caption grouping in web+local; keep D-010 and script-as-ground-truth alignment.
3. Add richer energy spans later without semantic inference.
4. Query API audit + media-generated I/O boundary later; Package C only after working login.
