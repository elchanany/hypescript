# ACTIVE_WORK.md

## Current task
AG-2 — Inspector/timeline parity. clip trim/enabled/volume, subtitle edit/retime/delete ו-timeline reorder עוברים דרך CommandBus. Clip opacity נשאר פער מפורש כי אינו מחובר ל-Preview/Export.

## Branch
`main`

## Latest commit
`1f6039a` — overlay parity + post-commit Graphify sync על main

## Status
מוכן ל־commit · tsc נקי, 202/202 tests, production build ו־Graphify update (1592 nodes / 3389 edges) עברו

## Exact continuation point
commit+push; אחר כך media.add parity או clip opacity Preview+Export. בלי שינוי Supabase/Auth ללא אישור.
