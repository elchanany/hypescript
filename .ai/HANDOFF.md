# HANDOFF

## Goal
סנכרון חי: פעולות סוכן ה-AI משתקפות מיד בטיימליין.

## Current State (verified)
ענף: `cursor/agent-live-timeline-sync-e91a`
- `AgentContext.onProjectChange` / `onMediaChange` — נקראים מכל `setClips`/`setSubs`/`setOverlays`/`setWords`/`setMediaList`
- `Chat` דוחף `onProjectLive` מיד; בסוף כלי — `onProject` סוגר Undo אחד (`beginTransaction` + live + `commitTransaction`)
- בזמן `running` לא דורסים EDL/מדיה מ-props (מניעת wipe ברינדור הצ'אט)
- כלים רצים **ברצף** (לא `Promise.all`) כדי למנוע מרוצי EDL
- `setSubsLive` + עדכון refs מיידי ב-live setters

## Exact Next Steps
1. למזג ל-`main` ולרענן פריסה
2. לאמת ידנית: keep_by_script / מחיקת קליפ / כתוביות / overlay — הטיימליין מתעדכן **תוך כדי** הכלי, לא רק בסוף

## Risks
- Undo לכל כלי (לא לכל מוטציה פנימית) — אם כלי קורא `setClips` פעמיים, עדיין Undo אחד ב-`onToolEnd`
- `graphify` לא זמין ב-PATH בסביבת הענן
