# HANDOFF

## Goal
הפיכת Hypescript לעורך וידאו מקצועי (CapCut-class) + סוכן AI אוטונומי מעל אותו מנוע.
עובדים לפי שני מסמכי המפרט (Package A / Packages 1–4): עורך חזותי, Agent dock מקצועי, Canvas direct manipulation, Timeline מקצועי, ומסמכי אודיט. Cloud Agent: commit/push לענף מבודד בלבד; **אין merge/deploy ללא "מאשר לדחוף"**.

## Current State (verified)
ענף: `cursor/agent-workflow-chats-e91a` (על main).
- **Package 1 (הושלם):** design system; פאנלים; Media; Agent dock Ask/Plan/Act.
- **Agent workflow (סבב זה):** תיקון התנהגות סוכן אחרי תקיעה בשיחת לקוח:
  - `remove_silence` ברירת-מחדל `within_existing` (לא מוחק EDL אחרי keep_by_script)
  - כלים: `delete_clips`, `keep_source_range`, `clear_clips`; תיקון `trim_clip` מ-NaN
  - `generate_subtitles(script=…)` מתקן ASR מול טקסט נקי
  - SYSTEM_PROMPT עם חוקי ברזל (בלי לולאות מחיקה, כתוביות מטקסט נקי)
  - שיחות מרובות בפרויקט (`chatStore` v2 + UI `/new`)
  - runtime: פרסור JSON בטוח לתשובות שבורות
- **P0 DeepSeek (הושלם):** `web/lib/agent/normalize.ts` — תיקון היסטוריית tool_calls.
- **Canvas Direct Manipulation + Export burn-in (סבב זה):**
  - מודל: `Overlay` + `VisualTransform` (center anchor, project px)
  - קואורדינטות: `canvasCoords.ts` + tests
  - Schema v3: `overlays[]` + `canvas` + migration
  - Preview: letterbox + drag/resize/rotate (Undo אחד / cancel אם לא זז)
  - Inspector + Timeline «שכבות» + TextPanel; תמונה→overlay
  - **Export:** `appendOverlayBurns` אחרי concat (לא נוגע ב-EDL); טקסט→PNG; UI+Agent מעבירים overlays/canvas
- **מנוע EDL:** `buildConcatGraph` ללא שינוי התנהגות כשאין overlays — integration 20-cut עדיין ירוק.
- אימות: `tsc` נקי; unit+integration overlays + graph.

## Active Files
- `web/lib/editor/{overlay,canvasCoords,project,migrate}.ts`
- `web/components/{PreviewOverlays,TextPanel,VideoPreview,InspectorPanel,Timeline,ToolRail}.tsx`
- `web/hooks/useEditor.ts` — overlays בהיסטוריה + live + cancelTransaction
- `web/app/{page.tsx,globals.css}`

## Risks / Known limitations
- Export burn-in: אין drawtext מקורי (טקסט→PNG ב-Canvas); stickers/shapes חסרים.
- אין API keys → סוכן LLM חי לא נבדק end-to-end.
- Graphify CLI / `graphify-out` לא זמינים בסביבה זו — ניווט ידני ממוקד.
- Overlay lane בציר הוא ויזואלי (לא TrackMeta type); trim/move של overlays בציר עדיין לא.

## Exact Next Steps
1. לפי GAP_MAP: **TL-1** Timeline gaps/ripple/zoom-around-pointer.
2. CommandBus + Provider Registry / Auth.
3. Artifacts: `.artifacts/pkgA/canvas_*.png` (מוחרגים מ-git).
