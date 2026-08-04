# HANDOFF

## Goal
עורך CapCut-class + סוכן AI: CommandBus parity + רצועות וידאו מרובות עם רענון מיידי בעורך.

## Current State (verified)
ענף: `cursor/agent-commandbus-multitrack-7940` · PR #32 (draft, OPEN)  
Feature commit: `a17f540` · tip על origin אחרי continuity

- סוכן → `EditorApi` / `runCommand` ל-split/trim/move/add + track ops; `_editorDirty` מונע History כפול
- `clip.trackId` + כמה רצועות `video` (schema v5); Timeline לפי רצועה; כפתור `+`
- נגן+ייצוא: `flattenVideoTracks` (cutaway — order גבוה מנצח)
- כלים: `add_video_track`, `remove_video_track`, `list_tracks`, `move_clip_to_track`
- runtime: כלים משני-state בסדר (לא `Promise.all`)
- אימות אחרון (תחזוקה): vitest ממוקד 24/24 (tracks/commands/migrate/model) + `tsc --noEmit` עבר; suite מלא קודם 151; `graphify update .` רץ ונדחף

עדיין **לא** ב-`main` עד מיזוג PR #32.

## Exact Next Steps
1. אימות ידני ב-Act: add_video_track → move_clip_to_track/trim — מופיע מיד בטיימליין
2. אחרי מיזוג: לרענן PROJECT_STATE ל-main
3. אופציונלי בהמשך: A-roll audio בזמן cutaway; PiP; AG-2 לשאר ה-UI

## Risks
- cutaway מחליף גם אודיו מהרצועה המנצחת
- `laneRef`/drop indicator ממוקד ברצועה הראשית
