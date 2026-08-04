# HANDOFF

## Goal
שילוב ElevenLabs כספק תמלול/קריינות + שליטת הסוכן במודלים/קולות.

## Current State (verified)
ענף: `cursor/elevenlabs-transcription-1547`
- `ELEVENLABS_API_KEY` בשרת בלבד; סטטוס בהגדרות + בחירת ספק/מודל תמלול
- `/api/transcribe` תומך ב-elevenlabs (Scribe v2 + אירועי שמע/diarize)
- `/api/elevenlabs/{voices,models,tts}` לקריינות ובחירת קול/מודל
- כלי סוכן: `transcribe_video(provider,model)`, `list_stt_models`, `list_voices`, `generate_narration`
- local CLI/GUI: `--cloud-provider elevenlabs`
- מפרט: `docs/ElevenLabs_API_HypeScript_2026-08-04.md`
- `npm test` + `tsc --noEmit` עוברים

## Exact Next Steps
1. להגדיר `ELEVENLABS_API_KEY` ב-Vercel / `.env.local` ולבדוק תמלול אמיתי
2. (אופציונלי) Audio Isolation / Pronunciation Dictionaries לפי המפרט
3. **לא** Supabase/Auth בלי אישור

## Risks
- Forced Alignment של ElevenLabs לא מומלץ לעברית — משתמשים ב-word timestamps מ-Scribe
- TTS/STT בתשלום — להימנע מקריאות כפולות מיותרות
