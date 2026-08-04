# HANDOFF

## Goal
שיפורי טיימליין בסגנון CapCut: בחירה→אינספקטור, hover, snap guides, יישור כותרות אודיו, חיתוך מקושר A/V.

## Current State (verified)
- ענף: `cursor/timeline-inspector-snap-328b`
- לחיצה על קטע וידאו/אודיו/כתובית/שכבה פותחת מאפיינים בפאנל הימני (במקום «הגדרות פרויקט»).
- Hover מסמן; בחירה מסונכרנת בין רצועת וידאו לאודיו (אותו EDL).
- בזמן גרירה/חיתוך: קו מגנט צהוב לקצוות קליפים/שכבות/כתוביות/playhead (כש־Magnet דלוק).
- כותרות רצועות: רשת 5 משבצות קבועה — mute באודיו לא דוחף אייקונים.
- `splitClip` מעביר volume/enabled לחצי הימני (חיתוך מקושר).
- בדיקות: `time` + `model` + `tsc` + `web build` עברו.

## Exact Next Steps
1. בדיקה ידנית בעורך (בחירה, snap, split).
2. למזג PR אחרי review.
3. הבא לפי GAP_MAP: AG-4 / intro-outro / preview.

## Risks
- סף ה־snap תלוי בזום (~10px); Alt לביטול עדיין לא מיושם בטיימליין (רק ב־canvas overlays).
