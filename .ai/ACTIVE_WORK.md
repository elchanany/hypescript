# ACTIVE_WORK.md

## Current task
AG-2 — Command registry contracts. לכל פקודה יש input/result schema, permissions, contexts ו-agentCallable; `runCommand` מאמת required/types לפני mutation ו־`listAgentCommands` מסנן surface סוכנית.

## Branch
`main`

## Latest commit
`96f53e9` — track height/reorder parity על main

## Status
מוכן ל־commit · tsc נקי, 175/175 tests, production build ו־Graphify update עברו

## Exact continuation point
commit+push; אחר כך לחבר command surfaces דינמית או לעבור ל־AG-4 לפי audit. בלי שינוי Supabase/Auth ללא אישור.
