# STACK.md — טכנולוגיות

> הטכנולוגיות בשימוש ולמה נבחרו. משלים את [ARCHITECTURE.md](ARCHITECTURE.md) (מבנה) —
> אין לחזור כאן על תיאור הזרימה, רק על בחירת הכלים.

## web/ (המסלול המרכזי)

| טכנולוגיה | תפקיד | למה |
|---|---|---|
| **Next.js 14** (App Router, TS) | frontend + serverless route | נפרס ב-Vercel בקליק, תומך גם ב-proxy התמלול. |
| **ffmpeg.wasm** (`@ffmpeg/ffmpeg`, `@ffmpeg/util`) | חילוץ אודיו + רינדור בדפדפן | מאפשר עיבוד וידאו מקומי לגמרי מבלי שרת — הליבה של הפרטיות. ליבה חד-תהליכית (בלי דרישת COOP/COEP) לפריסה פשוטה. |
| **Groq Whisper** (`whisper-large-v3`) | תמלול ענן | הכי מדויק לעברית, מהיר, free-tier נדיב, API תואם-OpenAI. |
| **localStorage** | שמירת מפתחות | פשוט, נשאר בדפדפן המשתמש, בלי backend. |

בלי Tailwind/UI-framework — CSS גלובלי פשוט (`web/app/globals.css`) מספיק וקליל.

## local/

| טכנולוגיה | תפקיד | למה |
|---|---|---|
| **Python 3.9+** | שפת הכלי | ספריות עיבוד עשירות, argparse ל-CLI. |
| **FFmpeg / FFprobe** | probe, חיתוך, הרכבה | תקן דה-פקטו, חינמי, מדויק. |
| **faster-whisper** (CTranslate2) | תמלול מקומי | התקנה קלה על Windows, word-timestamps, CPU/int8. |
| **API תואם-OpenAI** (requests) | תמלול ענן | אותו Groq/OpenAI כמו ב-web. |
| **Tkinter** | GUI | מובנה ב-Python, בלי תלות נוספת — "קליל". |

הערת חומרה: מכונת היעד (Intel Core Ultra, בלי NVIDIA) — faster-whisper רץ על ה-CPU;
CTranslate2 לא משתמש ב-Arc iGPU/NPU. זה בכוונה (word-timestamps אמינים).

## עתידי / אפשרי (טרם הוחלט)
- ffmpeg.wasm רב-תהליכי (core-mt) לרינדור מהיר יותר — דורש COOP/COEP.
- ספק/מודל AI לסוכן העתידי (OpenAI וכו') — מחוץ לטווח כרגע.
- שכבת אחסון — נדחתה במכוון.
