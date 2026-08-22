// קטלוג הודעות שגיאה בעברית — בלוקר B-27.
//
// המטרה: אף משתמש (מי שעורך שיעורי תורה) לא אמור לראות קוד מכונה כמו
// "byok_save_failed" או 503 חשוף. כל קוד שהאפליקציה יכולה להחזיר — מ-
// web/app/api (בתשובת {error}) או מ-throw new Error(...) בתוך web/lib —
// עובר כאן להסבר עברי קצר, בגובה עיניים, בלי לשנות את הקוד המקורי (הוא
// נשמר ב-code בשביל תמיכה).
//
// קובץ טהור: אין כאן DOM, אין import מ-next/server, אין תלות ברשת או
// בסביבת ריצה — אפשר לייבא אותו גם משרת וגם מלקוח, ואפשר לבדוק אותו
// ביחידה בלי mock.
//
// המקור לרשימת הקודים: web/lib/errors/INVENTORY.md (נאסף מכנית מהקוד).
// שלושה קודים נוספו מעבר לרשימה שם — billing_variant_missing,
// billing_variant_ambiguous, lemon_store_mismatch — כי הם נזרקים בפועל
// ב-web/lib/billing/lemon.ts (throw new Error(...)) והאינוונטרי לא תפס
// אותם (כנראה כי החילוץ המכני פספס את התבנית שלהם). ראו את בדיקת הכיסוי
// למטה מול INVENTORY.md.

export type ErrorAudience = "user" | "owner";

export interface ErrorExplanation {
  /** שורה אחת: מה קרה. */
  title: string;
  /** משפט או שניים: למה, בעברית פשוטה. */
  detail: string;
  /** מה אפשר בפועל לעשות עם זה — לא תמיד יש. */
  action?: string;
  /** מי יכול לתקן את זה: המשתמש, או רק מי שמתחזק את המערכת. */
  audience: ErrorAudience;
  /** true רק לדברים שבאמת חולפים (רשת, timeout, זמינות רגעית). */
  retryable: boolean;
  /** הקוד המקורי, כפי שהתקבל — נשמר בשביל תמיכה. */
  code: string;
}

type Entry = Omit<ErrorExplanation, "code">;

// --- web/app/api -------------------------------------------------------

