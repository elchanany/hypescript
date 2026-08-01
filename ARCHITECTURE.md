# ARCHITECTURE.md — מבנה המערכת

> מבנה שתי האפליקציות, הזרימה בין החלקים, וניהול הנתונים. משקף את המצב **בפועל**.
> טכנולוגיות ולמה — ראה [STACK.md](STACK.md).

## שתי אפליקציות, ליבה משותפת

```
hypescript/
├── web/     Next.js — רץ בדפדפן, נפרס ב-Vercel
├── local/   Python — CLI + GUI, רץ במחשב
└── (docs)   AGENTS/RULES/ROADMAP/...
```

לוגיקת הליבה מיושמת פעמיים ומחזירה תוצאות זהות (ראה [RULES.md](RULES.md) §3):

| שלב ליבה | web (TS) | local (Python) |
|---|---|---|
| יישור-לפי-סקריפט | `web/lib/align.ts` | `local/hypescript/editing.py` |
| הסרת שתיקות/מהססים + קטעי keep | `web/lib/editing.ts` | `local/hypescript/editing.py` |
| כתוביות SRT + RTL + מיפוי ציר-זמן | `web/lib/subtitles.ts` | `local/hypescript/subtitles.py` |
| מבני נתונים | `web/lib/models.ts` | `local/hypescript/models.py` |

## זרימת נתונים (web)

```
וידאו (נבחר בדפדפן, נשאר מקומי)
        │
        ▼  ffmpeg.wasm (web/lib/ffmpeg.ts)  — חילוץ אודיו mono דחוס
        ▼  POST /api/transcribe  → proxy → Groq/OpenAI  → מילים + timestamps
        ▼  align.ts: מסכת שמירה לפי סקריפט
        ▼  editing.ts: + הסרת מהססים → buildKeepIntervals (קטעי keep)
        ▼  subtitles.ts: buildCues → SRT (ציר-זמן ערוך, RTL)
        ▼  ffmpeg.wasm: renderCut (trim+concat) → mp4 להורדה
```

עקרונות מפתח:
- **הווידאו לא עולה לשרת.** הוא נטען ומעובד בדפדפן. רק האודיו הדחוס יוצא לתמלול.
- **`/api/transcribe`** (Next serverless, `web/app/api/transcribe/route.ts`) הוא
  proxy דק בלבד — מעביר את האודיו + מפתח המשתמש ל-Groq. נדרש כי OpenAI חוסם CORS
  מהדפדפן. המפתח לא נשמר בשרת.
- **מפתחות** נשמרים ב-`localStorage` בדפדפן (`web/lib/keys.ts`, עמוד `/settings`).

## זרימת נתונים (local)

`cli.py` מתזמר: probe → חילוץ אודיו (FFmpeg) → תמלול (`transcription.py`: faster-whisper
מקומי או ענן) → editing → subtitles → הרכבה (`media.py`: FFmpeg trim+concat, אופציונלי
burn-in/אינטרו/אאוטרו). `gui.py` הוא front-end של Tkinter שמריץ את ה-CLI כתת-תהליך.

## החלטת מפתח: למה ffmpeg.wasm ולא עיבוד בשרת

Vercel הוא serverless ולא יכול להריץ FFmpeg כבד (מגבלות זמן/דיסק/גודל). הרצת FFmpeg
בדפדפן (WASM) פותרת בו-זמנית את שלוש הדרישות: וידאו נשאר מקומי, האתר נפרס ב-Vercel,
וכלום לא מאוחסן. המחיר: הרינדור איטי יותר מ-native, ולכן לקבצים כבדים משתמשים ב-`local`.

## מה שטרם הוחלט
- אחסון/העלאה בענן (נדחה במכוון; כרגע הכל מקומי).
- ארכיטקטורת סוכן ה-AI (מחוץ לטווח — ראה [ROADMAP.md](ROADMAP.md)).
- chunking של אודיו ארוך בגרסת ה-web (קיים ב-local; מתוכנן ל-web ב-v0.2.0).
