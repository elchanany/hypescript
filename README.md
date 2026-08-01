# hypescript

כלי לעריכה אוטומטית של שיעורי וידאו בעברית: **חיתוך לפי סקריפט** (משאיר רק את
הטקסט שאתה נותן), **הסרת נשימות/שתיקות/מהססים**, ו**כתוביות עברית** מסונכרנות.

> **גרסה נוכחית: v0.1.0** — web MVP + כלי local, שניהם עובדים.
> **הבא בתור:** ליטוש ה-web ל-production (v0.2.0). ראה [ROADMAP.md](ROADMAP.md).
> סוכנים/כלי AI: התחילו מ-[AGENTS.md](AGENTS.md).

## מבנה

| תיקייה | מה זה | למי |
|---|---|---|
| [`web/`](web/) | **אפליקציית ווב** (Next.js) שרצה בדפדפן ונפרסת ב-Vercel. עיבוד הווידאו מקומי דרך `ffmpeg.wasm` — הווידאו לא עוזב את המחשב. | המסלול המרכזי |
| [`local/`](local/) | **כלי CLI + GUI** בפייתון (FFmpeg + faster-whisper/ענן). מהיר יותר לקבצים כבדים, ורץ 100% מקומי. | עיבוד כבד/לא-מקוון |

שתי הגרסאות חולקות את אותה לוגיקת ליבה — ב-`web` ב-TypeScript, ב-`local` בפייתון
(ראה [ARCHITECTURE.md](ARCHITECTURE.md), וחובת הסנכרון ב-[RULES.md](RULES.md) §3).

## איך מריצים

- **ווב (מקומית):** `cd web && npm install && npm run dev` → http://localhost:3000 →
  הזן מפתח Groq בעמוד ההגדרות. פרטים: [web/README.md](web/README.md).
- **ווב (פריסה):** Vercel → New Project → **Root Directory = `web`** → Deploy.
- **מקומי (CLI/GUI):** ראה [local/README.md](local/README.md).

## תיעוד הפרויקט

[AGENTS.md](AGENTS.md) (כניסה) · [RULES.md](RULES.md) · [ROADMAP.md](ROADMAP.md) ·
[PRODUCT_VISION.md](PRODUCT_VISION.md) · [ARCHITECTURE.md](ARCHITECTURE.md) ·
[STACK.md](STACK.md) · [UI_GUIDELINES.md](UI_GUIDELINES.md)

## בהמשך

סוכן **AI** שיֵדע לחתוך ולערוך לבד — ישתמש במפתח ה-OpenAI/AI שמוגדר בהגדרות הווב
(מחוץ לטווח עד אישור מפורש).
