# ACTIVE_WORK.md

## Current task
AG-2 — Bulk workflow command parity. Clip opacity מחובר כעת UI→CommandBus→Preview→FFmpeg→Agent מול שחור; flatten שומר גבולות effect. נותר להעביר כלי bulk/workflow של הסוכן מ-EditorApi ישיר לפקודות אטומיות.

## Branch
`main`

## Latest commit
`9710720` — media placement parity + Graphify sync על main

## Status
מוכן ל־commit · tsc נקי, 207/207 tests, production build ו-Graphify update (1592 nodes / 3392 edges) עברו; native 20-cut opacity render שומר durationDelta=0 ו-audioDrift=0

## Exact continuation point
commit+push; אחר כך commandize bulk clip/subtitle workflow mutations. בלי שינוי Supabase/Auth ללא אישור.
