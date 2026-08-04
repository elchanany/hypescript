# HANDOFF

## Goal
עורך CapCut-class + סוכן AI + ElevenLabs + Auth/Dashboard אופציונלי (Supabase).

## Current State (verified)
ענף: `cursor/timeline-zoom-left-anchor-e91a`
- זום מעגן **לשמאל** (קצה ה-lane ליד הכותרות) — לא למיקום העכבר
- כש-scrollLeft≈0 נשאר 0: קו ההתחלה לא נדחף שמאלה אחרי הגדלה
- `vitest zoom.test.ts` + `tsc` עוברים

## Exact Next Steps
1. למזג ולרענן פריסה — לאמת שבהגדלה ההתחלה נשארת בהתחלה
2. Auth/ElevenLabs לפי הצורך
3. סוכן AI אוטונומי מחוץ לטווח עד אישור

## Risks
- Secret/service_role אסור בצד לקוח
- Forced Alignment של ElevenLabs לא מומלץ לעברית
- Roll/Slip/transitions חסרים (GAP_MAP)
