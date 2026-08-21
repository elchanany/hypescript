# מפתחות API — מה שמים, איפה, ובאיזה סדר

עשרים ושניים שירותים. שלושה־עשר מהם דורשים מפתח, תשעה לא. הקובץ הזה אומר בדיוק מה לעשות עם כל אחד.

הדרך המהירה:

```bash
node scripts/add-keys.mjs
```

האשף שואל על כל מפתח חסר, ומזין אותו ל-Vercel בשלוש הסביבות (production, preview, development) בבת אחת. המפתח לא נכתב לדיסק ולא נשמר בהיסטוריית הפקודות. Enter ריק מדלג.

לראות מה קיים בלי לשנות כלום:

```bash
node scripts/add-keys.mjs --status
```

---

## איפה המפתחות יושבים

**ב-Vercel, לא בקוד.** משתני סביבה של הפרויקט, בשלוש סביבות:

| סביבה | מתי היא בשימוש |
|---|---|
| `production` | האתר החי |
| `preview` | כל דיפלוי מ-branch |
| `development` | `vercel dev` והרצה מקומית |

לעבודה מקומית מושכים את כל המשתנים לקובץ `.env.local`:

```bash
npx vercel env pull web/.env.local
```

הקובץ הזה מכיל סודות בטקסט גלוי — הוא ב-`.gitignore` ואסור לו להגיע ל-git.

---

## כבר מוגדרים

| מפתח | תפקיד |
|---|---|
| `ELEVENLABS_API_KEY` | תמלול איכותי + קריינות |
| `GROQ_API_KEY` | תמלול מהיר וזול — מנוע ברירת המחדל |
| `DEEPSEEK_API_KEY` | מודל השיחה של הסוכן |

---

## מה להוסיף, לפי סדר עדיפות

### קודם כול — בלי אלה יש פונקציות שבורות

**`GEMINI_API_KEY`** · חינם · [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
ראיית תמונות. DeepSeek לא רואה תמונות בכלל, ולכן בלי מודל ראייה זיהוי תמונות וסידור סיפור לפי תוכן פשוט לא עובדים. זה המפתח הכי חשוב ברשימה, והוא חינם.

**`PEXELS_API_KEY`** · חינם · [pexels.com/api](https://www.pexels.com/api/)
וידאו ותמונות סטוק. ללא חובת ייחוס — הכי נקי משפטית מבין ספקי הסטוק.

**`PIXABAY_API_KEY`** · חינם · [pixabay.com/api/docs](https://pixabay.com/api/docs/)
סטוק + מוזיקה + אפקטים במפתח אחד. חובה להציג מקור בתוצאות החיפוש.

### ספריית יצירה ועיצוב (Creative Library)

**`GOOGLE_FONTS_API_KEY`** · חינם · [developers.google.com/fonts](https://developers.google.com/fonts/docs/developer_api)
חיפוש ומיון דינמי של 1,500+ גופנים, עברית ולועזית, לפי פופולריות ומגמות. עובד גם בלי מפתח על בסיס קטלוג מובנה עשיר (Heebo, Assistant, Rubik, Frank Ruhl Libre, Suez One...).

**`GIPHY_API_KEY`** · חינם · [developers.giphy.com](https://developers.giphy.com/)
חיפוש חי וטרנדים של סטיקרים שקופים, GIFs מונפשים ואימוג'י. עובד גם בלי מפתח על בסיס Starter Pack מובנה.

### אחר כך — מרחיבים את מה שהסוכן יכול

**`FREESOUND_API_KEY`** · חינם · [freesound.org/apiv2/apply](https://freesound.org/apiv2/apply/)
אפקטי קול. הרישיון משתנה מקובץ לקובץ — לסנן ל-CC0 בלבד.

**`UNSPLASH_ACCESS_KEY`** · חינם · [unsplash.com/developers](https://unsplash.com/developers)
תמונות באיכות גבוהה. דורש ייחוס לצלם.

**`OPENVERSE_CLIENT_ID`** + **`OPENVERSE_CLIENT_SECRET`** · חינם · [api.openverse.org](https://api.openverse.org/v1/auth_tokens/register/)
חיפוש Creative Commons מאוחד. עובד גם בלי מפתח — המפתח רק מעלה את מגבלת הקצב. שני הערכים מגיעים יחד מאותו רישום.

**`DEEPGRAM_API_KEY`** · 200$ חינם · [console.deepgram.com/signup](https://console.deepgram.com/signup)
תמלול גיבוי. רלוונטי רק אם Groq ו-ElevenLabs שניהם נופלים.

### בתשלום — רק אם צריך את היכולת

**`OPENAI_API_KEY`** · [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
יצירת תמונות + ראייה. חלופה ל-Gemini, יקרה יותר.

**`ANTHROPIC_API_KEY`** · [console.anthropic.com](https://console.anthropic.com/settings/keys)
ראייה. חלופה שנייה, אם Gemini לא מספיק.

**`STABILITY_API_KEY`** · [platform.stability.ai](https://platform.stability.ai/account/keys)
מוזיקה ותמונות.

**`SUNO_API_KEY`** · [suno.com](https://suno.com)
מוזיקה AI. ⚠ תנאי הרישוי המסחרי עדיין לא יציבים. לפרויקט לקוח — ElevenLabs Music עדיף.

---

## שירותים ללא צורך במפתח (מובנים מקומית / חופשיים)

אלה רצים ישירות בדפדפן או מול שרתים פתוחים ללא הרשמה:

| שירות | איך הוא עובד | רישיון ושימוש |
|---|---|---|
| **Remotion Effects & Transitions** | עיבוד חזותי בזמן אמת דרך CSS/Canvas | 100% מקומי, ללא מפתח |
| **FFmpeg WASM & Native** | מנוע `xfade`, `eq`, `colorbalance`, `curves`, `unsharp` | 100% מקומי, ללא מפתח |
| **Iconify** (150k+ אייקונים) | API פתוח ומאגר וקטורי מובנה | MIT / Apache / CC0 |
| **Lottie / dotLottie & SVG Motion** | מנוע תנועה מובנה ואנימציות מקומיות | Open Source |
| **צורות גיאומטריות (Shapes)** | קטלוג וקטורי מובנה | חופשי לחלוטין |
| **תבניות טקסט ואנימציות** | 45+ תבניות + 20+ אנימציות CSS | חופשי לחלוטין |
| **סגנונות כתוביות (Captions)** | 20+ פריסטים ויראליים | חופשי לחלוטין |
| [Free Music Archive](https://freemusicarchive.org) | הורדה ידנית ובדיקת רישיון לכל טראק | משתנה |
| [Uppbeat](https://uppbeat.io) | הורדה מהאתר עם חשבון | לפי תנאי האתר |
| [Artlist](https://artlist.io) | מנוי + הורדה ידנית | מסחרי עם מנוי |
| [Lickd](https://lickd.co) | רכישה לפי טראק | הדרך החוקית לשיר מסחרי |
| Cloudflare R2 / Supabase | כבר מוגדרים בפרויקט | אחסון ומסד |

---

## הוספה ידנית, בלי האשף

```bash
npx vercel env add NAME production
npx vercel env add NAME preview
npx vercel env add NAME development
```

הפקודה מבקשת את הערך ב-prompt נפרד, כדי שהמפתח לא ייכנס להיסטוריית הפקודות. אחרי הוספה, כדי שהמפתח יגיע לאתר החי:

```bash
npx vercel --prod
```
