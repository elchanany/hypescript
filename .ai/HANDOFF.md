# HANDOFF

## Goal
עורך CapCut-class + סוכן AI: CommandBus parity + רצועות וידאו מרובות עם רענון מיידי בעורך.

## Current State (verified)
ענף: `cursor/agent-commandbus-multitrack-7940`
- סוכן → `EditorApi` / `runCommand` ל-split/trim/move/add + track ops; `_editorDirty` מונע History כפול
- `clip.trackId` + כמה רצועות `video` (schema v5); Timeline מציג לפי רצועה; `+` להוספת רצועה
- נגן+ייצוא: `flattenVideoTracks` (cutaway — רצועה עליונה מנצחת)
- כלים: `add_video_track`, `remove_video_track`, `list_tracks`, `move_clip_to_track`
- runtime: כלים משני-state רצים בסדר (לא Promise.all)
- בדיקות: 151 passed (כולל tracks/commands/migrate)

## Exact Next Steps
1. לאמת ידנית: Act → add_video_track → add_clip/move_clip_to_track → trim — מופיע מיד בטיימליין
2. אופציונלי: PiP/שקיפות לרצועה עליונה במקום cutaway מלא; rename/lock דרך סוכן
3. AG-2 המשך: עוד פעולות UI דרך CommandBus

## Risks
- cutaway מחליף גם אודיו מהרצועה המנצחת (לא A-roll audio שמור)
- `laneRef` עדיין על הרצועה הראשית בעיקר ל-drop indicator
