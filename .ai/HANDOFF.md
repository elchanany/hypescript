# HANDOFF

## Goal
עורך CapCut-class + סוכן AI מעל אותו מנוע. ענף מבודד; **אין merge בלי אישור מפורש**.

## Current State (verified)
ענף: `main` (מיזוג PR #4+…).
- Package A על main: shell, Agent dock, Canvas, Export overlays, DeepSeek normalize.
- CommandBus / gaps / Provider Registry / Chat retry — ממוזגים.
- **Chat UX:** קיבוץ כרטיסי-כלי זהים (`collapseTools`) + נקודות "חושב" בין פעולות.
- Graphify: לא מותקן בסביבה זו.

## Exact Next Steps
1. להרחיב CommandBus ליותר פעולות UI + parity tests.
2. AG-4 מלא: checkpoints/cost/retry אמיתי לפי tool-call אם יידרש.
3. PR-1 המשך: ProviderConnection/health-check/ExecutionPolicy/Zero-cost.
4. **לא** להתחיל Supabase/Auth בלי אישור (RULES §7).

## Risks
- Roll/Slip/transitions עדיין חסרים.
- חלק מפעולות ה-UI עדיין לא עוברות דרך CommandBus.
- Graphify לא מותקן בסביבה.
