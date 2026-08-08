# ACTIVE_WORK.md

## Current task
P3 clip color browser verification and Inspector wiring repair; next select another local Preview+Export capability that does not require Auth.

## Branch
`main`

## Latest commit
`f76b45e` — chore(graphify): sync shared color presets

## Status
Browser QA loaded a real 4-second MP4 in local guest mode and exposed a missing `clip.setColorAdjustments` dispatch in `updateClipFromInspector`. The wiring is fixed: monochrome now produces Inspector 105%/0% and Preview `contrast(1.05) saturate(0)`; reset returns `contrast(1) saturate(1)`. Web 44 files/228 tests and production build pass.

## Exact continuation point
Graphify + commit/push the Inspector wiring repair and browser-QA evidence; then choose the next P3 package. No Supabase/Auth changes without explicit permission.
