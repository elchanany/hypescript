# HANDOFF

## Goal
מודל אינטראקציה מקצועי Canvas/Timeline/Inspector — לסגור פערים מול 45 בדיקות הקבלה.

## Current State (verified)
- Branch: `cursor/pro-interaction-model-505e` · PR #25
- **Export = Canvas Element Scale**: `appendMainVideoTransform` אחרי concat, לפני overlays; identity כש-Fit מלא. יחידות ב-`mainVideoTransform.test.ts`.
- **Viewer Zoom**: Fit/25/50/100/200 + Ctrl+Wheel — נפרד מ-Element Scale.
- **Edge handles** על main video + overlays + captions.
- **Alt+Click** מחזור שכבות תחת הסמן.
- **Caption timeline**: trim/move + context menu (עריכה/פיצול/מיזוג/מחיקה).
- **Context menus**: video (detach/relink/ripple/leave-gap), gap, caption. אין פריטים ללא מימוש (effects/freeze).
- **Keyboard**: Ctrl+D שכפול; חצים מזיזים אלמנט נבחר (Shift=10px).
- Tests: 84 editor/render; `tsc` + `next build` עוברים.

## Remaining honest gaps (לא Complete)
- Export E2E עם ffmpeg.wasm + מדיה אמיתית (גרף מכוסה ביחידה; אין הרצת wasm מלאה ב-CI כאן).
- תפריטי סעיף 16 שלא קיימים במוצר (effects/transitions/freeze/stickers) — לא מוצגים במכוון.
- בדיקת דפדפן אינטראקטיבית מלאה מול כל 45 הסעיפים — smoke חלקי.

## Exact Next Steps
1. Smoke דפדפן עם `/tmp/test-clip.mp4`.
2. Push + עדכון גוף PR #25.
