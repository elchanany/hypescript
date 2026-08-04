# HANDOFF

## Goal
עורך CapCut-class + סוכן AI מעל אותו מנוע — עם ElevenLabs לתמלול/קריינות.

## Current State (verified)
<<<<<<< HEAD
ענף: `cursor/quote-input-timeline-pan-e91a`
- **ציטוט מקום** נכנס לתיבת הקלט של הצ'אט (`insertQuote` → `setInput`), לא כהודעה בשיחה
- **זום pinch/Ctrl**: דיכוי per-event + רוחב `tl-inner` בפיקסלים לפי `clientWidth` + `overflow` על shell/upper/timeline — מונע דחיפת פריסה הצידה
- **גלילה אופקית בטאצפד**: `deltaX` דומיננטי או Shift+גלגלת → `scrollLeft` על הציר
- `tsc` + `zoom.test.ts` עוברים

## Exact Next Steps
1. לפתוח/למזג PR של הענף הזה
2. לאמת ידנית: ציטוט → composer; pinch זום בלי שבירת layout; שתי אצבעות לצד על הטיימליין
3. **לא** Supabase/Auth בלי אישור; סוכן AI אוטונומי מחוץ לטווח

## Risks
- חלק מהטאצפדים ממפים גלילה אופקית רק כ-Shift+deltaY (בדפדפן) — מכוסה
- Graphify לא מותקן בסביבה
=======
- `main` כולל PR #9 (continuity + Graphify) ומיזוג ElevenLabs מ-`cursor/elevenlabs-transcription-1547`.
- `ELEVENLABS_API_KEY` בשרת בלבד; סטטוס בהגדרות + בחירת ספק/מודל תמלול
- `/api/transcribe` תומך ב-elevenlabs (Scribe v2 + אירועי שמע/diarize)
- `/api/elevenlabs/{voices,models,tts}` לקריינות ובחירת קול/מודל
- כלי סוכן: `transcribe_video(provider,model)`, `list_stt_models`, `list_voices`, `generate_narration`
- local CLI/GUI: `--cloud-provider elevenlabs`
- מפרט: `docs/ElevenLabs_API_HypeScript_2026-08-04.md`
- `npm test` + `tsc --noEmit` עברו לפני המיזוג

## Exact Next Steps
1. להגדיר `ELEVENLABS_API_KEY` ב-Vercel / `.env.local` ולבדוק תמלול אמיתי
2. (אופציונלי) Audio Isolation / Pronunciation Dictionaries לפי המפרט
3. להרחיב CommandBus / AG-4 לפי GAP_MAP
4. **לא** Supabase/Auth בלי אישור

## Risks
- Forced Alignment של ElevenLabs לא מומלץ לעברית — משתמשים ב-word timestamps מ-Scribe
- TTS/STT בתשלום — להימנע מקריאות כפולות מיותרות
- Roll/Slip/transitions חסרים (GAP_MAP)
>>>>>>> origin/main
