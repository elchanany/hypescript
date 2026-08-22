# מעבר לחיוב אמיתי — Lemon Squeezy

עד עכשיו מצב Test היה **נעול בקוד** בארבעה מקומות נפרדים, שנוספו בזמן שהחנות
הייתה בבדיקה ולא הוסרו אחריה. התוצאה בפועל: לקוח אמיתי לא היה יכול לשלם, ואם
בכל זאת היה עובר תשלום — ה-webhook היה נדחה ב-409, כלומר **כסף נגבה בלי שנפתחה
גישה**.

כל ארבע הנעילות הוחלפו במתג יחיד: `BILLING_LIVE_MODE`.

## מה עושה המתג

| | `BILLING_LIVE_MODE` ריק / `0` (ברירת מחדל) | `BILLING_LIVE_MODE=1` |
| --- | --- | --- |
| `POST /checkouts` | `test_mode: true` | `test_mode: false` |
| וריאנט Live בחנות | נדחה | מתקבל |
| וריאנט Test בחנות | מתקבל | נדחה |
| webhook של אירוע Live | 409 | מטופל |
| webhook של אירוע Test | מטופל | 409 |
| `provider` בשורת המנוי | `lemonsqueezy_test` | `lemonsqueezy` |

הדחייה עובדת **לשני הכיוונים** בכוונה: פריסת Preview נשארת על חנות Test ולעולם
לא תטפל בכסף אמיתי, ובילד Live לעולם לא ימכור מוצר בדיקה. ה-409 מסמן ל-Lemon
שהאירוע לא התקבל, כך שהוא יישלח שוב לפריסה הנכונה במקום להיבלע בשקט.

## סדר הפעולות למעבר

1. **בדקו שהחנות החיה מספקת את מה שהקוד דורש** — לפני שנוגעים במשהו:

   ```bash
   curl -s https://<site>/api/billing/catalog | python -m json.tool
   ```

   השדה `readiness` מחזיר שורה לכל שילוב תוכנית×מחזור. כל אחת מארבע השורות
   חייבת להיות `ready: true`. `resolveVariant` מחמיר בכוונה, והוא דורש לכל
   שילוב **וריאנט אחד בדיוק** ש:
   - שמו נגזר ל-`creator` (`creator` / `יוצר`) או ל-`pro` (`pro` / `professional` / `מקצועי`);
   - `interval` הוא `month` או `year` בהתאם;
   - המחיר **מדויק**: 49 / 490 ₪ (יוצר), 119 / 1190 ₪ (מקצועי);
   - `is_subscription: true`;
   - יש תקופת ניסיון חינם של חודש או 30 יום.

   `billing_variant_missing` פירושו שאין התאמה, `billing_variant_ambiguous`
   פירושו שיש יותר מאחת.

2. **רשמו webhook חי** בדשבורד של Lemon Squeezy אל
   `https://<site>/api/billing/lemon/webhook`, מנוי לאירועי `subscription_*`.

3. **עדכנו את `LEMONSQUEEZY_WEBHOOK_SECRET`** ב-Vercel לסוד החתימה של ה-webhook
   **החי**. ל-Live ול-Test יש אובייקטים נפרדים עם סודות נפרדים; אם הסוד שמוגדר
   שייך ל-webhook של Test, כל אירוע חי ייכשל באימות חתימה וייראה בדיוק כמו
   "כלום לא קרה".

4. **ודאו ש-`LEMONSQUEEZY_STORE_ID` נכון.** קודם, ערך שגוי נפל בשקט לחנות
   הראשונה בחשבון; עכשיו הוא זורק `lemon_store_mismatch`, כדי שטעות תיראה
   כטעות ולא כתקלה מסתורית בתשלום.

5. **רק אז** הגדירו `BILLING_LIVE_MODE=1` ב-Vercel ופרסו מחדש.

## אחרי המעבר — ניקוי שחייב להיעשות

משתמש שעבר checkout ניסיוני כבר מחזיק שורה ב-`cloud_subscriptions` עם סטטוס
`active` / `trialing`, ומשמר הכפילות ב-`app/api/billing/checkout/route.ts`
**יחסום לו את הרכישה האמיתית הראשונה**. אחרי המעבר יש למחוק את השורות
שסומנו `provider = 'lemonsqueezy_test'`:

```sql
select user_id, plan_id, status, provider from cloud_subscriptions where provider = 'lemonsqueezy_test';
```

בדקו את הרשימה לפני מחיקה — זו הסיבה שהחותמת קיימת.

## מה לא נעשה כאן

לא בוצעה שום רכישה, לא שונתה שום הגדרת תשלום בחשבון Lemon Squeezy, ולא נוצרו
מוצרים. ברירת המחדל של המתג היא Test, ולכן עצם השינוי בקוד אינו משנה דבר
בהתנהגות הקיימת עד שבעל החשבון מגדיר את המשתנה במודע.
