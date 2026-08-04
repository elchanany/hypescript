# HANDOFF

## Goal
תיקוני סוכן/מבנה מצ'אט DeepSeek + כתוביות/תמלול ציר (PR #23).

## Current State (verified 2026-08-04)
- ענף: `cursor/fix-captions-speech-sync-c816` · PR #23 · HEAD `9dbb48f` (synced with origin)
- אימות עכשיו: 22 בדיקות (scriptClips/clipFilter/loopGuard/model/normalize) עברו; `tsc --noEmit` עבר; `graphify update .` רץ.
- `scriptToClips`: חיפוש סדרתי + העדפת forward; בלי קפיצה לזמנים רחוקים; סינון קליפים זעירים.
- `remove_silence`: עם EDL → within כברירת מחדל; `snapSpeechToWords` + ריפוד ~0.12.
- `AgentRunner`: אנטי-לופ (delete_clip / edit_subtitle / list_clips / get_transcript); הודעות chunk/503/Failed to fetch.
- קודם באותו PR: כתוביות progressive, `transcribe_timeline`, אכיפת ElevenLabs.

## Exact Next Steps
1. למזג PR #23 ל-`main`.
2. בפריסה: לוודא `keep_by_script` → `remove_silence` לא מחליף את כל ה-EDL.
3. אופציונלי: אם chunk error חוזר אחרי auto-reload — Cache-Control ל-`_next/static`.

## Risks
- אנטי-לופ חוסם מעל ~3 `delete_clip` — להשתמש ב-`delete_clips` / `keep_source_range`.
- snap למילים תלוי בתמלול; בלי תמלול נשאר ריפוד עוצמה בלבד.
