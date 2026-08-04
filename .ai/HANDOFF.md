# HANDOFF

## Goal
עורך CapCut-class + סוכן AI מעל אותו מנוע — עם ElevenLabs לתמלול/קריינות.

## Current State (verified)
ענף: `cursor/timeline-zoom-playhead-e91a`
- תיקון זום: `scrollLeftAfterZoom` מחשב לפי lane אחרי gutter קבוע (136px) — הסמן לא נדחף מתחת לנעילה
- כותרות sticky עם z-index מעל playhead
- זום pinch מצטבר ל-rAF + רגישות גבוהה יותר (פחות תקיעות)
- `vitest zoom.test.ts` + `tsc` עוברים

## Exact Next Steps
1. למזג PR ולרענן בפריסה — לאמת pinch זום בלי playhead מעל הנעילה
2. להגדיר `ELEVENLABS_API_KEY` ב-Vercel ולבדוק תמלול
3. **לא** Supabase/Auth בלי אישור; סוכן AI אוטונומי מחוץ לטווח

## Risks
- Forced Alignment של ElevenLabs לא מומלץ לעברית
- Roll/Slip/transitions חסרים (GAP_MAP)
