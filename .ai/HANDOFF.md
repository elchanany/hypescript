# HANDOFF

## Goal
מערכת continuity משותפת לכל הסוכנים, עם Graphify כברירת מחדל לניווט קוד.

## Current State
- Bootstrap הושלם ואומת בענף `cursor/cross-agent-continuity-3c12`.
- Graphify 0.9.32: integrations ל-Cursor/Codex/Claude/agents + git hooks.
- גרף (אחרי post-commit rebuild): **901 nodes / 1898 edges**.
- `web` vitest: **85/85** עברו; `local/hypescript` compile OK.
- בסיס מוצר ב-`main` (`07b08d1`): PR #4/#5/#6 (agent workflow, quote-place, timeline zoom).

## Active Files
- `.ai/*` (WORKFLOW, PROJECT_STATE, DECISIONS, ACTIVE_WORK, HANDOFF)
- `.cursor/rules/cross-agent-continuity.mdc`, `.cursor/rules/graphify.mdc`
- `.cursor/hooks.json`, `.cursor/hooks/*.sh`, `.cursor/commands/handoff.md`
- `AGENTS.md`, `CLAUDE.md`, `.gitignore`
- `.codex/`, `.claude/`, `.agents/` (Graphify skills/hooks)
- `graphify-out/{graph.json,GRAPH_REPORT.md,graph.html,manifest.json}`

## Changes Made
- Continuity shared + Cursor end-of-turn maintenance (loop_limit=1, fail-open).
- שמירת הוראות מוצר קיימות; עדכון שלב נוכחי ל-v0.3.0 לפי ROADMAP/HANDOFF.
- `.gitignore`: ארטיפקטי גרף משותפים ב-Git; cache/cost/hook-state מחוץ ל-Git.
- בניית גרף מהריפו בפועל.

## Failed Attempts
- אין. `git check-ignore -v` על negation patterns מטעה; `git add -n` אישר שהארטיפקטים trackable.

## Tests and Verification
- JSON של hooks/settings/graph/manifest — תקין.
- `bash -n` לסקריפטי hooks — תקין.
- Stop-hook סינתטי: read-only={}, edit→followup אחד, loop_count/marker/handoff-newer חוסמים לולאה, continuity-only={}, aborted={}.
- `graphify query` על runtime של הסוכן — מחזיר צמתים רלוונטיים (`runtime.ts`, `tools.ts`, `route.ts`).
- `npm test` 85/85; python compile ל-local.

## Open Risks and Assumptions
- `graphify` חייב להיות ב-PATH בכל סביבת סוכן.
- Auth/Supabase עדיין דורשים אישור מפורש.
- Roll/Slip/transitions חסרים במוצר (GAP_MAP).

## Exact Next Steps
1. להביא את ה-bootstrap ל-`main` (PR/merge אם אין push ישיר).
2. אחר כך חזרה למוצר: אימות Vercel מ-`main`; הרחבת CommandBus/AG-4 לפי GAP_MAP; בלי Auth בלי אישור.

## Git State
- Branch: `cursor/cross-agent-continuity-3c12`
- Base: `main` @ `07b08d1`
- אין עבודה לא-קשורה פתוחה
