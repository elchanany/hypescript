# ACTIVE_WORK.md

## Current task
P3 audio parity: per-clip volume now drives Preview through Web Audio as well as FFmpeg Export. Next package is bounded linear clip-edge fades.

## Branch
`main`

## Latest commit
`2743a00` — chore(graphify): sync inspector color wiring

## Status
Color browser fix is on main (`60c5357`). Dirty audio-parity package multiplies transport volume by the active clip volume in a Web Audio GainNode, including boosts up to 2×; mute is fail-closed at zero and persisted out-of-range volume is clamped. Web 45 files/231 tests and production build pass. Browser audio QA remains pending.

## Exact continuation point
Graphify + commit/push audio Preview parity, then implement bounded linear fade-in/fade-out on the same gain/export pipeline. No Supabase/Auth changes without explicit permission.
