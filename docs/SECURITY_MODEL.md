# SECURITY_MODEL

## עקרונות
- מפתחות API **לעולם** ב-Project JSON / localStorage / URL / client bundle / client logs / chat / analytics.
- מפתחות ענן: מוצפנים בשרת; הדפדפן מקבל רק `connectionId`, masked key, status, capabilities.
- מפתחות מקומיים: בשירות מקומי / Credential store של מערכת ההפעלה.
- כל פעולת AI עוברת בדיקת הרשאה (עתידי, עם Provider Registry + roles).
- OAuth והקצאת System-Owner — server-side בלבד; אין hardcode של email ב-frontend (`BOOTSTRAP_OWNER_EMAIL` server-side).

## מצב נוכחי (אמת) ופערים ידועים
| נושא | מצב | פער / פעולה נדרשת |
|---|---|---|
| מפתחות LLM (deepseek/openai/anthropic/gemini) | ✔ server-side env בלבד; proxy `/api/agent`; לא מגיעים לדפדפן | תקין |
| `/api/config` | ✔ מחזיר בוליאני "מוגדר?" בלבד, לא ערכים | תקין |
| מפתח תמלול (Groq) | ⚠️ env קודם; עדיין יש fallback ממפתח לקוח ל-dev | **פער**: להסיר fallback client-side לגמרי |
| מפתח ElevenLabs | ✔ `ELEVENLABS_API_KEY` server-side בלבד (`/api/transcribe`, `/api/elevenlabs/*`); לא נחשף ללקוח | תקין — לא להוסיף `NEXT_PUBLIC_` |
| Auth / roles / RLS | ◐ אופציונלי | Supabase Auth (Google) כשמוגדרים `NEXT_PUBLIC_SUPABASE_URL` + Publishable key ב-`NEXT_PUBLIC_SUPABASE_ANON_KEY`. בלי מפתחות — מצב מקומי רגיל. פרויקטים/וידאו נשארים ב-IndexedDB. RLS/roles לענן־פרויקטים — עתידי. מדריך: `docs/SETUP_AUTH.md`. אין Secret/service_role בצד לקוח. |
| Zero-cost enforcement | ✖ אין Policy engine | חבילת ספקים: לחסום user-billed/unknown ללא אישור |
| Secrets בלוגים/הודעות סוכן | ✔ אין הדפסת מפתחות; שגיאות ספק חתוכות ל-400 תווים | לוודא sanitization ב-AppError (חבילת שגיאות) |

## Agent
- הסוכן אינו מבצע DOM automation ואינו משנה React state ישירות — פועל דרך כלים/מודל בלבד.
- Ask/Plan: **ללא כלים** (אכיפה ב-runtime) → אינו יכול לשנות פרויקט. Act: כלים מלאים.
- עתידי: permission re-check בזמן פעולה, אישור לפני upload/cloud/paid, idempotency למניעת כפילויות.

## נתונים
- אין מחיקת נתוני פרויקט אוטומטית; שינוי schema רק עם `schemaVersion` + migration.
- Chunk-reload guard קיים (`ChunkReload`) לשמירת state לפני reload.
