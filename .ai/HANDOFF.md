# HANDOFF

## Goal
תיקון כתוביות + תמלול על הציר הערוך אחרי חיתוך.

## Current State (verified)
- ענף: `cursor/fix-captions-speech-sync-c816` · PR #23
- כתוביות progressive + אכיפת ElevenLabs (קודם).
- חדש: `assembleTranscript` — מיפוי תמלול מקורות → ציר EDL (חינמי).
- כלי `transcribe_timeline`: `remap` (ברירת מחדל) או `retranscribe` (אודיו זמני + STT).
- `get_transcript(timeline=true)` / ברירת מחדל כשיש קליפים — זמנים כמו בנגן.
- `extractAssembledAudio` בונה mp3 זמני מהעריכה לתמלול מחדש.
- שינוי EDL מבטל `assembledWords` שמור.
- build + בדיקות assemble/subtitles עברו.

## Exact Next Steps
1. למזג PR #23.
2. בפריסה: `ELEVENLABS_API_KEY` אם רוצים Scribe/retranscribe.
3. אופציונלי: צריבת ASS לשיעורים ארוכים.

## Risks
- `retranscribe` עולה כסף API וזמן ffmpeg.
- lavfi `anullsrc` לרווחים — לוודא תמיכה ב-ffmpeg.wasm בסביבות שונות.
