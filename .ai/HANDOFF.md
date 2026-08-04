# HANDOFF

## Goal
עורך CapCut-class + סוכן AI מעל אותו מנוע — עם ElevenLabs לתמלול/קריינות.

## Current State (verified)
- `main` כולל PR #9 (continuity + Graphify), ElevenLabs, ומיזוג תיקוני ציטוט/זום/פאן.
- **ציטוט מקום** → לתיבת הקלט של הצ'אט (`insertQuote`), לא כהודעה בשיחה
- **זום pinch/Ctrl** מכיל את רוחב הציר (פיקסלים + overflow) בלי לדחוף פריסה
- **גלילה אופקית בטאצפד**: `deltaX` / Shift+גלגלת על הטיימליין
- `ELEVENLABS_API_KEY` בשרת בלבד; סטטוס בהגדרות + בחירת ספק/מודל תמלול
- `/api/transcribe` תומך ב-elevenlabs (Scribe v2 + אירועי שמע/diarize)
- כלי סוכן: `transcribe_video(provider,model)`, `list_stt_models`, `list_voices`, `generate_narration`
- מפרט: `docs/ElevenLabs_API_HypeScript_2026-08-04.md`

## Exact Next Steps
1. להגדיר `ELEVENLABS_API_KEY` ב-Vercel / `.env.local` ולבדוק תמלול אמיתי
2. לאמת ידנית בפריסה: ציטוט → composer; pinch זום; שתי אצבעות לצד על הציר
3. להרחיב CommandBus / AG-4 לפי GAP_MAP
4. **לא** Supabase/Auth בלי אישור; סוכן AI אוטונומי מחוץ לטווח

## Risks
- Forced Alignment של ElevenLabs לא מומלץ לעברית — משתמשים ב-word timestamps מ-Scribe
- TTS/STT בתשלום — להימנע מקריאות כפולות מיותרות
- Roll/Slip/transitions חסרים (GAP_MAP)
