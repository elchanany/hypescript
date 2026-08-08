# ACTIVE_WORK.md

## Current task
P3 per-clip horizontal/vertical flip with exact Preview+Export parity; browser upload retry remains for the latest visual effects.

## Branch
`main`

## Latest commit
`7d289bc` — chore(graphify): sync visual fades

## Status
Visual fades are on main (`92c4c4d`). Dirty flip package adds independent horizontal/vertical axes to Model, Inspector, Undo/Redo, CommandBus, Agent, CSS Preview transform, FFmpeg `hflip`/`vflip`, split inheritance and multi-track preservation. Web 45 files/244 tests, production build and native 20-cut render pass. Dedicated browser upload for the latest visual effects is still blocked by the in-app chooser timeout.

## Exact continuation point
Graphify + commit/push clip flip, then retry dedicated browser visual QA before the next P3 package. No Supabase/Auth changes without explicit permission.
