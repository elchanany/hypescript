# hypescript web

עורך שיעורי וידאו בעברית שרץ **בדפדפן** — חיתוך לפי סקריפט, הסרת נשימות/מהססים,
וכתוביות עברית. נפרס ב-Vercel.

## איך זה עובד (ארכיטקטורה)

Vercel הוא serverless ולא יכול להריץ FFmpeg כבד בצד-שרת. לכן:

- **עיבוד הווידאו רץ בדפדפן** דרך `ffmpeg.wasm` — הווידאו **לא עוזב את המחשב שלך**.
- רק **האודיו הדחוס** נשלח לתמלול (Groq או ElevenLabs), דרך פונקציית שרת
  (`/api/transcribe`) שרק מעבירה את הבקשה הלאה (כדי לעקוף CORS). מפתחות ב-env של
  השרת (`GROQ_API_KEY` / `ELEVENLABS_API_KEY`) — לא בדפדפן.
- כל שאר הלוגיקה (יישור-סקריפט, הסרת שתיקות/מהססים, SRT) רצה בדפדפן ב-TypeScript
  — פורט מדויק של הגרסה המקומית ב-`../local`.

```
וידאו בדפדפן ─▶ ffmpeg.wasm מחלץ אודיו ─▶ /api/transcribe ─▶ Groq / ElevenLabs
                                                                    │
     mp4 ערוך (הורדה) ◀─ ffmpeg.wasm חותך ◀─ חיתוכים+SRT (בדפדפן)  ◀┘
```

## הרצה מקומית

```bash
cd web
npm install
# הוסף ל-web/.env.local למשל:
# GROQ_API_KEY=...
# ELEVENLABS_API_KEY=...
npm run dev
```

פתח http://localhost:3000 → עמוד **הגדרות** → ודא שמפתח התמלול מוגדר → חזור לעורך.

## פריסה ב-Vercel

1. דחוף את הריפו ל-GitHub.
2. ב-Vercel: **New Project** → בחר את הריפו → **Root Directory = `web`**.
3. הגדר משתני סביבה: `GROQ_API_KEY` ו/או `ELEVENLABS_API_KEY`, ומפתחות ספק ה-AI.
4. Deploy.

## מגבלות v1

- הרינדור בדפדפן (ffmpeg.wasm, חד-תהליכי) מתאים לסרטונים קצרים-בינוניים. לקבצים
  כבדים/ארוכים עדיף להוריד את ה-SRT ולהריץ את הכלי המקומי שב-`../local`.
- התמלול עובר דרך פונקציית שרת עם מגבלת גוף (~4.5MB) — האודיו מחולץ ב-mono דחוס,
  כך ש-5–10 דק' נכנסות. לקבצים ארוכים מאוד — chunking יתווסף בהמשך.

## מבנה

- `app/page.tsx` — העורך (מפעיל את כל ה-pipeline בדפדפן).
- `app/settings/page.tsx` — מפתחות API (localStorage).
- `app/api/transcribe/route.ts` — proxy ל-Groq/OpenAI/ElevenLabs.
- `app/api/elevenlabs/` — קולות, מודלים, TTS.
- `lib/align.ts`, `lib/editing.ts`, `lib/subtitles.ts` — פורט האלגוריתמים.
- `lib/ffmpeg.ts` — עטיפת ffmpeg.wasm (חילוץ אודיו + רינדור).
