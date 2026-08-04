# HANDOFF

## Goal
זום טיימליין חלק לטווח רחב — הקטנה מתחת ל-fit והגדלה קיצונית.

## Current State (verified)
ענף: `cursor/timeline-zoom-range-e91a`
- תוקן נעילת זום-אאוט: הוסר `Math.max(portW, …)` ו-`min-width:100%` שחסמו הקטנה מתחת ל-100%
- `timelineContentWidth` — רוחב = `portW * zoom` (עם רצפת gutter+48)
- טווח: `ZOOM_MIN=0.05` … `ZOOM_MAX=400`
- `nextZoom(..., portWidth)` מכבד מינימום אפקטיבי לפי viewport
- בדיקות `zoom.test.ts` עוברות

## Exact Next Steps
1. למזג ל-`main` ולרענן פריסה
2. לאמת pinch/גלגלת: הקטנה עד ~5% (תוכן צר מהמסגרת), הגדלה עד מאות אחוזים עם גלילה

## Risks
- בזום גבוה מאוד (×400) גלילה כבדה בפרויקטים ארוכים
- `graphify` לא ב-PATH בענן
