# HANDOFF

## Goal
עורך CapCut-class + סוכן AI מעל אותו מנוע — עם continuity משותף בין-סוכנים.

## Current State
- `main` כולל PR #9: bootstrap continuity + Graphify (901 nodes / 1898 edges).
- גם ב-`main`: PR #4/#5/#6 (קיבוץ כרטיסי-כלי, agent workflow/multi-chat, ציטוט מקום + זום טיימליין).
- v0.3.0 מאושר ובעבודה; הפערים ב-`docs/GAP_MAP.md`.
- בדיקות אחרונות ב-bootstrap: web vitest 85/85; local compile OK.

## Active Files
- `.ai/*`, `.cursor/rules/*`, `.cursor/hooks/*`, `.cursor/commands/handoff.md`
- `AGENTS.md`, `CLAUDE.md`, Graphify adapters (`.codex/`, `.claude/`, `.agents/`)
- `graphify-out/{graph.json,GRAPH_REPORT.md,graph.html,manifest.json}`
- מוצר: `web/lib/agent/*`, `web/lib/editor/*`, `docs/GAP_MAP.md`

## Changes Made
- Continuity shared + Graphify project integrations הגיעו ל-`main` דרך PR #9.
- אין שינוי התנהגות אפליקציה ב-bootstrap.

## Failed Attempts
- אין.

## Tests and Verification
- Bootstrap: JSON/hooks/stop-loop/graphify-query/web tests עברו לפני המיזוג.
- Vercel על PR #9 היה עדיין pending בזמן המיזוג (לא חסם merge).

## Open Risks and Assumptions
- `graphify` נדרש ב-PATH בכל סביבת סוכן.
- Auth/Supabase דורשים אישור מפורש.
- Roll/Slip/transitions חסרים (GAP_MAP).

## Exact Next Steps
1. לאמת בפריסת Vercel אחרי deploy מ-`main`.
2. להרחיב CommandBus / AG-4 לפי GAP_MAP.
3. **לא** Supabase/Auth בלי אישור.

## Git State
- Branch: `main` (PR #9 merged)
- Continuity + graph מסונכרנים עם אותו snapshot
