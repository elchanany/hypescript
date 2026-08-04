# מדריך התחברות (Supabase) — צעד־אחר־צעד

> המטרה: להפעיל כפתור **«המשך עם Google»** באתר שלך.  
> בלי זה האפליקציה **עדיין עובדת** במצב מקומי (כמו קודם).  
> הווידאו **לעולם לא** עולה ל־Supabase — רק זהות המשתמש (מי אתה).

---

## מה תצטרך לפני שמתחילים (5 דקות הכנה)

1. חשבון Google (יש לך)
2. חשבון ב־[https://supabase.com](https://supabase.com) — חינם
3. גישה ל־[https://vercel.com](https://vercel.com) לפרויקט hypescript (אם האתר שם)
4. (אופציונלי) להרצה מקומית: קובץ `web/.env.local`

---

## שלב 1 — יצירת פרויקט ב־Supabase

1. היכנס ל־https://supabase.com → **Start your project** / התחבר עם Google
2. לחץ **New project**
3. מלא:
   - **Name:** `hypescript` (או איך שבא לך)
   - **Database password:** תבחר סיסמה חזקה — **תשמור אותה אצלך** (לא צריך אותה עכשיו בקוד)
   - **Region:** קרוב אליך (למשל Frankfurt)
4. לחץ **Create project** וחכה שיהיה Ready (כ־1–2 דקות)

---

## שלב 2 — להעתיק URL + Publishable key (המפתחות החדשים)

1. בתפריט השמאלי של Supabase: **Project Settings** (גלגל שיניים) → **API Keys**
2. הישאר בטאב **Publishable and secret API keys** (לא Legacy)
3. תעתיק:

| מה ב־Supabase | שם המשתנה אצלנו | איך נראה |
|---|---|---|
| **Project URL** (Project Settings → General / API) | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` בלבד |
| **Publishable key** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | מתחיל ב־`sb_publishable_...` |

⚠️ **אל תעתיק** את **Secret key** — זה לשרת בלבד, לא לדפדפן ולא ל־`.env.local` הציבורי.

⚠️ **חשוב מאוד ל־URL:** חייב להסתיים ב־`.supabase.co` **בלי** `/rest/v1` בסוף.  
אם תדביק `https://xxxx.supabase.co/rest/v1` תופיע שגיאה כמו  
`No API key found in request` והכתובת בדפדפן תכלול `/rest/v1/auth/...` — זה לא נכון.  
דוגמה נכונה: `https://dbfednzsladjxjhlwfxr.supabase.co`

---

## שלב 3 — להדביק ב־Vercel (כדי שהאתר החי יעבוד)

1. היכנס ל־https://vercel.com → הפרויקט **hypescript**
2. **Settings** → **Environment Variables**
3. הוסף משתנה ראשון:
   - Key: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: ה־Project URL
   - Environments: Production + Preview + Development (סמן הכול)
4. הוסף משתנה שני:
   - Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: ה־anon key
5. **Save**
6. חשוב: אחרי הוספת משתנים — לך ל־**Deployments** → על ה־Deployment האחרון → **⋯** → **Redeploy**  
   (בלי Redeploy האתר הישן לא יראה את המפתחות החדשים)

---

## שלב 4 — להפעיל Google בתוך Supabase

1. ב־Supabase: **Authentication** → **Providers** → **Google** → Enable
2. Supabase יבקש ממך **Client ID** ו־**Client Secret** מ־Google Cloud:

### 4א — Google Cloud Console

1. היכנס ל־https://console.cloud.google.com
2. צור פרויקט חדש (או בחר קיים) בשם למשל `hypescript-auth`
3. תפריט ☰ → **APIs & Services** → **OAuth consent screen**
   - User Type: **External** → Create
   - App name: `hypescript`
   - User support email: האימייל שלך
   - Developer contact: האימייל שלך
   - Save
4. **Credentials** → **Create credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `hypescript-web`
   - **Authorized JavaScript origins:**
     - `http://localhost:3000`
     - `https://YOUR-VERCEL-DOMAIN.vercel.app` (הדומיין האמיתי שלך מ־Vercel)
   - **Authorized redirect URIs:**  
     העתק מ־Supabase (במסך Google provider) את ה־**Callback URL**  
     נראה בערך כך:  
     `https://xxxx.supabase.co/auth/v1/callback`
5. Create → יופיעו **Client ID** ו־**Client Secret** → הדבק אותם ב־Supabase Google provider → Save

### 4ב — Redirect אחרי התחברות (ב־Supabase)

1. Supabase → **Authentication** → **URL Configuration**
2. **Site URL:**  
   - לפרודקשן: `https://YOUR-VERCEL-DOMAIN.vercel.app`  
   - או בינתיים `http://localhost:3000`
3. **Redirect URLs** — הוסף בשורות נפרדות:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/callback**`
   - `https://YOUR-VERCEL-DOMAIN.vercel.app/auth/callback`
   - `https://YOUR-VERCEL-DOMAIN.vercel.app/auth/callback**`
4. Save

> האפליקציה משתמשת ב־`@supabase/ssr` (cookies) + Route Handler ב־`/auth/callback`  
> כדי למנוע את השגיאה `PKCE code verifier not found in storage`.

---

## שלב 5 — בדיקה שהכול חי

1. אחרי Redeploy ב־Vercel, פתח את האתר
2. לך ל־`/login` או ל־`/dashboard`
3. לחץ **המשך עם Google**
4. אמור להחזיר אותך ל־`/dashboard` מחובר (תראה את האימייל למעלה)

אם משהו נכשל:
- «התחברות לא מוגדרת» → המשתנים לא ב־Vercel או לא עשית Redeploy
- שגיאת redirect_uri_mismatch → ה־Callback URL ב־Google לא זהה לזה של Supabase
- `PKCE code verifier not found` / חוזר ל־login →
  1. ודא ש־Deploy כולל את `@supabase/ssr` (גרסה אחרי התיקון הזה)
  2. Redirect URLs: `https://YOUR-DOMAIN/auth/callback` וגם `.../auth/callback**`
  3. Site URL = אותו דומיין שבו אתה גולש עכשיו
  4. התחל את Google login מחדש מאותו דפדפן (אל תפתח את קישור ה-callback בלשונית אחרת)
  5. Redeploy אחרי שינוי env

---

## הרצה מקומית (אופציונלי)

כבר יש לך תבנית מוכנה:

1. פתח את הקובץ `web/.env.local` (נוצר מראש עם מקום לכל המפתחות)
2. הדבק שם גם את שני משתני ה-Supabase (ואת שאר המפתחות אם צריך)
3. שמור

אם הקובץ חסר אצלך:

```bash
cd web
cp .env.example .env.local
```

ואז:

```bash
cd web
npm i
npm run dev
```

פתח http://localhost:3000/login

---

## Package A — משתני שרת נוספים

| משתנה | איפה | תפקיד |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Server / Vercel בלבד | Bootstrap System Owner + פעולות admin עתידיות |
| `BOOTSTRAP_SUPER_ADMIN_EMAIL` | Server בלבד | אימייל הבעלים הראשון (למשל `eyceyceyc139@gmail.com`) |
| `ALLOW_GUEST_EDITOR` | Server | `true` = אפשר לפתוח עורך בלי login גם כש-Auth מוגדר |
| `NEXT_PUBLIC_SITE_URL` | Public | בסיס ל-Open Graph / קישורים |

אחרי יצירת המשתמש הראשון עם האימייל של ה-Bootstrap, ה-API `/api/auth/bootstrap` קושר `system_owner` לפי UUID — לא לפי השוואת אימייל בכל request.

### Migration

הרץ (Staging/local בלבד — לא Production בלי אישור):

```bash
# דרך Supabase CLI או SQL Editor
supabase db push
# או העתק את:
# supabase/migrations/20260804170000_pkg_a_foundation.sql
```

המיגרציה יוצרת: `profiles`, `user_settings`, `roles`/`permissions`/`user_roles`, `audit_logs`, `login_events`, `credit_accounts` (stub), `system_settings`, triggers להגנת System Owner, ו-RLS.

---

## מה קורה במוצר אחרי זה

| דף | מה עושה |
|---|---|
| `/dashboard` | רשימת הפרויקטים המקומיים שלך + התחברות |
| `/login` | Google + אימייל/סיסמה + magic link + איפוס |
| `/onboarding` | שם תצוגה, theme, מצב פרויקט, הסכמה |
| `/` | העורך (דורש login אם Auth מוגדר ו-`ALLOW_GUEST_EDITOR` כבוי) |
| `/settings` | מפתחות AI + מראה + אודות |

**זכור:** הפרויקטים והווידאו נשארים במחשב (IndexedDB). ההתחברות = מי אתה, לא איפה הסרטון.

---

## פתרון תקלות

### `No API key found in request` / כתובת עם `/rest/v1/auth/...`

הסיבה כמעט תמיד: ב־Vercel (או ב־`.env.local`) הערך של `NEXT_PUBLIC_SUPABASE_URL` כולל `/rest/v1` בסוף.

1. Vercel → Settings → Environment Variables → ערוך `NEXT_PUBLIC_SUPABASE_URL`
2. שים **רק**: `https://YOUR_REF.supabase.co` (בלי שום נתיב אחרי)
3. Save → Deployments → **Redeploy**
4. נסה שוב `/login`

(בקוד יש גם נרמול אוטומטי שמסיר `/rest/v1` — אבל חייבים Redeploy אחרי עדכון הקוד/המשתנים.)

