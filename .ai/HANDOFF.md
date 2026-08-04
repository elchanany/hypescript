# HANDOFF

## Goal
טיימליין CapCut (בחירה→אינספקטור, snap, יישור אודיו, linked A/V) — מוזג ל־`main`.

## Current State (verified)
- `main` @ `ec42a83` — fast-forward מ־`cursor/timeline-inspector-snap-328b`.
- לחיצה על וידאו/אודיו/כתובית/שכבה פותחת מאפיינים בפאנל הימני.
- Hover; בחירה מקושרת; snap guide (Magnet); headers ברשת 5 משבצות; Split חותך גם אודיו.
- אימות קודם: vitest time+model, tsc, build, בדיקה ידנית.

## Exact Next Steps
1. אימות בפריסת Vercel מ־`main` (אם רלוונטי).
2. הבא לפי GAP_MAP: AG-4 / intro-outro / preview.
3. אופציונלי: Alt לביטול snap בטיימליין.

## Risks
- סף snap ~10px לפי זום.
