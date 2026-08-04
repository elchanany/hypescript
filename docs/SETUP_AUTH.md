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

## שלב 2 — להעתיק שני מפתחות (הציבוריים בלבד)

1. בתפריט השמאלי של Supabase: **Project Settings** (גלגל שיניים) → **API**
2. תעתיק בדיוק שני דברים:

| מה ב־Supabase | שם המשתנה אצלנו | הערה |
|---|---|---|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` | נראה כמו `https://xxxx.supabase.co` |
| **anon public** key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | מפתח ארוך שמתחיל ב־`eyJ...` |

⚠️ **אל תעתיק** את `service_role` — זה סודי לשרת בלבד, ואנחנו לא משתמשים בו כאן.

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
   - `https://YOUR-VERCEL-DOMAIN.vercel.app/auth/callback`
4. Save

---

## שלב 5 — בדיקה שהכול חי

1. אחרי Redeploy ב־Vercel, פתח את האתר
2. לך ל־`/login` או ל־`/dashboard`
3. לחץ **המשך עם Google**
4. אמור להחזיר אותך ל־`/dashboard` מחובר (תראה את האימייל למעלה)

אם משהו נכשל:
- «התחברות לא מוגדרת» → המשתנים לא ב־Vercel או לא עשית Redeploy
- שגיאת redirect_uri_mismatch → ה־Callback URL ב־Google לא זהה לזה של Supabase
- חוזר ל־login → בדוק Redirect URLs ב־Supabase כוללים `/auth/callback`

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

## מה קורה במוצר אחרי זה

| דף | מה עושה |
|---|---|
| `/dashboard` | רשימת הפרויקטים המקומיים שלך + התחברות |
| `/login` | כפתור Google |
| `/` | העורך (כמו תמיד) |
| `/settings` | מפתחות AI |

**זכור:** הפרויקטים והווידאו נשארים במחשב (IndexedDB). ההתחברות = מי אתה, לא איפה הסרטון.
