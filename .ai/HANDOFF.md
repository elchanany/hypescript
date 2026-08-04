# HANDOFF

## Goal
תיקוני סוכן/מבנה מצ'אט DeepSeek + כתוביות/תמלול ציר (PR #23).

## Current State (verified 2026-08-04)
- ענף: `cursor/fix-captions-speech-sync-c816` · PR #23 · tip synced with origin
- אימות: 22 בדיקות (scriptClips/clipFilter/loopGuard/model/normalize) עברו; `tsc --noEmit` עבר; `graphify update .` רץ
- תיקון קוד עיקרי: `38196d2` — אנטי-לופ, scriptClips סדרתי, snapSpeechToWords
- `scriptToClips`: חיפוש סדרתי + העדפת forward; בלי קפיצה לזמנים רחוקים; סינון קליפים זעירים
- `remove_silence`: עם EDL → within כברירת מחדל; `snapSpeechToWords` + ריפוד ~0.12
- `AgentRunner`: אנטי-לופ; הודעות chunk/503/Failed to fetch
- גם ב-PR: כתוביות progressive, `transcribe_timeline`, אכיפת ElevenLabs
- D-007 ב-DECISIONS; PROJECT_STATE עודכן ליכולות סוכן

## Exact Next Steps
1. למזג PR #23 ל-`main`
2. בפריסה: לוודא `keep_by_script` → `remove_silence` לא מחליף את כל ה-EDL
3. אופציונלי: אם chunk error חוזר אחרי auto-reload — Cache-Control ל-`_next/static`

## Risks
- אנטי-לופ חוסם מעל ~3 `delete_clip` — להשתמש ב-`delete_clips` / `keep_source_range`
- snap למילים תלוי בתמלול; בלי תמלול נשאר ריפוד עוצמה בלבד
