# PROJECT_STATE.md — מצב יציב של hypescript

עודכן לאחרונה: 2026-08-04 (מיזוג PR #32 ל־`main` — CommandBus agent + multi video tracks).

## מה המוצר

עריכת שיעורי וידאו בעברית לפי סקריפט: חיתוך מדויק, הסרת שתיקות/מהססים, כתוביות RTL מסונכרנות. מסלול מרכזי בדפדפן (`web/`); כלי כבד/אופליין ב-`local/`.

## גרסאות

| גרסה | סטטוס |
|---|---|
| v0.1.0 | קיים — web MVP + local מלא |
| v0.2.0 | חלקי ב־`main` — chunking + caption burn-in; חסר intro/outro/preview |
| v0.3.0 | **אושר במפורש, בעבודה** — סוכן AI + עורך בסגנון CapCut |
| v1.0.0 | יעד יציב עתידי |

## יכולות יציבות שעובדות

- **ליבה משותפת (מסונכרנת):** יישור-סקריפט, keep intervals + הסרת מהססים, SRT/RTL — ב-`web/lib` וב-`local/hypescript`.
- **web:** Next.js על Vercel; ffmpeg.wasm מקומי; תמלול דרך proxy (`/api/transcribe` → Groq); מפתחות ב-`localStorage`/env; `npm run build` עובר.
- **סוכן AI (v0.3.0):** tool-calling, ריבוי ספקים, צ'אט/כרטיסי כלים, multi-chat, within_existing silence, delete_clips/keep_source_range, אנטי-לופ, scriptToClips, כתוביות + תמלול ציר; מוטציות EDL/רצועות דרך EditorApi/CommandBus עם רענון מיידי.
- **הבנת ציר מבוססת ראיות:** speech מתמלול, אירועי `audio_event` של הספק ופערי עריכה מפורשים ממופים ל-per-time-span ב-web+local; אין ניחוש semantics מהיעדר תמלול או מעוצמת dB.
- **Energy evidence:** web יכול למדוד RMS/dBFS ב-opt-in ולמפות low/elevated יחסי לציר הערוך; local מכיל mapper טהור מקביל אך ה-CLI אינו מפיק עדיין את פרופיל ה-dB.
- **Agent artifacts:** וידאו/אודיו/תמונה/SRT חוזרים דרך חוזה typed שמפריד טקסט מ-Blob; ה-LLM מקבל טקסט בלבד וה-Chat מציג כל Blob פעם אחת. הקבצים זמניים ל-session ואינם persisted.
- **כתוביות עברית:** progressive/phrase עם script-as-ground-truth; פיצול תקציב רך מאזן מילה יתומה ב-web+local בלי לחצות פאוזה/פיסוק ובלי לשנות timing.
- **עורך (פאזה 1+):** shell, preview, timeline, Inspector, snap/Magnet, A/V מקושר, CommandBus/gaps, Provider Registry, ציטוט מקום, זום; כמה רצועות video + `clip.trackId` + cutaway flatten בנגן/ייצוא.
- **local:** CLI+GUI, faster-whisper/ענן, intro/outro, burn-in, chunking, retry.
- **בדיקות web:** vitest ~151 על ענף המיזוג; tracks/commands/migrate ממוקדים עברו + tsc.

## מגבלות ידועות

- Roll/Slip חלקיים; transitions חסרים; לא כל UI דרך CommandBus (AG-2 חלקי).
- Multi-track cutaway מחליף גם אודיו מהרצועה המנצחת (אין A-roll audio שמור עדיין).
- Auth/Dashboard/Supabase — דורשים אישור מפורש (RULES §7); קוד חלקי קיים.
- Provider policies / health-check / Zero-cost — חלקיים.
- intro/outro + preview לפני הורדה ב-web — מתוכננים ל-v0.2.0.
- רינדור ffmpeg.wasm איטי מקבצים כבדים (לכן קיים `local/`).
- הווידאו לא עוזב את המחשב; רק אודיו דחוס לתמלול.

## ארכיטקטורה יציבה

- שתי אפליקציות מופרדות; אין ייבוא קוד ביניהן.
- עיבוד וידאו בצד לקוח / מקומי בלבד.
- תיעוד מוצר: `ARCHITECTURE.md`, `STACK.md`, `RULES.md`, `docs/GAP_MAP.md`, `docs/SECURITY_MODEL.md`.
