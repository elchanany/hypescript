# HANDOFF

## Goal
שיפורי טיימליין CapCut: בחירה→אינספקטור, hover, snap guides, יישור כותרות אודיו, חיתוך מקושר A/V.

## Current State (verified 2026-08-04)
- Branch: `cursor/timeline-inspector-snap-328b` · tip `9b03306` · PR #24 OPEN
- לחיצה על וידאו/אודיו/כתובית/שכבה → מאפיינים בפאנל הימני (לא «הגדרות פרויקט»).
- `stopPropagation` על click של קליפ — מונע ביטול בחירה ע״י ה־lane.
- Hover; בחירה מקושרת וידאו↔אודיו; snap guide צהוב (Magnet); headers ברשת 5 משבצות.
- `splitClip` מעביר volume/enabled; Split נראה גם באודיו.
- אימות: `vitest` time+model 11/11 ✅ · `tsc --noEmit` ✅ · build קודם עבר · בדיקה ידנית בדפדפן ✅

## Exact Next Steps
1. Review + מיזוג PR #24.
2. אופציונלי אחרי מיזוג: Alt לביטול snap בטיימליין.
3. הבא לפי GAP_MAP: AG-4 / intro-outro / preview.

## Risks
- סף snap ~10px לפי זום; קו המגנט נעלם ב־mouseup.
