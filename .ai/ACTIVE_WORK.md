# ACTIVE_WORK.md

## Current task
P3 bounded linear clip-edge audio fades with complete Preview+Export parity; next choose another local effect/template package.

## Branch
`main`

## Latest commit
`dbd1389` — chore(graphify): sync clip audio preview

## Status
Clip volume Preview parity is on main (`2f3d0ed`). Dirty fade package adds normalized per-clip fade-in/out to Model, Inspector, Undo/Redo, CommandBus, Agent, Web Audio rAF gain and FFmpeg `afade`; multi-track flattening now preserves fades and the previously omitted color adjustments. Web 45 files/237 tests, production build and native 20-cut render pass. Browser QA proved 1.0s/0.5s fields, gain 0.000 at start, 0.841 at 0.849s, and Undo/Redo.

## Exact continuation point
Graphify + commit/push clip-edge fades, then select the next P3 local Preview+Export package. No Supabase/Auth changes without explicit permission.
