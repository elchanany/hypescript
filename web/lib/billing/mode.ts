// מצב החיוב: Test מול Live — מתג יחיד ומפורש במקום ארבע נעילות מפוזרות בקוד.
//
// הרקע: כשהחנות ב-Lemon Squeezy הייתה עדיין בבדיקה, ננעל מצב Test בארבעה
// מקומות נפרדים בקוד המקור — דחיית וריאנט Live, `test_mode: true` בכל checkout,
// דחיית webhook אמיתי ב-409, וחותמת ספק `lemonsqueezy_test`. הנעילות נשארו גם
// אחרי שהחנות אושרה, ולכן לקוח אמיתי לא יכול היה לשלם: התשלום היה נכשל, ואם
// בכל זאת היה עובר — ה-webhook היה נדחה והכסף היה נגבה בלי לפתוח גישה.
//
// למה מתג ולא מחיקה: פריסת Preview חייבת להישאר על חנות Test, ואסור שאירוע
// כסף אמיתי יטופל אי פעם על ידי בילד Preview. הכיוון נאכף לשני הצדדים:
// במצב Test אירוע Live נדחה, ובמצב Live אירוע Test נדחה.
//
// ברירת המחדל היא Test בכוונה — בלי `BILLING_LIVE_MODE` שום דבר בהתנהגות
// הקיימת לא משתנה. המעבר ל-Live הוא פעולה מודעת של בעל החשבון.

export type BillingMode = "test" | "live";

/** קורא את המתג. כל ערך שאינו "1"/"true" נחשב Test. */
export function billingMode(env: NodeJS.ProcessEnv = process.env): BillingMode {
  const raw = String(env.BILLING_LIVE_MODE || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" ? "live" : "test";
}

export function isLiveBilling(env?: NodeJS.ProcessEnv): boolean {
  return billingMode(env) === "live";
}

/** הערך ש-Lemon מצפה לו בשדה `test_mode` של checkout. */
export function checkoutTestMode(env?: NodeJS.ProcessEnv): boolean {
  return !isLiveBilling(env);
}

/**
 * שם הספק שנרשם בשורת המנוי. חשוב לתמיכה: אחרת אי אפשר להבדיל בין מנוי
 * ניסיוני לבין לקוח אמיתי, ושורת בדיקה ישנה חוסמת רכישה אמיתית ראשונה.
 */
export function billingProviderName(env?: NodeJS.ProcessEnv): string {
  return isLiveBilling(env) ? "lemonsqueezy" : "lemonsqueezy_test";
}

/** True אם המשאב (וריאנט / אירוע webhook) שייך למצב שבו אנחנו פועלים. */
export function matchesBillingMode(resourceTestMode: unknown, env?: NodeJS.ProcessEnv): boolean {
  return resourceTestMode === true ? !isLiveBilling(env) : isLiveBilling(env);
}

/** הודעת שגיאה שאומרת בדיוק מה לא תואם — לא "נחסם" סתמי. */
export function billingModeMismatchError(resourceTestMode: unknown, env?: NodeJS.ProcessEnv): string {
  const running = billingMode(env);
  const resource = resourceTestMode === true ? "test" : "live";
  return `billing_mode_mismatch:running=${running},resource=${resource}`;
}