const API_CODES: Record<string, Entry> = {
  account_delete_failed: {
    title: "מחיקת החשבון נכשלה",
    detail: "אירעה תקלה בצד שלנו בזמן מחיקת החשבון, והפרטים דווחו לצוות.",
    action: "אפשר לנסות שוב בעוד רגע.",
    audience: "owner",
    retryable: true,
  },
  account_delete_unavailable: {
    title: "מחיקת חשבון אינה זמינה כרגע",
    detail: "השירות שמבצע מחיקת חשבונות אינו מוגדר כרגע בצד שלנו.",
    audience: "owner",
    retryable: false,
  },
  account_schema_pending: {
    title: "החשבון עדיין לא מוכן לגמרי",
    detail: "עדכון בסיס הנתונים של החשבון עדיין בתהליך פריסה בצד שלנו.",
    action: "אפשר לנסות שוב בעוד כמה דקות.",
    audience: "owner",
    retryable: true,
  },
  account_update_failed: {
    title: "עדכון פרטי החשבון נכשל",
    detail: "אירעה תקלה בצד שלנו בזמן שמירת ההעדפות.",
    action: "אפשר לנסות שוב.",
    audience: "owner",
    retryable: true,
  },
  admin_unavailable: {
    title: "מסך הניהול אינו זמין כרגע",
    detail: "השירות שמזין את נתוני הניהול אינו מוגדר כרגע בצד שלנו.",
    audience: "owner",
    retryable: false,
  },
  asset_delete_failed: {
    title: "מחיקת הקובץ נכשלה",
    detail: "אירעה תקלה בצד שלנו בזמן מחיקת הקובץ מהאחסון.",
    action: "אפשר לנסות שוב.",
    audience: "owner",
    retryable: true,
  },
  asset_finalize_failed: {
    title: "השלמת העלאת הקובץ נכשלה",
    detail: "הקובץ עלה בהצלחה, אבל רישום הסיום שלו במסד הנתונים נכשל.",
    action: "אפשר לנסות להעלות את הקובץ שוב.",
    audience: "owner",
    retryable: true,
  },
  asset_not_found: {
    title: "הקובץ לא נמצא",
    detail: "הקובץ נמחק, הועבר, או שהקישור אליו כבר לא תקף.",
    audience: "user",
    retryable: false,
  },
  asset_reservation_failed: {
    title: "לא הצלחנו להתחיל את ההעלאה",
    detail: "אירעה תקלה בצד שלנו בזמן שמירת מקום לקובץ.",
    action: "אפשר לנסות שוב.",
    audience: "owner",
    retryable: true,
  },
  brand_kit_too_large: {
    title: "ערכת המותג גדולה מדי",
    detail: "הנתונים שנשמרים בערכת המותג (לוגו, צבעים, גופנים) חורגים מהגודל המותר.",
    action: "צמצם את גודל התמונות בערכת המותג ונסה שוב.",
    audience: "user",
    retryable: false,
  },
  brand_read_failed: {
    title: "טעינת ערכת המותג נכשלה",
    detail: "אירעה תקלה בצד שלנו בזמן טעינת ערכת המותג.",
    action: "אפשר לנסות שוב.",
    audience: "owner",
    retryable: true,
  },
  brand_sync_failed: {
    title: "שמירת ערכת המותג נכשלה",
    detail: "אירעה תקלה בצד שלנו בזמן שמירת ערכת המותג.",
    action: "אפשר לנסות שוב.",
    audience: "owner",
    retryable: true,
  },
  cloud_render_not_configured: {
    title: "רינדור בענן אינו זמין כרגע",
    detail: "שרת הרינדור המהיר אינו מוגדר כרגע בצד שלנו.",
    action: "הייצוא ימשיך על המכשיר שלך במקום זאת.",
    audience: "owner",
    retryable: false,
  },
  cloud_schema_unavailable: {
    title: "טעינת רשימת הפרויקטים נכשלה",
    detail: "מסד הנתונים בענן עדיין לא מוכן לגמרי (עדכון בפריסה בצד שלנו).",
    action: "אפשר לנסות שוב בעוד כמה דקות.",
    audience: "owner",
    retryable: true,
  },
  database_not_configured: {
    title: "השירות אינו מוגדר כרגע",
    detail: "החיבור למסד הנתונים בצד שלנו אינו מוגדר כרגע.",
    audience: "owner",
    retryable: false,
  },
  download_signing_failed: {
    title: "הכנת קישור ההורדה נכשלה",
    detail: "אירעה תקלה בצד שלנו בזמן הכנת הקובץ להורדה.",
    action: "אפשר לנסות שוב.",
    audience: "owner",
    retryable: true,
  },
  empty_patch: {
    title: "אין מה לשמור",
    detail: "הבקשה לעדכון הפרויקט לא כללה שום שינוי בפועל.",
    action: "רענן את העמוד ונסה שוב.",
    audience: "user",
    retryable: false,
  },
  export_failed: {
    title: "ייצוא הנתונים נכשל",
    detail: "אירעה תקלה בצד שלנו בזמן הכנת קובץ הייצוא.",
    action: "אפשר לנסות שוב.",
    audience: "owner",
    retryable: true,
  },
  forbidden: {
    title: "אין הרשאה לפעולה הזו",
    detail: "החשבון הזה אינו מורשה לבצע את הפעולה המבוקשת.",
    action: "אם זו נראית לך טעות, פנה למי שמנהל את החשבון.",
    audience: "user",
    retryable: false,
  },
  invalid_api_key: {
    title: "מפתח ה-API אינו תקין",
    detail: "האורך או הפורמט של המפתח שהוזן לא תואם למפתח API תקין.",
    action: "בדוק את המפתח והדבק אותו שוב.",
    audience: "user",
    retryable: false,
  },
  invalid_brand_kit: {
    title: "פרטי ערכת המותג אינם תקינים",
    detail: "אחד השדות בערכת המותג לא עבר את בדיקת התקינות.",
    action: "בדוק את הפרטים שהוזנו ונסה שוב.",
    audience: "user",
    retryable: false,
  },
  invalid_editor_state: {
    title: "מצב העריכה שנשלח אינו תקין",
    detail: "נתוני הפרויקט שנשלחו לשמירה לא היו בפורמט הצפוי.",
    action: "רענן את העמוד. אם שינויים אחרונים חסרים, אפשר לשחזר מהיסטוריית העריכה (Ctrl+Z).",
    audience: "user",
    retryable: false,
  },
  invalid_event: {
    title: "אירוע לא נשלח לתיעוד",
    detail: "הנתונים שנשלחו לתיעוד השימוש לא היו בפורמט הצפוי.",
    audience: "user",
    retryable: false,
  },
  invalid_json: {
    title: "הבקשה לא הייתה תקינה",
    detail: "הנתונים שנשלחו לשרת לא היו בפורמט הצפוי.",
    action: "רענן את העמוד ונסה שוב.",
    audience: "user",
    retryable: false,
  },
  invalid_plan: {
    title: "מסלול התשלום לא קיים",
    detail: "המסלול שנבחר אינו אחד ממסלולי התשלום הזמינים.",
    action: "בחר מסלול מהרשימה ונסה שוב.",
    audience: "user",
    retryable: false,
  },
  invalid_preferences: {
    title: "ההעדפות שנשלחו אינן תקינות",
    detail: "אחד הערכים שנשלחו לשמירה לא עבר את בדיקת התקינות.",
    action: "בדוק את ההעדפות ונסה לשמור שוב.",
    audience: "user",
    retryable: false,
  },
  invalid_price: {
    title: "המחיר שהוזן אינו תקין",
    detail: "מחיר חייב להיות מספר שלם בין 1 ל-100,000.",
    action: "תקן את הערך ונסה שוב.",
    audience: "user",
    retryable: false,
  },
  invalid_render_plan: {
    title: "בקשת הרינדור לא הייתה תקינה",
    detail: "חסרים נתונים נדרשים לבניית הסרטון (קליפים, אודיו או שכבות).",
    action: "רענן את העמוד ונסה לייצא שוב.",
    audience: "user",
    retryable: false,
  },
  invalid_role: {
    title: "תפקיד לא תקין",
    detail: "התפקיד שנבחר אינו אחד מהתפקידים המוגדרים במערכת.",
    action: "בחר תפקיד מהרשימה ונסה שוב.",
    audience: "user",
    retryable: false,
  },
  invalid_signature: {
    title: "אימות הבקשה נכשל",
    detail: "חתימת הבקשה שהתקבלה מספק התשלומים לא תואמת את הסוד המוגדר בצד שלנו.",
    audience: "owner",
    retryable: false,
  },
  invalid_subtitles: {
    title: "קובץ הכתוביות אינו תקין",
    detail: "קובץ הכתוביות חורג בגודלו או שאינו בפורמט הצפוי.",
    action: "בדוק את הכתוביות ונסה לייצא שוב.",
    audience: "user",
    retryable: false,
  },
  invalid_upload: {
    title: "פרטי הקובץ אינם תקינים",
    detail: "שם הקובץ, סוגו או גודלו לא תואמים למה שמותר להעלות.",
    action: "בדוק את הקובץ ונסה שוב.",
    audience: "user",
    retryable: false,
  },
  job_id_required: {
    title: "קריאה חסרה מזהה משימה",
    detail: "הקריאה מעובד הרינדור לא כללה מזהה משימה תקין.",
    audience: "owner",
    retryable: false,
  },
  job_not_found: {
    title: "משימת הרינדור לא נמצאה",
    detail: "משימת הרינדור נמחקה, או שהקישור אליה כבר לא תקף.",
    action: "התחל ייצוא חדש.",
    audience: "user",
    retryable: false,
  },
  preferences_unavailable: {
    title: "טעינת ההעדפות נכשלה",
    detail: "אירעה תקלה זמנית בצד שלנו בטעינת ההעדפות שלך.",
    action: "אפשר לנסות שוב בעוד רגע.",
    audience: "owner",
    retryable: true,
  },
  preferences_update_failed: {
    title: "שמירת ההעדפות נכשלה",
    detail: "אירעה תקלה בצד שלנו בזמן שמירת ההעדפות.",
    action: "אפשר לנסות שוב.",
    audience: "owner",
    retryable: true,
  },
  pro_required: {
    title: "התכונה הזו זמינה במסלול Pro",
    detail: "המסלול הנוכחי שלך לא כולל את התכונה הזו.",
    action: "אפשר לשדרג מסלול בעמוד החשבון.",
    audience: "user",
    retryable: false,
  },
  profile_update_failed: {
    title: "עדכון הפרופיל נכשל",
    detail: "אירעה תקלה בצד שלנו בזמן עדכון פרטי המשתמש.",
    action: "אפשר לנסות שוב.",
    audience: "owner",
    retryable: true,
  },
  project_create_failed: {
    title: "יצירת הפרויקט נכשלה",
    detail: "אירעה תקלה בצד שלנו בזמן יצירת הפרויקט.",
    action: "אפשר לנסות שוב.",
    audience: "owner",
    retryable: true,
  },
  project_delete_failed: {
    title: "מחיקת הפרויקט נכשלה",
    detail: "אירעה תקלה בצד שלנו בזמן מחיקת הפרויקט.",
    action: "אפשר לנסות שוב.",
    audience: "owner",
    retryable: true,
  },
  project_name_required: {
    title: "חסר שם לפרויקט",
    detail: "צריך להזין שם לפני שמירת הפרויקט.",
    action: "הזן שם ונסה שוב.",
    audience: "user",
    retryable: false,
  },
  project_not_found: {
    title: "הפרויקט לא נמצא",
    detail: "הפרויקט נמחק, או שאין לחשבון הזה הרשאה לגשת אליו.",
    audience: "user",
    retryable: false,
  },
  project_state_too_large: {
    title: "הפרויקט גדול מדי לשמירה",
    detail: "היקף העריכה בפרויקט הזה חורג מהגודל שניתן לשמור בענן.",
    action: "אפשר לפצל את הפרויקט לכמה פרויקטים קטנים יותר, או להסיר שכבות ועריכות שאינן בשימוש.",
    audience: "user",
    retryable: false,
  },
  project_update_failed: {
    title: "שמירת הפרויקט בענן נכשלה",
    detail: "אירעה תקלה בצד שלנו בזמן שמירת השינויים בענן. העותק המקומי נשמר.",
    action: "אפשר לנסות שוב.",
    audience: "owner",
    retryable: true,
  },
  provider_mode_update_failed: {
    title: "עדכון אופן חיבור הבינה המלאכותית נכשל",
    detail: "אירעה תקלה בצד שלנו בזמן שמירת ההגדרה.",
    action: "אפשר לנסות שוב.",
    audience: "owner",
    retryable: true,
  },
  r2_not_configured: {
    title: "אחסון הקבצים אינו מוגדר כרגע",
    detail: "שירות האחסון בענן שמקבל את הקבצים אינו מוגדר כרגע בצד שלנו.",
    audience: "owner",
    retryable: false,
  },
  render_asset_unavailable: {
    title: "חלק מהקבצים עדיין לא מוכנים לרינדור",
    detail: "אחד או יותר מהקבצים הדרושים לייצוא עדיין לא סיימו לעלות לענן.",
    action: "המתן לסיום ההעלאה ונסה שוב.",
    audience: "user",
    retryable: true,
  },
  render_dispatch_failed: {
    title: "שליחת הרינדור נכשלה",
    detail: "אירעה תקלה בצד שלנו בזמן העברת המשימה לשרת הרינדור.",
    action: "אפשר לנסות שוב. ייצוא על המכשיר תמיד זמין כגיבוי.",
    audience: "owner",
    retryable: true,
  },
  render_job_create_failed: {
    title: "יצירת משימת הרינדור נכשלה",
    detail: "אירעה תקלה בצד שלנו בזמן פתיחת משימת הרינדור.",
    action: "אפשר לנסות שוב.",
    audience: "owner",
    retryable: true,
  },
  result_asset_create_failed: {
    title: "שמירת קובץ התוצאה נכשלה",
    detail: "הרינדור הסתיים, אבל רישום קובץ התוצאה במסד הנתונים נכשל.",
    action: "אפשר לנסות שוב.",
    audience: "owner",
    retryable: true,
  },
  role_update_failed: {
    title: "עדכון התפקיד נכשל",
    detail: "אירעה תקלה בצד שלנו בזמן שמירת התפקיד החדש.",
    action: "אפשר לנסות שוב.",
    audience: "owner",
    retryable: true,
  },
  storage_delete_failed: {
    title: "מחיקת הקובץ מהאחסון נכשלה",
    detail: "אירעה תקלה בצד שלנו בזמן מחיקת הקובץ משירות האחסון.",
    action: "אפשר לנסות שוב.",
    audience: "owner",
    retryable: true,
  },
  subscription_already_exists: {
    title: "כבר יש מנוי או ניסיון פעיל",
    detail: "בחשבון הזה כבר קיים מנוי או תקופת ניסיון, ולכן לא נפתח Checkout נוסף.",
    action: "אפשר לנהל את המנוי הקיים דרך כפתור ניהול החיוב.",
    audience: "user",
    retryable: false,
  },
  subscription_identity_missing: {
    title: "אירוע חיוב לא זוהה",
    detail: "האירוע שהתקבל מספק התשלומים לא כלל מזהה משתמש או מסלול תקינים.",
    audience: "owner",
    retryable: false,
  },
  subscription_missing: {
    title: "אין מנוי פעיל",
    detail: "לא נמצא מנוי פעיל לניהול בחשבון הזה.",
    audience: "user",
    retryable: false,
  },
  subscription_sync_failed: {
    title: "עדכון המנוי נכשל",
    detail: "אירעה תקלה בצד שלנו בזמן סנכרון פרטי המנוי מספק התשלומים.",
    audience: "owner",
    retryable: true,
  },
  subscription_update_failed: {
    title: "עדכון המנוי נכשל",
    detail: "אירעה תקלה בצד שלנו בזמן עדכון פרטי המנוי.",
    action: "אפשר לנסות שוב.",
    audience: "owner",
    retryable: true,
  },
  super_admin_protected: {
    title: "לא ניתן לשנות תפקיד של מנהל־על",
    detail: "תפקידו של מנהל־העל (Super Admin) מוגן משינוי דרך מסך הניהול.",
    audience: "user",
    retryable: false,
  },
  system_owner_protected: {
    title: "לא ניתן למחוק את חשבון הבעלים",
    detail: "החשבון הזה מוגדר כבעלים של המערכת, ולכן מחיקתו חסומה.",
    action: "כדי למחוק את החשבון יש להעביר קודם את תפקיד הבעלים לחשבון אחר.",
    audience: "user",
    retryable: false,
  },
  unauthorized: {
    title: "נדרשת התחברות מחדש",
    detail: "החיבור שלך פג תוקף או שאינו תקין יותר.",
    action: "התחבר שוב ונסה את הפעולה פעם נוספת.",
    audience: "user",
    retryable: false,
  },
  unsupported_provider: {
    title: "ספק בינה מלאכותית לא נתמך",
    detail: "הספק שנבחר אינו אחד מהספקים הנתמכים כרגע.",
    action: "בחר ספק אחר מהרשימה.",
    audience: "user",
    retryable: false,
  },
  upload_signing_failed: {
    title: "הכנת ההעלאה נכשלה",
    detail: "אירעה תקלה בצד שלנו בזמן הכנת הקישור להעלאת הקובץ.",
    action: "אפשר לנסות שוב.",
    audience: "owner",
    retryable: true,
  },
  upload_too_large: {
    title: "הקובץ גדול מדי",
    detail: "גודל הקובץ חורג מהמכסה המותרת להעלאה בחשבון הזה.",
    action: "כווץ את הקובץ או פצל אותו, ונסה להעלות שוב.",
    audience: "user",
    retryable: false,
  },
  uploaded_object_not_found: {
    title: "הקובץ שהועלה לא נמצא באחסון",
    detail: "כנראה שההעלאה לא הושלמה במלואה.",
    action: "נסה להעלות את הקובץ שוב.",
    audience: "user",
    retryable: true,
  },
  uploaded_size_mismatch: {
    title: "גודל הקובץ שהועלה לא תואם",
    detail: "הקובץ שנשמר באחסון אינו באותו גודל שדווח לפני ההעלאה, כנראה בגלל תקלה בהעברה.",
    action: "נסה להעלות את הקובץ שוב.",
    audience: "user",
    retryable: false,
  },
  uploaded_type_mismatch: {
    title: "סוג הקובץ שהועלה לא תואם",
    detail: "סוג הקובץ שנשמר באחסון שונה מהסוג שדווח לפני ההעלאה.",
    action: "ודא שזה הקובץ הנכון ונסה שוב.",
    audience: "user",
    retryable: false,
  },
  usage_unavailable: {
    title: "טעינת נתוני השימוש נכשלה",
    detail: "אירעה תקלה זמנית בצד שלנו בטעינת נתוני השימוש והמכסות.",
    action: "אפשר לנסות שוב בעוד רגע.",
    audience: "owner",
    retryable: true,
  },
  user_not_found: {
    title: "המשתמש לא נמצא",
    detail: "המשתמש המבוקש לא נמצא במערכת.",
    audience: "user",
    retryable: false,
  },
  webhook_not_configured: {
    title: "קליטת אירועי תשלום אינה מוגדרת",
    detail: "הסוד לאימות אירועים מספק התשלומים אינו מוגדר כרגע בצד שלנו.",
    audience: "owner",
    retryable: false,
  },
  worker_cannot_burn_subtitles: {
    title: "צריבת כתוביות בענן אינה זמינה כרגע",
    detail: "שרת הרינדור המהיר שפרוס כרגע עדיין לא תומך בצריבת כתוביות לתוך הווידאו.",
    action: "הייצוא יימשך בדפדפן במקום זאת. זה יעבוד, אבל ייקח יותר זמן.",
    audience: "user",
    retryable: false,
  },
};

