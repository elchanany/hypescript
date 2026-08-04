# HANDOFF

## Goal
שיפורי טיימליין CapCut: בחירה→אינספקטור, hover, snap guides, יישור כותרות אודיו, חיתוך מקושר A/V.

## Current State (verified 2026-08-04)
- Branch: `cursor/timeline-inspector-snap-328b` · PR #24 OPEN · working tree clean
- Feature tip: `0022f1d` (בחירה/snap/headers/linked split + תיקון stopPropagation)
- לחיצה על וידאו/אודיו/כתובית/שכבה → מאפיינים בפאנל הימני.
- Hover; בחירה מקושרת וידאו↔אודיו; snap guide צהוב (Magnet); headers ברשת 5 משבצות.
- `splitClip` מעביר volume/enabled; Split נראה גם באודיו.
- אימות: `vitest` time+model 11/11 ✅ · `tsc --noEmit` ✅ · build קודם עבר · בדיקה ידנית ✅
- `graphify update` לא נדרש במעבר זה (אין שינוי קוד חדש).
- `PROJECT_STATE` / `DECISIONS` לא עודכנו — השינוי עדיין לא ב-`main`.

## Exact Next Steps
1. Review + מיזוג PR #24.
2. אופציונלי אחרי מיזוג: Alt לביטול snap בטיימליין.
3. הבא לפי GAP_MAP: AG-4 / intro-outro / preview.

## Risks
- סף snap ~10px לפי זום; קו המגנט נעלם ב־mouseup.
