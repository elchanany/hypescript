# חיבור הענן — בדיוק מה להשיג ואיפה לשים

## כמה ערכים צריך

יש **11 משתנים חובה**:

| מקור | כמות | משתנים |
|---|---:|---|
| Supabase | 3 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| כתובת האתר | 1 | `NEXT_PUBLIC_SITE_URL` |
| Cloudflare R2 | 4 | `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` |
| נוצרים אוטומטית אצלך | 2 | `CLOUD_RENDER_TOKEN`, `CLOUD_RENDER_CALLBACK_SECRET` |
| מתקבל אחרי Cloud Run | 1 | `CLOUD_RENDER_URL` |

Google Login אינו מוסיף משתני Vercel נוספים כשהוא עובד דרך Supabase.

## לפני המפתחות: תיקון ה-SQL

השגיאה `public.system_settings does not exist` תוקנה. המיגרציה כעת עצמאית ואפשר להריץ אותה מחדש גם אם הניסיון הקודם יצר חלק מהטבלאות — כל הפקודות idempotent.

1. פתח [Supabase Dashboard](https://supabase.com/dashboard).
2. בחר את הפרויקט של Hypescript.
3. לחץ **SQL Editor → New query**.
4. העתק את כל [20260810050000_cloud_saas.sql](../supabase/migrations/20260810050000_cloud_saas.sql), הדבק ולחץ **Run**.
5. התוצאה הנכונה היא `Success. No rows returned`.

## הדרך הקצרה ביותר

אחרי יצירת R2 ובחירת Google Project ID, הרץ מתיקיית הפרויקט:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-cloud.ps1 `
  -GoogleProjectId "YOUR_HYPESCRIPT_PROJECT_ID" `
  -SiteUrl "https://YOUR_DOMAIN" `
  -SyncVercel
```

האשף:

1. משתמש אוטומטית במפתחות Supabase שכבר נמצאים ב־`web/.env.local`; אם משהו חסר הוא מבקש אותו.
2. מבקש ארבעה ערכי R2.
3. יוצר לבד שני סודות אקראיים שונים.
4. יוצר Google Secret Manager ו־Service Account ייעודי.
5. פורס את Cloud Run ומקבל את ה־URL.
6. שומר הכול ב־`web/.env.local`.
7. עם `-SyncVercel`, מקשר את הפרויקט ומוסיף את המשתנים ל־Production, Preview ו־Development.

הוא מחייב `GoogleProjectId` מפורש ולא ישתמש אוטומטית בפרויקט `Alonit`.

## 1. Supabase — שלושה ערכים

פתח [Supabase Dashboard](https://supabase.com/dashboard) → הפרויקט → **Settings → API Keys**.

| מה רואים | לאן להעתיק |
|---|---|
| Project URL, מתחיל ב־`https://` ומסתיים ב־`.supabase.co` | `NEXT_PUBLIC_SUPABASE_URL` |
| Publishable key, מתחיל ב־`sb_publishable_` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Secret key, מתחיל ב־`sb_secret_` | `SUPABASE_SERVICE_ROLE_KEY` |

אם מוצגים רק Legacy keys: `anon` מתאים למשתנה הציבורי ו־`service_role` מתאים למשתנה הסודי. לעולם לא לשים Secret במשתנה שמתחיל `NEXT_PUBLIC_`.

Google Login: Supabase → **Authentication → Providers → Google**. אם הכניסה כבר מצליחה, לא משנים דבר.

## 2. Cloudflare R2 — ארבעה ערכים

1. פתח [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Storage & databases → R2 Object Storage**.
2. אם R2 עדיין לא הופעל, לחץ Enable/Purchase. קיימת מכסה חינמית אבל Cloudflare עשוי לדרוש אמצעי תשלום.
3. לחץ **Create bucket**.
4. שם: `hypescript-media`; Storage class: **Standard**; השאר את ה־bucket פרטי.
5. ב־R2 Overview מצא **Account ID** → `R2_ACCOUNT_ID`.
6. שם ה־bucket → `R2_BUCKET`.
7. R2 Overview → **Manage R2 API Tokens → Create Account API token**.
8. Permissions: **Object Read & Write**.
9. Specify bucket: בחר **רק** `hypescript-media`.
10. צור והעתק מיד:
    - Access Key ID → `R2_ACCESS_KEY_ID`
    - Secret Access Key → `R2_SECRET_ACCESS_KEY`

ה־Secret מוצג פעם אחת בלבד.

### CORS שחייבים להוסיף

פתח bucket → **Settings → CORS Policy → Add CORS policy → JSON** והדבק, לאחר החלפת הדומיין:

```json
[
  {
    "AllowedOrigins": ["https://YOUR_DOMAIN", "http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## 3. Google Cloud — בחירה אחת

1. פתח [Google Cloud Project Picker](https://console.cloud.google.com/projectselector2/home/dashboard).
2. צור פרויקט בשם `Hypescript` או בחר פרויקט ייעודי קיים.
3. העתק את **Project ID**, לא את Project name ולא את Project number.
4. פתח [Billing](https://console.cloud.google.com/billing) וקשר Billing Account. Cloud Run לא נפרס בלי Billing גם כשנשארים במכסה החינמית.
5. מסור את ה־Project ID לפרמטר `-GoogleProjectId` של האשף.

אין צורך ליצור ידנית Cloud Run, Service Account או secrets — האשף עושה זאת.

## 4. Vercel — איפה נשמרים 11 הערכים

האשף עם `-SyncVercel` מריץ `vercel link` ומוסיף אותם. הוא עשוי לבקש לבחור Team ופרויקט פעם אחת.

חלופה ידנית: [Vercel Dashboard](https://vercel.com/dashboard) → פרויקט Hypescript → **Settings → Environment Variables**. הוסף את כל 11 המשתנים וסמן **Production + Preview + Development**. לאחר השמירה חובה לבצע Redeploy.

המיקומים הם:

- מקומי: `web/.env.local`.
- אתר/API: Vercel Environment Variables — כל 11 המשתנים.
- Worker: Cloud Run — ארבעת ערכי R2 ושני הסודות בלבד; האשף מכניס אותם דרך Secret Manager.

## בדיקה סופית

```powershell
Invoke-RestMethod "$env:CLOUD_RENDER_URL/health"
```

צריך לקבל:

```json
{ "ok": true, "activeJobs": 0 }
```

אחרי Redeploy: באתר → **הגדרות → ענן ורינדור**. Supabase ו־R2 צריכים להציג `מחובר ונבדק`.