// --- web/lib (throw new Error("...")) -----------------------------------

const LIB_CODES: Record<string, Entry> = {
  append: {
    title: "תקלה פנימית בהרכבת הווידאו",
    detail: "שלב עיבוד הווידאו נתקל במבנה נתונים לא צפוי, והפרטים דווחו לצוות.",
    audience: "owner",
    retryable: false,
  },
  billing_not_configured: {
    title: "מערכת התשלומים אינה מוגדרת כרגע",
    detail: "המפתח לחיבור לספק הסליקה אינו מוגדר כרגע בצד שלנו.",
    audience: "owner",
    retryable: false,
  },
  billing_trial_missing: {
    title: "חודש הניסיון עדיין אינו מוגדר",
    detail: "לפחות אחד ממסלולי התשלום עדיין לא מוגדר עם תקופת ניסיון, ולכן לא נפתח Checkout מטעה.",
    audience: "owner",
    retryable: false,
  },
  byok_delete_failed: {
    title: "מחיקת המפתח נכשלה",
    detail: "אירעה תקלה בצד שלנו בזמן מחיקת מפתח ה-API השמור.",
    action: "אפשר לנסות שוב.",
    audience: "owner",
    retryable: true,
  },
  byok_encryption_not_configured: {
    title: "שמירת מפתחות API אינה זמינה כרגע",
    detail: "מנגנון ההצפנה שמגן על מפתחות ה-API שנשמרים בחשבון אינו מוגדר כרגע בצד שלנו.",
    audience: "owner",
    retryable: false,
  },
  byok_save_failed: {
    title: "שמירת המפתח נכשלה",
    detail: "אירעה תקלה בצד שלנו בזמן שמירת מפתח ה-API.",
    action: "אפשר לנסות שוב.",
    audience: "owner",
    retryable: true,
  },
  byok_storage_unavailable: {
    title: "שמירת מפתחות API אינה זמינה כרגע",
    detail: "החיבור לאחסון המפתחות המוצפנים אינו זמין כרגע.",
    action: "אפשר לנסות שוב בעוד רגע.",
    audience: "owner",
    retryable: true,
  },
  cloud_render_402: {
    title: "מכסת הרינדור בענן נגמרה",
    detail: "החשבון הגיע למכסת דקות הרינדור בענן הזמינה במסלול הנוכחי.",
    action: "הייצוא יימשיך על המכשיר במקום זאת. אפשר גם לשדרג מסלול לקבלת מכסה גדולה יותר.",
    audience: "user",
    retryable: false,
  },
  cloud_upload_network_error: {
    title: "ההעלאה נקטעה",
    detail: "החיבור לרשת נקטע באמצע העלאת הקובץ.",
    action: "בדוק את החיבור לאינטרנט ונסה שוב.",
    audience: "user",
    retryable: true,
  },
  direction: {
    title: "תקלה פנימית בפקודת עריכה",
    detail: "פקודת עריכה פנימית קיבלה פרמטר לא תקין, והפרטים דווחו לצוות.",
    audience: "owner",
    retryable: false,
  },
  free_has_no_checkout: {
    title: "אין תשלום במסלול החינמי",
    detail: "המסלול החינמי לא דורש תשלום, ולכן אין עבורו מסך Checkout.",
    audience: "user",
    retryable: false,
  },
  lemon_store_missing: {
    title: "חנות התשלומים לא נמצאה",
    detail: "לא נמצאה אף חנות בחשבון ספק הסליקה המחובר כרגע.",
    audience: "owner",
    retryable: false,
  },
  limit_reached: {
    title: "המכסה הזמינה נגמרה",
    detail: "החשבון הגיע למכסה הזמינה במסלול הנוכחי.",
    action: "אפשר לשדרג מסלול בעמוד החשבון, או להמתין לחידוש המכסה.",
    audience: "user",
    retryable: false,
  },
  offline: {
    title: "אין חיבור לרשת",
    detail: "לא הצלחנו ליצור חיבור לשרת.",
    action: "בדוק את החיבור לאינטרנט ונסה שוב.",
    audience: "user",
    retryable: true,
  },
  thumbnail: {
    title: "יצירת תמונה ממוזערת נכשלה",
    detail: "טעינת הווידאו ליצירת תצוגה מקדימה נכשלה, כנראה בגלל בעיה בקובץ עצמו.",
    action: "אם התצוגה המקדימה ממשיכה לא להופיע, נסה קובץ אחר.",
    audience: "user",
    retryable: false,
  },
};

