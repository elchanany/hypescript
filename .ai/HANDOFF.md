# HANDOFF

## Goal
<<<<<<< HEAD
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
=======
שילוב ElevenLabs כספק תמלול/קריינות + שליטת הסוכן במודלים/קולות.

## Current State (verified)
ענף: `cursor/elevenlabs-transcription-1547`
- `ELEVENLABS_API_KEY` בשרת בלבד; סטטוס בהגדרות + בחירת ספק/מודל תמלול
- `/api/transcribe` תומך ב-elevenlabs (Scribe v2 + אירועי שמע/diarize)
- `/api/elevenlabs/{voices,models,tts}` לקריינות ובחירת קול/מודל
- כלי סוכן: `transcribe_video(provider,model)`, `list_stt_models`, `list_voices`, `generate_narration`
- local CLI/GUI: `--cloud-provider elevenlabs`
- מפרט: `docs/ElevenLabs_API_HypeScript_2026-08-04.md`
- `npm test` + `tsc --noEmit` עוברים

## Exact Next Steps
1. להגדיר `ELEVENLABS_API_KEY` ב-Vercel / `.env.local` ולבדוק תמלול אמיתי
2. (אופציונלי) Audio Isolation / Pronunciation Dictionaries לפי המפרט
3. **לא** Supabase/Auth בלי אישור

## Risks
- Forced Alignment של ElevenLabs לא מומלץ לעברית — משתמשים ב-word timestamps מ-Scribe
- TTS/STT בתשלום — להימנע מקריאות כפולות מיותרות
>>>>>>> cursor/elevenlabs-transcription-1547
