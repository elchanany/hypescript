# ACTIVE_WORK.md

## Current task
Agent/client-brief reliability: tight Hebrew speech cutting, zero repeated source-time boundaries, caption styling, and deferred-asset sequencing.

## Branch
`main`

## Latest commit
`f2442e3` — chore(graphify): sync clip flip controls

## Status
Dirty agent/core package replaces dB-first silence cutting with word-timestamp `tight` pacing (0.22s gap, 0.04s handles), removes explicit audio events/fillers, normalizes every automatic same-source/track boundary, and adds real Agent caption-style control. SYSTEM_PROMPT compiles client briefs into spoken keep text, edit instructions, deferred CTA assets, boundary verification and final fade. Web 45 files/251 tests, type-check and production build pass; local 8 tests pass.

## Exact continuation point
Run Graphify update, commit/push the agent/core package, then validate the workflow against a real uploaded lecture when source media is available. Do not claim acoustic breath classification without provider `audio_event`; no Supabase/Auth changes without explicit permission.
