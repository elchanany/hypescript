# HANDOFF

## Goal
להמשיך לפי GAP_MAP אחרי מיזוג Dashboard (#14): תיקון URL Supabase + TX-1 (סגנון כתוביות) + AG-2 (CommandBus).

## Current State (verified)
- `main` כולל PR #14 (Dashboard polish) — ממוזג.
- ענף פעיל: `cursor/editor-next-505e`
- נרמול `NEXT_PUBLIC_SUPABASE_URL` (הסרת `/rest/v1`) הועתק מענף #13.

## Exact Next Steps
1. להשלים TX-1: CaptionStyle בפריוויו + פאנל כתוביות + persistence (schema v4).
2. AG-2: מחיקת קליפ/רווח דרך CommandBus + בדיקות parity.
3. להחליף `prompt` לשינוי שם רצועה / טקסט אוברליי ב-NameDialog.
4. commit / push / PR; לסגור #13 כמיותר אחרי המיזוג.

## Risks
- סגנון כתוביות בפרויקט ישן חייב migration עם ברירת מחדל.
- Burn-in של סגנון בייצוא — אם לא בטווח החבילה, לפחות Preview + persist.