// --- קודים אמיתיים שלא נתפסו ב-INVENTORY.md -----------------------------
//
// שלושתם נזרקים בפועל ב-web/lib/billing/lemon.ts. account/page.tsx כבר
// היה לו טיפול ידני ל-billing_variant_missing ו-billing_trial_missing —
// כאן זה מקבל מקום קבוע ומטופל גם billing_variant_ambiguous ו-
// lemon_store_mismatch (הקוד השני נזרק עם סיומת דינמית, "lemon_store_
// mismatch:<storeId>" — ראו ההתאמה לפי prefix למטה).

const UNLISTED_BUT_REAL_CODES: Record<string, Entry> = {
  billing_variant_missing: {
    title: "מסלול התשלום עדיין אינו מוגדר",
    detail: "לא נמצא מוצר תואם למסלול ולתדירות שנבחרו אצל ספק הסליקה.",
    audience: "owner",
    retryable: false,
  },
  billing_variant_ambiguous: {
    title: "מסלול התשלום מוגדר בצורה כפולה",
    detail: "יותר ממוצר אחד תואם למסלול ולתדירות שנבחרו, ולא ניתן לדעת איזה מהם לחייב.",
    audience: "owner",
    retryable: false,
  },
  lemon_store_mismatch: {
    title: "חנות התשלומים אינה תואמת",
    detail: "החנות המוגדרת בצד שלנו אינה תואמת לחנות שנמצאה אצל ספק הסליקה.",
    audience: "owner",
    retryable: false,
  },
};

