# HANDOFF

## Goal
עורך CapCut-class + סוכן AI + ElevenLabs + Auth אופציונלי.

## Current State (verified)
ענף: `cursor/editor-chat-timeline-ux-e91a`
- נקודות חשיבה תמיד בזמן בקשה פתוחה
- Markdown בצ'אט + כרטיסי מדיה (נגן פעימות / וידאו / SRT)
- שמות קבצים לפי הקשר + `rename_media`
- כותרות רצועות בשורה אחת (בלי חפיפה) + גבהים גדולים יותר
- Playhead נגרר + hover; קישור AV לבחירה; שקיפות קליפ/שכבה ב-inspector
- עיצוב כתוביות ב-inspector לכתובית נבחרת

## Exact Next Steps
1. למזג ולרענן פריסה
2. EDL אודיו נפרד לחלוטין (כש-unlink) — עדיין אותו EDL; unlink משפיע על בחירה חזותית
3. רצועות וידאו מרובות אמיתיות — שכבות היום = overlays

## Risks
- Supabase types חסרים בסביבת cloud אם אין npm i
- Secret/service_role אסור בצד לקוח
