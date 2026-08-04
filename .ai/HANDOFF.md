# HANDOFF

## Goal
עורך CapCut-class + סוכן AI מעל אותו מנוע. ענף מבודד; **אין merge בלי אישור מפורש**.

## Current State (verified)
<<<<<<< HEAD
ענף: `cursor/timeline-cmdbus-505e` (מעל `main` אחרי מיזוג Package A).
- Package A על main: shell, Agent dock, Canvas, Export overlays, DeepSeek normalize.
- **סבב זה:**
  - TL-1: gaps (`__gap__`), ripple vs leave-gap, close gap, Preview שחור, Export lavfi black
  - Zoom around pointer (Ctrl/Meta+wheel)
  - Overlay trim/move בציר
  - Canvas snap (מרכז + שולי 10%, Alt מבטל)
  - CommandBus (`commands.ts` + builtins) + Query API
  - Agent tools: leave_gap, set_clip_enabled/volume, list/add/update/delete overlay
- **סבב PR-1 / AG-4 בסיסי:**
  - Provider Registry כנה ב-`web/lib/providers/`: LLM proxy אמיתי בלבד + Groq transcription, status לפי `/api/config`.
  - Settings ו-Chat משתמשים ב-registry; Chat חוסם בחירת LLM חסר מפתח ומציג סיבה.
  - Tool activity מציג ספק, Retry prompt לכשל, וטיפ ביטול ברור ("בטל").
  - תיעוד עודכן: Provider Matrix, Gap Map. אין Supabase/Auth, אין ספקים מדומים.
- אימות אחרון: `cd web && npx tsc --noEmit && npx vitest run` נקי — 14 files / 65 tests.
- Graphify: לא מותקן בסביבה (`graphify-not-installed`), לכן לא רץ `graphify update .`.
=======
ענף: `cursor/chat-collapse-tools-thinking-e91a` (על בסיס main אחרי מיזוג shell).
- **Package 1 (הושלם):** design system; פאנלים ניתנים לשינוי גודל; Media grid/list + thumbnails; טקסט כתוביות בציר; Ghost+Drop indicator.
- **Agent dock (הושלם):** flex dock מעוגן; Ask/Plan/Act עם אכיפה אמיתית (`tools:[]`); `/` slash; `@mentions`; context chips.
- **Chat UX (סבב זה):** קיבוץ כרטיסי-כלי זהים רצופים (`collapseTools.ts`) + אינדיקטור נקודות "חושב" בין פעולות.
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
>>>>>>> origin/cursor/chat-collapse-tools-thinking-e91a

## Exact Next Steps
1. להרחיב CommandBus ליותר פעולות UI + parity tests.
2. AG-4 מלא: checkpoints/cost/retry אמיתי לפי tool-call אם יידרש.
3. PR-1 המשך: ProviderConnection/health-check/ExecutionPolicy/Zero-cost.
4. **לא** להתחיל Supabase/Auth בלי אישור (RULES §7).

## Risks
- Roll/Slip/transitions עדיין חסרים.
- חלק מפעולות ה-UI עדיין לא עוברות דרך CommandBus.
- Graphify לא מותקן בסביבה.
