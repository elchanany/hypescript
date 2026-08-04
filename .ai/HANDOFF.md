# HANDOFF

## Goal
PR #23 ממוזג ל־`main` (כתוביות/תמלול ציר + תיקוני סוכן) מעל טיימליין CapCut (PR #24).

## Current State (verified)
- `main` @ `79d844e` — כולל PR #23 + PR #24.
- כתוביות progressive, `transcribe_timeline`, אנטי-לופ סוכן, `scriptToClips` סדרתי, `snapSpeechToWords`, within-silence כברירת מחדל עם EDL.
- D-007 ב-DECISIONS.
- אימות במיזוג: 19 בדיקות ממוקדות + tsc + graphify.

## Exact Next Steps
1. אימות בפריסת Vercel מ־`main`.
2. הבא לפי GAP_MAP: AG-4 / intro-outro / preview.
3. אופציונלי: Alt לביטול snap; Cache-Control ל-chunks אם חוזר Loading chunk failed.

## Risks
- אנטי-לופ חוסם מעל ~3 `delete_clip` — `delete_clips` / `keep_source_range`.
- snap למילים תלוי בתמלול; סף snap טיימליין ~10px לפי זום.
