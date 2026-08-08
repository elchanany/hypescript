# ACTIVE_WORK.md

## Current task
AG-2 — Safe Asset removal. media.remove עובר ב-CommandBus, מסרב להסיר asset שבשימוש ב-clips/overlays, ורק בהצלחה מבטל object URL; תפריט asset נגזר מה-Registry להסרה.

## Branch
`main`

## Latest commit
`dccf792` — subtitle CommandBus + Caption menu על main

## Status
מוכן ל־commit · tsc נקי, 198/198 tests, production build ו־Graphify update עברו

## Exact continuation point
commit+push; אחר כך audit AG-2 remaining UI mutations מול TX-1 animation. בלי שינוי Supabase/Auth ללא אישור.
