// כתובת הקשר הציבורית.
//
// ספק תשלומים שבודק בקשת אישור חנות מחפש דרך ליצור קשר עם העסק, וכך גם תקנות
// הנגישות — הצהרת נגישות חייבת לכלול פרטי רכז נגישות. לכן זו נקודה אחת שכל
// העמודים הציבוריים קוראים ממנה, ולא כתובת שמפוזרת בקוד.
//
// נקבע דרך NEXT_PUBLIC_SUPPORT_EMAIL כדי שלא תהיה כתובת אישית מקודדת בריפו.

export const SUPPORT_EMAIL =
  (process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "").trim() || "support@hypescript.co.il";

/** האם הוגדרה כתובת אמיתית, או שאנחנו על ברירת המחדל שעדיין לא קיימת. */
export const SUPPORT_EMAIL_CONFIGURED = Boolean((process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "").trim());
