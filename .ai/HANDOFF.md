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
- אימות: `tsc` נקי; vitest ירוק כולל graph 20-cut + timelineOps + gap graph unit.

## Exact Next Steps
1. להרחיב CommandBus ליותר פעולות UI + parity tests.
2. AG-4 tool activity / checkpoints.
3. Provider Registry (כנה).
4. **לא** להתחיל Supabase/Auth בלי אישור (RULES §7).

## Risks
- Roll/Slip/transitions עדיין חסרים.
- חלק מפעולות ה-UI עדיין לא עוברות דרך CommandBus.
- Graphify לא מותקן בסביבה.
