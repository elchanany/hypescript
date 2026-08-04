# HANDOFF

## Goal
עורך CapCut-class + סוכן AI מעל אותו מנוע — עם ElevenLabs לתמלול/קריינות.

## Current State (verified)
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
