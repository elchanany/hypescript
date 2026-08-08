# ACTIVE_WORK.md

## Current task
P3 bounded linear visual fade-to/from-black with Preview+Export parity; dedicated browser upload retry remains.

## Branch
`main`

## Latest commit
`359b301` — chore(graphify): sync clip audio fades

## Status
Audio fades are on main (`0d7215b`). Dirty visual-fade package adds normalized fade-to/from-black to Model, Inspector, Undo/Redo, CommandBus, Agent, rAF Preview opacity and FFmpeg `fade`; multi-track flattening preserves it. Web 45 files/241 tests, production build and native 20-cut render pass. The dedicated browser page loaded, but the in-app file chooser timed out twice; the same rAF path was browser-proven for audio fades, while visual upload QA remains unproven.

## Exact continuation point
Graphify + commit/push visual fades, then retry dedicated browser visual QA before the next P3 package. No Supabase/Auth changes without explicit permission.