const CODES: Record<string, Entry> = {
  ...API_CODES,
  ...LIB_CODES,
  ...UNLISTED_BUT_REAL_CODES,
};

// --- נפילה לפי קוד סטטוס HTTP, כשהקוד עצמו לא מזוהה ----------------------

const STATUS_FALLBACK: Record<number, Entry> = {
  401: {
    title: "נדרשת התחברות",
    detail: "החיבור שלך פג תוקף או שאינו תקין יותר.",
    action: "התחבר שוב ונסה את הפעולה פעם נוספת.",
    audience: "user",
    retryable: false,
  },
  403: {
    title: "אין הרשאה לפעולה הזו",
    detail: "החשבון הזה אינו מורשה לבצע את הפעולה המבוקשת.",
    audience: "user",
    retryable: false,
  },
  404: {
    title: "הפריט לא נמצא",
    detail: "הוא נמחק, הועבר, או שהקישור אליו כבר לא תקף.",
    audience: "user",
    retryable: false,
  },
  413: {
    title: "התוכן גדול מדי",
    detail: "הנתונים שנשלחו חורגים מהגודל המותר.",
    action: "צמצם את הגודל (קובץ, תמונה, או היקף העריכה) ונסה שוב.",
    audience: "user",
    retryable: false,
  },
  429: {
    title: "יותר מדי בקשות בזמן קצר",
    detail: "המערכת מגבילה זמנית את קצב הבקשות כדי לשמור על יציבות.",
    action: "המתן קצת ונסה שוב.",
    audience: "user",
    retryable: true,
  },
};

