# HANDOFF

## Goal
עורך CapCut-class + סוכן AI מעל אותו מנוע.

## Current State (verified)
ענף: `cursor/quote-input-timeline-pan-e91a`
- **ציטוט מקום** נכנס לתיבת הקלט של הצ'אט (`insertQuote` → `setInput`), לא כהודעה בשיחה
- **זום pinch/Ctrl**: דיכוי per-event + רוחב `tl-inner` בפיקסלים לפי `clientWidth` + `overflow` על shell/upper/timeline — מונע דחיפת פריסה הצידה
- **גלילה אופקית בטאצפד**: `deltaX` דומיננטי או Shift+גלגלת → `scrollLeft` על הציר
- `tsc` + `zoom.test.ts` עוברים

## Exact Next Steps
1. לפתוח/למזג PR של הענף הזה
2. לאמת ידנית: ציטוט → composer; pinch זום בלי שבירת layout; שתי אצבעות לצד על הטיימליין
3. **לא** Supabase/Auth בלי אישור; סוכן AI אוטונומי מחוץ לטווח

## Risks
- חלק מהטאצפדים ממפים גלילה אופקית רק כ-Shift+deltaY (בדפדפן) — מכוסה
- Graphify לא מותקן בסביבה
