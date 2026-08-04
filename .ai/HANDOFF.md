# HANDOFF

## Goal
עורך CapCut-class + סוכן AI (v0.3.0).

## Current State (verified)
ענף: `main` · ממוזג PR #32 (`65a2528`)

- סוכן → `EditorApi` / `runCommand` ל-split/trim/move/add + track ops; רענון מיידי בעורך
- `clip.trackId` + כמה רצועות `video` (schema v5); Timeline לפי רצועה
- נגן+ייצוא: `flattenVideoTracks` (cutaway)
- כלים: `add_video_track`, `remove_video_track`, `list_tracks`, `move_clip_to_track`
- לפני מיזוג: Vercel SUCCESS, MERGEABLE/CLEAN, vitest ממוקד + tsc עברו

## Exact Next Steps
1. אימות ידני ב-production/preview: Act → רצועה/טרים משתקף מיד
2. אופציונלי: A-roll audio בזמן cutaway; PiP; AG-2 לשאר ה-UI
3. GAP_MAP: intro-outro / preview; בלי Auth/Supabase בלי אישור

## Risks
- cutaway מחליף גם אודיו מהרצועה המנצחת
