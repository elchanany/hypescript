# HANDOFF

## Goal
הפיכת Hypescript לעורך וידאו מקצועי (CapCut-class) + סוכן AI אוטונומי מעל אותו מנוע.
עובדים לפי שני מסמכי המפרט (Package A / Packages 1–4): עורך חזותי, Agent dock מקצועי, Canvas direct manipulation, Timeline מקצועי, ומסמכי אודיט. Cloud Agent: commit/push לענף מבודד בלבד; **אין merge/deploy ללא "מאשר לדחוף"**.

## Current State (verified)
ענף: `cursor/editor-shell-pkg1-505e` · PR טיוטה #1 (לא ממוזג).
- **Package 1 (הושלם + נבדק):** design system קיים; פאנלים ניתנים לשינוי גודל (left/inspector/timeline/dock) + persist + dbl-reset; Media grid/list + thumbnails אמיתיים; טקסט כתוביות בציר; Ghost+Drop indicator בגרירה.
- **Agent dock (חדש בסבב זה):** הומר מ-Overlay ל-פאנל flex מעוגן שמכווץ סביבת עבודה, לא מכסה Timeline; resizable + dock side (L/R) + persist; מצבי Ask/Plan/Act עם **אכיפה אמיתית** (Ask/Plan → `tools:[]` ב-runtime, אינם משנים פרויקט); פקודות `/` (עם disabled+reason); `@mentions` על ישויות אמיתיות; context chips (playhead/selection/clips/captions).
- **מנוע ייצוא:** native FFmpeg + ffprobe — נבדק, לא נגעתי.
- אימות: `tsc` נקי; 33/33 tests; build עובר (בסבב הקודם). אימות סבב זה מתבצע.

## Active Files
- `web/app/page.tsx` — shell + docking (agentDock, dockSide, resize).
- `web/components/Chat.tsx` — Composer: modes/slash/mentions/context chips (מעל `AgentRunner` הקיים).
- `web/lib/agent/{runtime,types,tools}.ts` — `AgentMode`, `MODE_PROMPTS`, אכיפת כלים לפי מצב.
- `web/app/globals.css` — `.agent-dock/.agent-modes/.ctx-chip/.cmd-pop`, media-grid, col-resize, ghost/drop.
- `web/components/{MediaPanel,Timeline,InspectorPanel}.tsx` — Package 1.
- `docs/` — REFERENCE_UI_MAP, EDITOR_FEATURE_MATRIX, AGENT_UI_PARITY, PROVIDER_CAPABILITY_MATRIX, DATA_MODEL, SECURITY_MODEL.

## Risks / Known limitations
- אין screenshots של ה-reference בשיחה → REFERENCE_UI_MAP מבוסס תיאור מילולי; להשלים per-screenshot כשיתקבלו.
- אין API keys בסביבה → ריצת סוכן חיה (LLM) לא נבדקה end-to-end; נבדקת שכבת ה-UI/UX בלבד (popups/modes/chips/dock). ריצה חיה מציגה שגיאת "אין מפתח" — התנהגות כנה.
- מפתח Groq client-side — פער אבטחה מתועד ב-SECURITY_MODEL (לתקן בחבילת ספקים).
- Canvas direct manipulation, CommandBus מרכזי, gaps/ripple, transitions/effects/keyframes — לא ממומשים עדיין.

## Exact Next Steps (החבילה הבאה — Canvas Direct Manipulation)
1. הרחבת מודל: `VisualElement`+`VisualTransform` (schemaVersion bump + migration), tracks מסוג overlay/text/image.
2. `PreviewCompositor` + project-coordinate math (`projectToViewport...`, hit-test, matrices).
3. Bounding box + drag/resize/rotate + snapping + inspector/timeline sync; commit יחיד ל-Undo לכל gesture.
4. Preview/Export parity ל-position/scale/rotation/opacity (בלי לשבור מנוע ה-EDL הנבדק).
5. במקביל: להתחיל CommandBus מרכזי כדי לאחד UI/Agent parity (Query API + registry).
