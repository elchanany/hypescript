# HANDOFF

## Goal
תיקון כתוביות חתוכות/משובשות + סנכרון לקצב דיבור + אכיפת ElevenLabs כשמבקשים.

## Current State (verified)
- ענף: `cursor/fix-captions-speech-sync-c816`
- ליבת כתוביות (web+local): ברירת מחדל **progressive** — מילה מצטברת כשהיא נאמרת; שבירת ביטוי בפאוזה/פיסוק.
- `edlToCuesWithScript`: תיקון ASR מול סקריפט; תזמון 1:1 כשספירת מילים תואמת; סינון `audio_event`.
- סוכן: מטמון תמלול שומר provider/model; בקשת `provider=elevenlabs` לא מחזירה מטמון Groq; `ctx.script` אוטומטי ל-`generate_subtitles`.
- UI: כפתור «צור» משתמש בסקריפט אם קיים; Chat מעביר script ל-ctx.
- צריבה: קיפול progressive→phrase כשיש יותר מ-200 cues.
- בדיקות כתוביות + `web build` עברו.

## Exact Next Steps
1. למזג PR אחרי review.
2. בפריסה: לוודא `ELEVENLABS_API_KEY` ב-Vercel אם רוצים Scribe.
3. אופציונלי: צריבת ASS/SRT במקום PNG לשיעורים ארוכים מאוד.

## Risks
- צריבת PNG עדיין מוגבלת (~200 אחרי קיפול) — תצוגה מקדימה/SRT נשארים progressive מלא.
- מטמון תמלול ישן (מערך בלי provider) נדחה כשמבקשים ספק ספציפי — יתמלל מחדש (עלות).
