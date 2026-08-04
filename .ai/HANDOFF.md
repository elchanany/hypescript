# HANDOFF

## Goal
המשך GAP / ROADMAP: caption burn-in בייצוא (TX-1) ואז chunking לתמלול ארוך.

## Current State (verified)
- ענף: `cursor/caption-burnin-505e`
- צריבת כתוביות בייצוא דרך PNG + overlayBurn, מתג «צריבה» בפאנל כתוביות
- `npm test` + `npm run build` עברו

## Exact Next Steps
1. למזג PR burn-in (Vercel Deploy אוטומטי).
2. חבילה הבאה: chunking אודיו ארוך ב-web (ROADMAP v0.2.0).

## Risks
- יותר מ-80 כתוביות — נחתכות בצריבה (מגבלת filter graph).
- צריבה מאריכה את זמן הייצוא ב-ffmpeg.wasm.
