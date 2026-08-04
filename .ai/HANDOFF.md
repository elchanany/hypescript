# HANDOFF

## Goal
מיזוג PR #23 ל־`main` (כתוביות/תמלול ציר + תיקוני סוכן) מעל טיימליין CapCut שכבר ב־`main` (PR #24).

## Current State (verified)
- `main` כולל טיימליין CapCut (inspector/snap/linked A/V) מ־PR #24.
- PR #23 ממוזג עכשיו: כתוביות progressive, `transcribe_timeline`, אנטי-לופ סוכן, `scriptToClips` סדרתי, `snapSpeechToWords`, within-silence כברירת מחדל עם EDL.
- D-007 ב-DECISIONS.

## Exact Next Steps
1. אימות בפריסת Vercel מ־`main` (כתוביות + keep_by_script → remove_silence within).
2. הבא לפי GAP_MAP: AG-4 / intro-outro / preview.
3. אופציונלי: Alt לביטול snap; Cache-Control ל-chunks אם חוזר Loading chunk failed.

## Risks
- אנטי-לופ חוסם מעל ~3 `delete_clip` — להשתמש ב-`delete_clips` / `keep_source_range`.
- snap למילים תלוי בתמלול; סף snap טיימליין ~10px לפי זום.
