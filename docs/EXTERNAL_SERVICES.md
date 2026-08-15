# שירותים חיצוניים — מה להביא, מאיפה, ומה מותר לעשות עם זה

> מדריך תפעולי. לכל שירות: מה הוא נותן, איפה משיגים מפתח, לאיזה משתנה סביבה
> הוא נכנס, ומה מצב הרישוי. **הרישוי הוא לא הערת שוליים** — שיר לא מורשה
> בסרטון של לקוח הוא תביעה, לא באג.
>
> כללי הפרויקט: [RULES.md](../RULES.md) §1 (הווידאו לא עוזב את המחשב — רק אודיו
> דחוס לתמלול/TTS) ו-§2 (בלי תלות בשירות בתשלום מעבר למפתחות של המשתמש עצמו).
> כל מפתח נכנס ל-`web/.env.local` בצד השרת בלבד ולעולם לא לקוד.

---

## מפה מהירה

| # | שירות | נותן | עלות | דחיפות |
|---|---|---|---|---|
| 1 | ElevenLabs | תמלול + קריינות + מוזיקה | בתשלום | **קריטי** |
| 2 | Groq Whisper | תמלול זול/מהיר | חינם נדיב | **קריטי** |
| 3 | Anthropic / OpenAI / Gemini | מנוע הסוכן + ראיית תמונות | בתשלום | **קריטי** |
| 4 | Pexels | וידאו ותמונות סטוק | חינם | גבוה |
| 5 | Pixabay | סטוק + מוזיקה + SFX | חינם | גבוה |
| 6 | Freesound | אפקטי קול | חינם (CC) | בינוני |
| 7 | Google Fonts | גופנים עבריים | חינם | **גבוה** |
| 8 | LottieFiles | אנימציות מוכנות | חינם/בתשלום | בינוני |
| 9 | Unsplash | תמונות איכותיות | חינם | בינוני |
| 10 | OpenAI Images | יצירת ויזואלים | בתשלום | בינוני |
| 11 | Stability / Stable Audio | מוזיקה במשקלים פתוחים | חינם/בתשלום | בינוני |
| 12 | Epidemic Sound | מוזיקה מורשית + Content ID | מנוי | לפי צורך |
| 13 | Artlist | מוזיקה מורשית + Clearlist | מנוי | לפי צורך |
| 14 | Lickd | **שירים מוכרים** מורשים | לפי טראק | לפי צורך |
| 15 | Suno | מוזיקה AI איכותית | בתשלום | זהירות |
| 16 | Uppbeat | מוזיקה חינם ליוטיוב | חינם/מנוי | נמוך |
| 17 | Free Music Archive | מוזיקה CC | חינם | נמוך |
| 18 | Openverse | חיפוש CC מאוחד | חינם | נמוך |
| 19 | Cloudflare R2 | אחסון ורנדר ענן | זול | קיים |
| 20 | Supabase | חשבונות ומכסות | חינם/בתשלום | קיים |

---

## 1–3. הליבה (בלי אלה אין מוצר)

### 1. ElevenLabs — תמלול, קריינות ומוזיקה
- **תמלול Scribe:** הכי מדויק לעברית. חותמות ברמת מילה, אירועי שמע, הפרדת דוברים.
- **קריינות:** קולות עבריים טבעיים.
- **Eleven Music:** מוזיקה מקורית. **הרישוי הכי נקי בשוק** — אומן על חומר מורשה
  בשיתוף לייבלים מלכתחילה, ולא הוסדר בדיעבד אחרי תביעות.
