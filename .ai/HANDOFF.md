# HANDOFF

## Goal
עורך CapCut-class + סוכן AI + ElevenLabs + Auth/Dashboard אופציונלי (Supabase).

## Current State (verified)
- `main` כולל ElevenLabs, ציטוט ל-composer, Auth אופציונלי, ותיקון זום/playhead.
- **זום טיימליין:** scroll לפי lane אחרי gutter 136px; כותרות מעל playhead; pinch ב-rAF
- Auth: `/login`, `/dashboard`, `/auth/callback` — Supabase אופציונלי; מדריך `docs/SETUP_AUTH.md`
- `ELEVENLABS_API_KEY` בשרת בלבד

## Exact Next Steps
1. לרענן פריסה — לאמת pinch זום בלי playhead מעל הנעילה
2. להפעיל Google ב-Supabase Auth לפי SETUP_AUTH (אם רוצים Auth פעיל)
3. סוכן AI אוטונומי מחוץ לטווח עד אישור

## Risks
- Secret/service_role אסור בצד לקוח
- Forced Alignment של ElevenLabs לא מומלץ לעברית — Scribe word timestamps
- Roll/Slip/transitions חסרים (GAP_MAP)
