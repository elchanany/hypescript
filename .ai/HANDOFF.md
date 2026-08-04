# HANDOFF

## Goal
המשך GAP אחרי #14/#15: Roll/Slip בטיימליין.

## Current State (verified)
- `main` כולל #14 (Dashboard) + #15 (caption style + CommandBus + Supabase URL).
- ענף: `cursor/timeline-roll-slip-505e` — Roll/Slip ב-timelineOps + CommandBus + כפתורי toolbar + מקלדת.

## Exact Next Steps
1. למזג PR של roll/slip.
2. הבא: AG-4 / caption burn-in בייצוא / v0.2.0 chunking.

## Risks
- Roll בין מקורות שונים מוגבל לפי משך כל מקור.
- עדיין אין גרירת ידית Roll על גבול הקליפ (רק כפתור/מקלדת).
