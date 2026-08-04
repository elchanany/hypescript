# PROJECT_STATE.md — מצב יציב של hypescript

עודכן לאחרונה: 2026-08-04 (אחרי מיזוג טיימליין CapCut inspector/snap ל־`main`).

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
- **סוכן AI (v0.3.0):** tool-calling, ריבוי ספקים דרך proxy, צ'אט עם כרטיסי כלים, multi-chat, within_existing silence, delete_clips/keep_source_range, כתוביות עם script.
- **עורך (פאזה 1+):** shell דו-צדדי, preview עם השמעה ערוכה, timeline רב-מסלולי, Inspector לפי בחירת קליפ/אודיו/כתובית/שכבה, snap guides + Magnet, headers מיושרים, חיתוך A/V מקושר, CommandBus/gaps, Provider Registry, ציטוט מקום בצ'אט, זום גלגלת (~0.15×–128×), קיבוץ כרטיסי-כלי + נקודות "חושב".
- **local:** CLI+GUI, faster-whisper/ענן, intro/outro, burn-in, chunking, retry.
- **בדיקות web (מאומתות בסביבה זו):** `vitest` — 19 files / 85 tests עברו, כולל אינטגרציית render.

## מגבלות ידועות

- Roll/Slip קיימים חלקית (כפתורים+מקלדת); transitions חסרים; לא כל UI עובר עדיין דרך CommandBus.
- Auth/Dashboard/Supabase — דורשים אישור מפורש (RULES §7); קוד חלקי קיים.
- Provider policies / health-check / Zero-cost — חלקיים.
- intro/outro + preview לפני הורדה ב-web — מתוכננים ל-v0.2.0.
- רינדור ffmpeg.wasm איטי מקבצים כבדים (לכן קיים `local/`).
- הווידאו לא עוזב את המחשב; רק אודיו דחוס לתמלול.

## ארכיטקטורה יציבה

- שתי אפליקציות מופרדות; אין ייבוא קוד ביניהן.
- עיבוד וידאו בצד לקוח / מקומי בלבד.
- תיעוד מוצר: `ARCHITECTURE.md`, `STACK.md`, `RULES.md`, `docs/GAP_MAP.md`, `docs/SECURITY_MODEL.md`.
