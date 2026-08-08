# Goal
Build an honest per-time-span media understanding foundation: speech/audio events and gaps first, energy evidence later. Preserve script-as-ground-truth timing alignment and improve Hebrew caption grouping. Do not claim semantic cough/breath/laugh understanding beyond provider `audio_event` evidence.

# Current State
- main ב־`d3bc7b1` — `fix(editor): prevent overlapping generated cuts`: script-generated clips clamp tolerated ASR timestamp overlap to the previous emitted end and drop too-short remainders; silence speech segments are re-merged after word snapping/padding — repeated boundary syllables eliminated.
- Dirty AG-2 (uncommitted, reviewed): agent bulk clip/subtitle workflows commit atomically via `clip.replaceAll`/`subtitle.replaceAll`; pending commit.
- v0.3.0: CommandBus + Query API PARTIAL; CapCut-class editor foundations on main.

# Active Files
- Continuity: `.ai/ACTIVE_WORK.md`, `.ai/DECISIONS.md`, `docs/GAP_MAP.md`, `.ai/HANDOFF.md`.
- Dirty AG-2: `web/lib/agent/tools.ts`, `web/lib/editor/commands.builtin.ts`, `web/lib/editor/commands.ts`, `web/lib/editor/commands.test.ts`, `web/lib/agent/toolParity.test.ts`.
- Next package edge: `web/lib/editor/scriptClips.ts`, `web/lib/editor/clipFilter.ts`, subtitle/web caption logic.

# Changes Made
- `d3bc7b1`: `scriptToClips` clamps tolerated ASR overlap (≤~150ms) to the previous clip end and skips remainders shorter than `minClipSec`; `snapSpeechToWords` re-merges touching/overlapping same-source segments after snap+pad — no double-played boundary syllables.
- Dirty AG-2 (not committed): `setClips` → `clip.replaceAll`; new `setSubs` → `subtitle.replaceAll`; atomic collection-validated commits across bulk agent tools; reviewed.
- Docs updated: D-010 decision added; GAP_MAP notes bug fix + missing/partial semantic understanding; HANDOFF/ACTIVE_WORK refreshed.

# Failed Attempts
- Double-played boundary syllables at generated cut edges were reproduced and fixed in `d3bc7b1`. Global cut normalization was rejected (D-010) so intentional manual repeats stay possible.

# Tests and Verification
- 42 test files / 213 tests — passed.
- `npx tsc --noEmit` clean; production Next build passed.
- Native render integration: `durationDelta=0`, `audioDrift=0`.
- Graphify update at `d3bc7b1`: 1596 nodes / 3403 edges.

# Open Risks
- **Auth**: bad production Supabase publishable/anon key → `Invalid API key` on Vercel; fix env + redeploy (only auth risk).
- Dirty AG-2 work uncommitted.
- Semantic event understanding (cough/breath/laugh) is missing/partial — must not overclaim beyond provider `audio_event`.
- PiP/alpha between tracks stays a future compositor; Query API still basic.
- Algorithm changes must land in both `web/lib` and `local/hypescript` (RULES §3).

# Exact Next Steps
1. Commit dirty AG-2 (atomic bulk replace) with its tests/tsc/build.
2. Semantic timeline package: per-time-span model (speech events, audio events, gaps) preserving script-as-ground-truth alignment; add energy evidence after.
3. Improve Hebrew caption grouping; keep D-010 (normalize at generation boundaries, not globally).
4. Query API audit + media-generated I/O boundary later; Package C only after working login.