const SERVER_FAULT_FALLBACK: Entry = {
  title: "תקלה בצד שלנו",
  detail: "אירעה תקלה בשרת בזמן ביצוע הפעולה, והפרטים דווחו לצוות.",
  action: "אפשר לנסות שוב בעוד רגע.",
  audience: "owner",
  retryable: true,
};

const GENERIC_FALLBACK: Entry = {
  title: "משהו השתבש",
  detail: "הפעולה לא הושלמה מסיבה לא ידועה.",
  action: "אפשר לנסות שוב. אם זה חוזר, אפשר לפנות לתמיכה עם פרטי השגיאה.",
  audience: "owner",
  retryable: false,
};

/**
 * true אם המחרוזת "נראית" כמו קוד מכונה (snake_case, אנגלית, אולי עם
 * סיומת ":..." דינמית) ולא כמו טקסט עברי שכבר נועד לעיני המשתמש. משמש
 * בחיבור לממשק כדי לא לדרוס הודעות עבריות טובות שכבר קיימות (כגון
 * תוצאות runCommand) בהודעת נפילה גנרית.
 */
export function looksLikeErrorCode(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^[a-z][a-z0-9]*(_[a-z0-9]+)*(:.*)?$/.test(trimmed);
}

/**
 * true אם יש לקוד הזה הודעה מפורשת בקטלוג (בהתאמה מדויקת או לפי prefix
 * לפני ":"). false אומר שהוא ייפול לברירת המחדל הכללית. נועד לבדיקות —
 * כדי לוודא שכל קוד ב-INVENTORY.md מכוסה בפועל, ולא רק "מקבל תשובה כלשהי".
 */
