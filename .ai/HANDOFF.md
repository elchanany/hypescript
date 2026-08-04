# HANDOFF

## Goal
המשך ROADMAP/GAP — אחרי caption burn-in: chunking לתמלול ארוך ב-web.

## Current State (verified)
- `main` כולל צריבת כתוביות (#19).
- ענף: `cursor/transcribe-chunking-505e`
  - פיצול אודיו ל-20 דק׳ (כמו local), תמלול לכל חלק, איחוד מילים עם offset
  - משותף לעורך + כלי הסוכן `transcribe_video`
- בדיקות + build עברו.

## Exact Next Steps
1. למזג PR chunking (Deploy אוטומטי ב-Vercel).
2. הבא: אינטרו/אאוטרו, תצוגה מקדימה לפני הורדה, או AG-4.

## Risks
- פיצול בגבול 20 דק׳ עלול לחתוך מילה באמצע — מקובל כמו ב-local.
