# Hypescript Cloud — חיבור חד־פעמי

למדריך קצר ומדויק עם מספר המשתנים, קישורים ישירים ואשף אוטומטי, ראה [CLOUD_KEYS_CHECKLIST_HE.md](./CLOUD_KEYS_CHECKLIST_HE.md).

הקוד מוכן לעבוד במבנה הבא:

- Supabase: משתמשים, פרויקטים, metadata, מכסות ו־RLS.
- Cloudflare R2: קבצי וידאו/אודיו/תמונות פרטיים. הדפדפן מקבל כתובת PUT חתומה ל־15 דקות בלבד.
- Google Cloud Run: קונטיינר FFmpeg שמוריד מ־R2, חותך כל קטע ללא חפיפה, מחבר ומחזיר MP4 ל־R2.
- Vercel: אפליקציית Next.js ו־API מאומת שמתווך בין שלושת השירותים.

שום Secret לא נכנס לקוד או לדפדפן. יש להגדיר אותו ב־Vercel וב־Cloud Run בלבד.

## 1. Supabase

1. פתח Supabase → הפרויקט → **SQL Editor**.
2. הרץ את `20260810050000_cloud_saas.sql`. הוא עצמאי וניתן להרצה חוזרת. `20260804170000_pkg_a_foundation.sql` אופציונלי לתפקידי הניהול והגדרות המערכת המורחבות.
3. ב־Project Settings → API Keys העתק ל־Vercel:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Secret/service role → `SUPABASE_SERVICE_ROLE_KEY`

התחברות Google הקיימת נשארת דרך Supabase. ב־Authentication → Providers → Google צריך Client ID/Secret, וב־URL Configuration צריך Site URL של האתר ו־`https://YOUR_DOMAIN/auth/callback` ברשימת Redirect URLs.

## 2. Cloudflare R2

1. Cloudflare Dashboard → **Storage & databases → R2 → Overview** → Create bucket.
2. שם מומלץ: `hypescript-media`; השאר אותו פרטי.
3. ב־R2 Overview → **Manage API Tokens** → Create Account API token.
4. בחר **Object Read & Write** והגבל את הטוקן ל־bucket הזה בלבד.
5. העתק מיד את Access Key ID ואת Secret Access Key — ה־Secret לא יוצג שוב.
6. ב־bucket → Settings → CORS הוסף את מקור האתר:

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

הגדר ב־Vercel וגם ב־Cloud Run: `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`. Bucket אירופי דורש גם `R2_ENDPOINT=https://ACCOUNT_ID.eu.r2.cloudflarestorage.com`.

## 3. Google Cloud Run

דרישות: פרויקט Google Cloud עם Billing פעיל, ו־gcloud מחובר.

```powershell
gcloud auth login
gcloud config set project YOUR_GOOGLE_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
gcloud run deploy hypescript-render --source .\cloud-render-worker --region me-west1 --allow-unauthenticated --cpu 2 --memory 4Gi --timeout 3600 --concurrency 1 --max-instances 3
```

`--allow-unauthenticated` מאפשר ל־Vercel להגיע לשירות; כל פעולת `/jobs` עדיין נדחית בלי `CLOUD_RENDER_TOKEN`. אל תשתמש באותו ערך ל־callback.

צור שני סודות חזקים ושונים:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

ב־Cloud Run → hypescript-render → Edit & deploy new revision → Variables and Secrets הגדר:

- `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- `CLOUD_RENDER_TOKEN`
- `CLOUD_RENDER_CALLBACK_SECRET`

העתק את URL השירות ל־`CLOUD_RENDER_URL` ב־Vercel. את אותם שני סודות הגדר גם ב־Vercel.

## 4. Vercel

Vercel → Project → Settings → Environment Variables. הוסף לכל שלוש הסביבות (Production, Preview, Development):

```text
NEXT_PUBLIC_SITE_URL=https://YOUR_DOMAIN
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
R2_ACCOUNT_ID=...
R2_BUCKET=hypescript-media
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
CLOUD_RENDER_URL=https://hypescript-render-....run.app
CLOUD_RENDER_TOKEN=...
CLOUD_RENDER_CALLBACK_SECRET=...
```

בצע Redeploy. לאחר התחברות, פתח **הגדרות → ענן ורינדור**. “מחובר ונבדק” ליד Supabase/R2 הוא בדיקה חיה; Cloud Run מסומן “מוגדר” עד עבודת הרינדור הראשונה.

## בדיקת worker לפני חיבור האפליקציה

```powershell
Invoke-RestMethod "$env:CLOUD_RENDER_URL/health"
```

התוצאה הצפויה: `{ "ok": true, "activeJobs": 0 }`.

## אבטחה ותפעול

- R2 פרטי בלבד; אין Public URL קבוע לקבצי לקוחות.
- החלף מיד Secret שנחשף, ועדכן גם Vercel וגם Cloud Run.
- הגבל Cloud Run ל־concurrency 1 כדי למנוע תחרות RAM בין עבודות FFmpeg.
- הגדר Budget Alert ב־Google Cloud ו־R2 לפני פתיחת המוצר לציבור.
- מחיקה מהאפליקציה מוחקת גם את אובייקט R2 וגם את רשומת Supabase.
