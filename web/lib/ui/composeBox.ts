// גיאומטריית תיבת ההודעה בצ'אט — מקור אמת יחיד למספרים שמופיעים גם ב-CSS
// (‎.chat-compose ב-globals.css) וגם בלוגיקת הגרירה ב-Chat.tsx.
//
// למה זה קובץ נפרד: התיבה שומרת אזורים מוגנים לכפתורים (שורת הכלים למעלה,
// שליחה/עצירה בתחתית) בעזרת padding על ה-textarea. ה-padding נספר בתוך הגובה
// (box-sizing: border-box), ולכן גובה שנראה "סביר" יכול להשאיר לטקסט אפס
// פיקסלים — בדיוק מה שקרה: גובה 82px מול padding של 44+40, כלומר שטח כתיבה 0.
// כל שינוי במספרים כאן חייב להישאר מסונכרן עם ה-CSS, וה-בדיקות אוכפות שגם
// הגובה המינימלי מותיר לפחות שורה אחת שלמה.

/** padding-top: מפנה מקום לשורת הכלים (+ / / @) בפינה העליונה. */
export const COMPOSE_PAD_TOP = 42;
/** padding-bottom: רווח נשימה מתחת לשורת הטקסט האחרונה. */
export const COMPOSE_PAD_BOTTOM = 12;
/** גובה שורת טקסט אחת (font-size 13px * line-height 1.55), מעוגל למעלה. */
export const COMPOSE_LINE_H = 21;
/** כמה שורות התיבה מציגה כברירת מחדל. */
export const COMPOSE_DEFAULT_LINES = 3;

export const COMPOSE_RESERVED = COMPOSE_PAD_TOP + COMPOSE_PAD_BOTTOM;
export const COMPOSE_H_MIN = COMPOSE_RESERVED + COMPOSE_LINE_H;
export const COMPOSE_H_DEFAULT = COMPOSE_RESERVED + COMPOSE_LINE_H * COMPOSE_DEFAULT_LINES;
export const COMPOSE_H_MAX = 280;

/** גובה אזור הכתיבה בפועל — מה שנשאר אחרי האזורים המוגנים. */
export function composeContentHeight(boxHeight: number): number {
  return Math.max(0, Math.round(boxHeight) - COMPOSE_RESERVED);
}

/**
 * מגביל גובה תיבה לטווח שמשאיר לפחות שורה אחת. משמש גם לגרירה וגם לערך
 * שנשמר ב-localStorage: ערך ישן שנשמר לפני שהאזורים המוגנים גדלו יוחזר
 * לברירת המחדל במקום להישאר תיבה שאי אפשר לכתוב בה.
 */
export function clampComposeHeight(px: number): number {
  if (!Number.isFinite(px) || px < COMPOSE_H_MIN) return COMPOSE_H_DEFAULT;
  return Math.min(COMPOSE_H_MAX, Math.round(px));
}

/** גובה חוקי לגרירה חיה (בלי הנפילה לברירת מחדל — גרירה למטה פשוט נעצרת במינימום). */
export function clampComposeDrag(px: number): number {
  if (!Number.isFinite(px)) return COMPOSE_H_DEFAULT;
  return Math.max(COMPOSE_H_MIN, Math.min(COMPOSE_H_MAX, Math.round(px)));
}
