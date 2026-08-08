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
| `/api/config` | ✔ מחזיר בוליאני "מוגדר?" בלבד, לא ערכים; UI מסמן `configured_unverified` ולא טוען שהספק זמין | live health-check עדיין חסר |
| מפתח תמלול (Groq) | ⚠️ env קודם; עדיין יש fallback ממפתח לקוח ל-dev | **פער**: להסיר fallback client-side לגמרי |
| מפתח ElevenLabs | ✔ `ELEVENLABS_API_KEY` server-side בלבד (`/api/transcribe`, `/api/elevenlabs/*`); לא נחשף ללקוח | תקין — לא להוסיף `NEXT_PUBLIC_` |
| Auth / roles / RLS | ◐ Package A | Supabase Auth (Google + email/password + magic link) כשמוגדרים `NEXT_PUBLIC_SUPABASE_URL` + Publishable key. Migration: `supabase/migrations/20260804170000_pkg_a_foundation.sql` — profiles, RBAC, system_owner protection, audit, credit_accounts stub, RLS. Bootstrap: `BOOTSTRAP_SUPER_ADMIN_EMAIL` + `SUPABASE_SERVICE_ROLE_KEY` (server-only). Guest editor: `ALLOW_GUEST_EDITOR`. פרויקטים/וידאו עדיין ב-IndexedDB. MFA/Admin UI/Ledger — חבילות הבאות. מדריך: `docs/SETUP_AUTH.md`. אין Secret בצד לקוח. |
| Zero-cost enforcement | ◐ client policy קיים | LLM/STT/TTS עם `metered_external`/`unknown` נחסמים לפני קריאה עד אישור מפורש לפי ספק; נותרה אכיפת server/roles ומדיניות ארגונית |
| Secrets בלוגים/הודעות סוכן | ✔ אין הדפסת מפתחות; שגיאות ספק חתוכות ל-400 תווים | לוודא sanitization ב-AppError (חבילת שגיאות) |

## Agent
- הסוכן אינו מבצע DOM automation ואינו משנה React state ישירות — פועל דרך כלים/מודל בלבד.
- Ask/Plan: **ללא כלים** (אכיפה ב-runtime) → אינו יכול לשנות פרויקט. Act: כלים מלאים.
- אישור client-side קיים לפני LLM/STT/TTS חיצוניים; עתידי: permission re-check server-side בזמן פעולה, אישור upload/cloud לפי roles, idempotency למניעת כפילויות.

## נתונים
- אין מחיקת נתוני פרויקט אוטומטית; שינוי schema רק עם `schemaVersion` + migration.
- Chunk-reload guard קיים (`ChunkReload`) לשמירת state לפני reload.