- מפתח: [elevenlabs.io](https://elevenlabs.io) → Developers → API Keys → **Create Key**.
  ⚠ הערך מוצג **פעם אחת** ביצירה ומתחיל ב-`sk_`. "Copy Key ID" נותן מזהה, לא מפתח.
- `ELEVENLABS_API_KEY=sk_...`

### 2. Groq — תמלול Whisper
- מהיר וזול מאוד, מדרגה חינמית נדיבה. פחות מדויק מ-Scribe בעברית — טוב לטיוטה.
- מפתח: [console.groq.com](https://console.groq.com) → API Keys.
- `GROQ_API_KEY=gsk_...`

### 3. מנוע הסוכן + ראיית תמונות
**ראיית תמונות היא דרישת חובה**, לא נחמד-שיהיה: בלעדיה הסוכן לא יודע מה בכל
תמונה ולא יכול לסדר סיפור, ולא יכול לאמת `capture_frame`. שלושת הספקים רואים תמונות.
- Anthropic: [console.anthropic.com](https://console.anthropic.com) → `ANTHROPIC_API_KEY=sk-ant-...`
- OpenAI: [platform.openai.com](https://platform.openai.com/api-keys) → `OPENAI_API_KEY=sk-...`
- Gemini: [aistudio.google.com](https://aistudio.google.com/apikey) → `GEMINI_API_KEY=...` (מדרגה חינמית)

---

## 4–11. נכסים חינמיים (התחל כאן)

### 4. Pexels — וידאו ותמונות
- **ללא ייחוס נדרש**, מסחרי מותר. הכי נקי משפטית מבין החינמיים.
- [pexels.com/api](https://www.pexels.com/api/) → `PEXELS_API_KEY=`

### 5. Pixabay — סטוק + מוזיקה + אפקטים
- הכי רחב: וידאו, תמונות, **מוזיקה** ואפקטי קול במקום אחד. ללא ייחוס.
- ⚠ תנאי ה-API דורשים **להציג את מקור התוצאות** כשמראים תוצאות חיפוש.
- [pixabay.com/api/docs](https://pixabay.com/api/docs/) → `PIXABAY_API_KEY=`

### 6. Freesound — אפקטי קול
- ספרייה ענקית. ⚠ **הרישיון משתנה מקובץ לקובץ** (CC0 / CC-BY / CC-BY-NC).
  חובה לסנן ל-CC0 לשימוש מסחרי, או לשמור ייחוס לכל קובץ.
- [freesound.org/apiv2](https://freesound.org/docs/api/) → `FREESOUND_API_KEY=`

### 7. Google Fonts — גופנים עבריים ⭐
- אין צורך במפתח. **הורד וארוז מקומית** — לא CDN (פרטיות, וגם עובד אופליין).
- OFL, מסחרי מותר. עבריים מומלצים: **Heebo · Rubik · Assistant · Alef ·
  Suez One · Secular One · Frank Ruhl Libre · David Libre**.
- [fonts.google.com](https://fonts.google.com/?subset=hebrew) — סנן לפי Hebrew.

### 8. LottieFiles — אנימציות
- הרנטיים `lottie-web` הוא MIT. ⚠ **כל אנימציה היא נכס עם רישיון משלה** —
  לבדוק אחת-אחת, לא לשפוך קטלוג.
- [lottiefiles.com/developers](https://lottiefiles.com/developers) → `LOTTIEFILES_API_KEY=`

### 9. Unsplash — תמונות
- איכות גבוהה. ⚠ דורש ייחוס לצלם לפי תנאי ה-API.
- [unsplash.com/developers](https://unsplash.com/developers) → `UNSPLASH_ACCESS_KEY=`

### 10. OpenAI Images — יצירת ויזואלים
- כבר מוטמע בפרויקט (`generate_image`, gpt-image-1). משתמש באותו `OPENAI_API_KEY`.

### 11. Stability / Stable Audio — מוזיקה במשקלים פתוחים
- Stable Audio 3 (מאי 2026) יצא עם **משקלים פתוחים** — אפשר להריץ מקומית,
  בלי API ובלי עלות לטראק. אופציה טובה לעצמאות מלאה.
- [platform.stability.ai](https://platform.stability.ai/) → `STABILITY_API_KEY=`

---

## 12–18. מוזיקה — כאן נמצא הסיכון המשפטי

### התשובה הישירה על "שירים מוכרים"

**אי-אפשר להוריד שיר מוכר ולשים אותו בסרטון.** אין API חוקי שנותן את זה, ולא
משנה מה כתוב בפורומים. שיר מסחרי דורש **שני** רישיונות נפרדים: על ההקלטה
(master) ועל היצירה (publishing). יוטיוב/פייסבוק/אינסטגרם מזהים אוטומטית דרך
Content ID, והתוצאה היא חסימה, השתקה, או העברת ההכנסות לבעל הזכויות.

שלוש דרכים חוקיות, לפי סדר:

### 14. Lickd — שירים מוכרים באמת ⭐
- **זה הפתרון היחיד ל"שיר שהמשפחה מכירה".** מרשה טראקים מסחריים אמיתיים
  ליוצרים, עם ניקוי Content ID.
- תמחור לפי טראק, לא מנוי. אין API ציבורי — רכישה דרך האתר והורדה.
- [lickd.co](https://lickd.co)

### 12. Epidemic Sound
- קטלוג ענק, **ניקוי Content ID אוטומטי** לערוץ המחובר. חוזים ישירים עם
  אומנים וקניית כל הזכויות, כך שאין תביעות PRO.
- ⚠ תוכן שפורסם בזמן המנוי נשאר מורשה לתמיד, אבל **אי-אפשר להשתמש בטראקים
  שהורדת בפרויקטים חדשים אחרי ביטול המנוי**.
- [epidemicsound.com](https://www.epidemicsound.com) — יש Partner API.

### 13. Artlist
- **Clearlist** מאשר את הרישיון ומנקה תביעות שווא ביוטיוב, פייסבוק,
  אינסטגרם וטיקטוק.
- [artlist.io](https://artlist.io)

### 15. Suno — מוזיקה AI ⚠
- האיכות הכי טובה, **אבל תנאי הרישוי המסחרי עדיין לא יציבים** (תביעות על
  נתוני אימון; הוסדר עם Warner ב-2025). לפרויקט לקוח — עדיף ElevenLabs Music.
- [suno.com](https://suno.com)
- **Udio אינו רלוונטי:** מאז סוף 2025 זו פלטפורמה סגורה — אי-אפשר להוריד
  יצירות או להשתמש בהן מחוץ לאתר.

### 16–18. חינמיים
- **Uppbeat** — [uppbeat.io](https://uppbeat.io), נקי ליוטיוב, מדרגה חינמית.
- **Free Music Archive** — [freemusicarchive.org](https://freemusicarchive.org), CC, לבדוק רישיון לכל טראק.
- **Openverse** — [openverse.org](https://openverse.org), חיפוש CC מאוחד עם API.

### הכלל שכדאי לקבע במוצר
1. ברירת מחדל: **מוזיקה מיוצרת** (ElevenLabs Music) — אפס סיכון.
2. "אני רוצה שיר מוכר" ⇒ להפנות ל-Lickd ולהסביר למה. לא לעקוף.
3. המשתמש מעלה קובץ משלו ⇒ **האחריות עליו**, ורצוי לומר זאת פעם אחת.

---

## 19–20. תשתית (כבר בפרויקט)

### 19. Cloudflare R2
- אחסון ורנדר ענן. ⚠ **שלושה ערכים בקובץ הנוכחי פגומים** — שם המפתח שוכפל
  לתוך הערך (`R2_ACCOUNT_ID=R2_ACCOUNT_ID=...`). צריך לתקן.
- [dash.cloudflare.com](https://dash.cloudflare.com) → R2 → Manage API Tokens

### 20. Supabase
- חשבונות, מכסות, הרשאות. ⚠ מפתח הפרודקשן עדיין שבור (מתועד ב-`.ai/HANDOFF.md`).
- [supabase.com/dashboard](https://supabase.com/dashboard) → Settings → API

---

## שלוש הערות שחוסכות כאב

**מפתחות Vercel אינם ניתנים לשחזור.** משתנה שסומן **Sensitive** לא ניתן לקריאה
חזרה — לא ב-CLI, לא ב-API, לא בדשבורד. `vercel env pull` יחזיר `[SENSITIVE]`.
לפיתוח מקומי צריך את המפתח מהספק עצמו.

**מפתחות בצד השרת בלבד.** הכל עובר דרך `/api/*` proxy. אין `NEXT_PUBLIC_` על
מפתח, ואין לבקש מהמשתמש להדביק מפתח בצ'אט.

**סדר ההטמעה המומלץ:** Google Fonts (חינם, השפעה מיידית על הכתוביות) → Pexels
+ Pixabay (חינם, פותח ספריית נכסים) → ElevenLabs Music (סוגר את סיכון המוזיקה)
→ Freesound → Lottie. תשלום רק כשיש ביקוש מוכח.
