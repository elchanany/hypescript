# HANDOFF

## Goal
ליטוש Dashboard + UX פרויקטים (תצוגות מקדימות, מודאלים במקום prompt, toasts, תפריט משתמש).

## Current State (verified)
- ענף: `cursor/dashboard-polish-505e`
- ToastHost גלובלי + `lib/ui/toast.ts`
- Modal: NameDialog / ConfirmDialog
- `/dashboard`: כרטיסים עם cover ממדיה מקומית, תפריט ⋯ (פתח/שם/מחק), תפריט משתמש Google
- עורך: יצירה/שינוי שם/מחיקה בלי `window.prompt`/`confirm`
- אחרי OAuth: toast «התחברת בהצלחה» דרך `hs_just_logged_in`

## Exact Next Steps
1. `npm test` + `npm run build` ב-web
2. commit / push / PR
3. אחרי מיזוג — Redeploy ב-Vercel ובדיקה ידנית ב-/dashboard

## Risks
- תצוגה מקדימה תלויה במדיה ב-IndexedDB של אותו דפדפן/מחשב.
- פרויקטים בלי וידאו/תמונה נשארים עם אייקון תיקייה.