export function isKnownErrorCode(code: string | null | undefined): boolean {
  if (!code) return false;
  const trimmed = code.trim();
  if (!trimmed) return false;
  if (CODES[trimmed]) return true;
  const idx = trimmed.indexOf(":");
  if (idx > 0) return !!CODES[trimmed.slice(0, idx)];
  return false;
}

function lookup(code: string): Entry | undefined {
  const exact = CODES[code];
  if (exact) return exact;
  const idx = code.indexOf(":");
  if (idx > 0) {
    const prefix = CODES[code.slice(0, idx)];
    if (prefix) return prefix;
  }
  return undefined;
}

function statusFallback(status: number | undefined): Entry | undefined {
  if (status == null) return undefined;
  const exact = STATUS_FALLBACK[status];
  if (exact) return exact;
  if (status >= 500 && status < 600) return SERVER_FAULT_FALLBACK;
  return undefined;
}

/**
 * ההסבר האנושי לקוד שגיאה. אף פעם לא זורק, אף פעם לא מחזיר "undefined" —
 * קוד לא מוכר מקבל הסבר גנרי הגון, ואם יש status HTTP משמעותי (401/403/
 * 404/413/429/5xx) הוא מדויק יותר מהגנרי לגמרי.
 */
export function explainError(code: string | null | undefined, status?: number): ErrorExplanation {
  const raw = (code ?? "").trim();
  const byCode = raw ? lookup(raw) : undefined;
  if (byCode) return { ...byCode, code: raw };
  const byStatus = statusFallback(status);
  if (byStatus) return { ...byStatus, code: raw };
  return { ...GENERIC_FALLBACK, code: raw };
}
