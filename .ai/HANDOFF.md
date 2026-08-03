# HANDOFF

## Goal
הפיכת Hypescript לעורך וידאו מקצועי (CapCut-class) + סוכן AI אוטונומי מעל אותו מנוע.
עובדים לפי שני מסמכי המפרט (Package A / Packages 1–4): עורך חזותי, Agent dock מקצועי, Canvas direct manipulation, Timeline מקצועי, ומסמכי אודיט. Cloud Agent: commit/push לענף מבודד בלבד; **אין merge/deploy ללא "מאשר לדחוף"**.

## Current State (verified)
ענף: `cursor/editor-shell-pkg1-505e` · PR טיוטה #1 (לא ממוזג).
- **Package 1 (הושלם):** design system; פאנלים ניתנים לשינוי גודל; Media grid/list + thumbnails; טקסט כתוביות בציר; Ghost+Drop indicator.
- **Agent dock (הושלם):** flex dock מעוגן; Ask/Plan/Act עם אכיפה אמיתית (`tools:[]`); `/` slash; `@mentions`; context chips.
- **P0 DeepSeek (הושלם):** `web/lib/agent/normalize.ts` — תיקון היסטוריית tool_calls.
- **Canvas Direct Manipulation (סבב זה — Preview):**
  - מודל: `Overlay` + `VisualTransform` (center anchor, project px) ב-`web/lib/editor/overlay.ts`
  - קואורדינטות: `canvasCoords.ts` + tests (letterbox, round-trip, hit-test)
  - Schema v3: `overlays[]` + `canvas` + migration בטוחה מ-v2
  - Preview: letterbox `.pv-canvas` + `PreviewOverlays` (drag / corner resize / rotate, Undo אחד לכל gesture, cancel אם לא זז)
  - Inspector: טרנספורם X/Y/W/H/rotation/opacity + מאפייני טקסט
  - Timeline: רצועת «שכבות» לבחירת overlay
  - ToolRail: לשונית «טקסט» + `TextPanel`; תמונה ממדיה → overlay (לא קליפ וידאו)
- **מנוע ייצוא:** לא נגעתי; overlays **עדיין לא** ב-export (Preview בלבד).
- אימות יחידה: `tsc` נקי; **48/48** tests (כולל canvasCoords + migrate v3).

## Active Files
- `web/lib/editor/{overlay,canvasCoords,project,migrate}.ts`
- `web/components/{PreviewOverlays,TextPanel,VideoPreview,InspectorPanel,Timeline,ToolRail}.tsx`
- `web/hooks/useEditor.ts` — overlays בהיסטוריה + live + cancelTransaction
- `web/app/{page.tsx,globals.css}`

## Risks / Known limitations
- Export parity ל-overlays (FFmpeg overlay filter) — **לא ממומש**; Preview בלבד.
- אין API keys → סוכן LLM חי לא נבדק end-to-end.
- Graphify CLI / `graphify-out` לא זמינים בסביבה זו — ניווט ידני ממוקד.
- Overlay lane בציר הוא ויזואלי (לא TrackMeta type); trim/move של overlays בציר עדיין לא.

## Exact Next Steps
1. **CV-7 Export parity** ל-overlays (FFmpeg `overlay`/drawtext) בלי לשבור מנוע EDL — regression tests.
2. לפי GAP_MAP: Timeline gaps/ripple/zoom-around-pointer → CommandBus → Auth/Providers.
3. Artifacts אימות Canvas: `.artifacts/pkgA/canvas_*.png` (מוחרגים מ-git).
