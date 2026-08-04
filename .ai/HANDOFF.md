# HANDOFF

## Goal
עורך CapCut-class + סוכן AI מעל אותו מנוע.

## Current State (verified)
ענף: `main` — ממוזגים PR #4 + #5 + #6 (2026-08-04).
- קיבוץ כרטיסי-כלי + נקודות "חושב"
- Agent workflow: within_existing silence, delete_clips/keep_source_range, כתוביות עם script, שיחות מרובות
- ציטוט מקום בצ'אט + זום טיימליין בגלגלת (~0.15×–128×)
- על בסיס CommandBus / gaps / Provider Registry שכבר היו ב-main

## Exact Next Steps
1. לאמת בפריסת Vercel אחרי deploy מ-main
2. להרחיב CommandBus / AG-4 לפי GAP_MAP
3. **לא** Supabase/Auth בלי אישור

## Risks
- Roll/Slip/transitions חסרים
- Graphify לא מותקן בסביבה
