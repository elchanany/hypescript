# HANDOFF

## Goal
מודל אינטראקציה מקצועי של Canvas / Timeline / Inspector (לא Complete עד שכל האינטראקציות המרכזיות עובדות).

## Current State (verified)
- Branch: `cursor/pro-interaction-model-505e`
- Selection model: `web/lib/editor/selection.ts` (hover ≠ active; Inspector לפי סוג)
- VideoTransform schema v5: Fit/Fill/Original/Custom + Canvas DM (`PreviewMainVideo`)
- Captions כ-visual element: `PreviewCaptions` + layout על `Sub`
- Linked A/V: `audioClips: null` = מקושר; `av.detachAudio` / `av.relink`
- Free drop: `moveClipToTime` + Ghost עם mode/time/thumb
- Magnetic snap: קו צהוב + סף בפיקסלים
- Delete ripple vs leave-gap: כפתורים נפרדים + CommandBus
- Commands חדשים: moveToTime, splitLinked, detach/relink, video.setTransform/FitMode, caption.update*, select.entity
- Agent tools: `move_clip_to_time`, `split_linked_av`
- Tests: 79 editor tests ירוקים; `tsc` + `next build` עוברים

## Exact Next Steps
1. חיבור videoTransform לייצוא (ffmpeg pad/scale) כדי ש-Export = Canvas.
2. Viewer Zoom נפרד מ-Element Scale.
3. השלמת context menus + Alt+Click layers.
4. בדיקת דפדפן עם קובץ וידאו אמיתי מול 45 סעיפי הקבלה.

## Smoke (dev server)
- `next build` + 79 editor tests ירוקים.
- דפדפן: עורך נטען, Inspector מציג הגדרות פרויקט בלי בחירה, אין שגיאות בקומפוננטות החדשות (ללא מדיה מלאה).


## Risks
- `moveClipToTime` overwrite עלול להפתיע — צריך מצבי Insert מפורשים ב-UI.
- Detached audio trim/move עדיין מוגבל יחסית ל-linked.
- Export עדיין לא משקף Element Scale.
