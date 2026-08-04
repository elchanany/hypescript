# HANDOFF

## Goal
עורך CapCut-class + סוכן AI מעל אותו מנוע. ענף מבודד; **אין merge בלי אישור מפורש**.

## Current State (verified)
ענף: `main` (מיזוג PR #4 + #5…).
- Package A / CommandBus / gaps / Provider Registry — על main.
- **Chat UX:** קיבוץ כרטיסי-כלי + נקודות "חושב".
- **Agent workflow:** `remove_silence` within_existing; `delete_clips` / `keep_source_range` / `clear_clips`; כתוביות עם `script=`; שיחות מרובות (`chatStore`); JSON parse בטוח.
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
