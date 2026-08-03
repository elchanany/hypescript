# HANDOFF

## Goal
עורך CapCut-class + סוכן AI מעל אותו מנוע. ענף מבודד; **אין merge בלי אישור מפורש**.

## Current State (verified)
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

## Exact Next Steps
1. להרחיב CommandBus ליותר פעולות UI + parity tests.
2. AG-4 מלא: checkpoints/cost/retry אמיתי לפי tool-call אם יידרש.
3. PR-1 המשך: ProviderConnection/health-check/ExecutionPolicy/Zero-cost.
4. **לא** להתחיל Supabase/Auth בלי אישור (RULES §7).

## Risks
- Roll/Slip/transitions עדיין חסרים.
- חלק מפעולות ה-UI עדיין לא עוברות דרך CommandBus.
- Graphify לא מותקן בסביבה.
