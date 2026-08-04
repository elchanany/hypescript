# HANDOFF

## Goal
תיקון באגים מסוכן DeepSeek בצ'אט אמיתי: קפיצות keep_by_script, remove_silence מחליף EDL, לופי מחיקה/כתוביות, chunk/503, חיתוך מילת פתיחה.

## Current State (verified)
- ענף: `cursor/fix-captions-speech-sync-c816` · PR #23
- `scriptToClips`: חיפוש סדרתי + העדפת forward; בלי קפיצה ל־117s; סינון קליפים זעירים.
- `remove_silence`: כשיש EDL — within כברירת מחדל; `snapSpeechToWords` + ריפוד 0.12 מונעים חיתוך "שלום".
- `AgentRunner`: אנטי-לופ ל־delete_clip / edit_subtitle / list_clips / get_transcript; הודעות chunk/503/Failed to fetch.
- SYSTEM_PROMPT מחוזק (pipeline, קיצור, ElevenLabs, timeline).
- בדיקות: scriptClips / clipFilter / loopGuard עברו; `tsc` עבר.

## Exact Next Steps
1. למזג PR #23.
2. לוודא בפריסה: אחרי keep_by_script → remove_silence לא מחליף את כל הסרטון.
3. אם chunk error חוזר אחרי auto-reload — לבדוק Cache-Control ל־`_next/static`.

## Risks
- אנטי-לופ עלול לחסום מחיקות בודדות לגיטימיות (מעל 3) — יש `delete_clips`.
- snap למילים תלוי בתמלול; בלי תמלול נשאר רק ריפוד עוצמה.
