# HANDOFF

## Goal
שיפורי טיימליין בסגנון CapCut: בחירה→אינספקטור, hover, snap guides, יישור כותרות אודיו, חיתוך מקושר A/V.

## Current State (verified)
- ענף: `cursor/timeline-inspector-snap-328b` · PR #24
- לחיצה על קטע וידאו/אודיו/כתובית/שכבה פותחת מאפיינים בפאנל הימני.
- באג תוקן: `stopPropagation` על click של קליפ — בלי זה ה־lane ביטל בחירה מיד.
- Hover מסמן; בחירה מסונכרנת וידאו↔אודיו.
- קו מגנט צהוב בגרירה/חיתוך (Magnet); רשת 5־משבצות בכותרות רצועה.
- `splitClip` מעביר volume/enabled; Split נראה גם ברצועת האודיו.
- אימות ידני: מאפייני וידאו/שמע בלחיצה ✅ · יישור headers ✅ · linked split ✅ · hover ✅

## Exact Next Steps
1. Review + מיזוג PR #24.
2. אופציונלי: Alt לביטול snap בטיימליין (כמו ב־canvas).
3. הבא לפי GAP_MAP: AG-4 / intro-outro / preview.

## Risks
- סף snap ~10px לפי זום; מדריך צהוב נעלם ב־mouseup (קשה לתפוס ב־screenshot).
