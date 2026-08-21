// תרגום מונחי חיפוש מעברית לאנגלית עבור ספריות חיצוניות.
//
// למה זה נחוץ: Iconify (334,395 אייקונים) ו-GIPHY מחפשים באנגלית בלבד. מוצר
// שכל הממשק שלו עברי מחזיר "לא נמצאו תוצאות" לכל חיפוש טבעי של המשתמש —
// "חץ", "לב", "מצלמה" — וזה נראה כמו שירות תקול ולא כמו מגבלת שפה.
//
// זו מפה מכוונת ולא מנוע תרגום: היא מכסה את המונחים החוזרים בעריכת וידאו, ולא
// מתיימרת לתרגם משפטים. טקסט שאינו עברי עובר כמות שהוא.

const TERMS: Readonly<Record<string, string>> = {
  // ניווט וכיוון
  "חץ": "arrow", "חצים": "arrow", "ימינה": "arrow right", "שמאלה": "arrow left",
  "למעלה": "arrow up", "למטה": "arrow down", "חזור": "back", "הבא": "next",
  // ממשק בסיסי
  "בית": "home", "חיפוש": "search", "הגדרות": "settings", "תפריט": "menu",
  "סגור": "close", "פלוס": "plus", "הוסף": "plus", "מחק": "trash", "אשפה": "trash",
  "ערוך": "edit", "עיפרון": "pencil", "שמור": "save", "הורדה": "download",
  "העלאה": "upload", "שתף": "share", "העתק": "copy", "קישור": "link",
  "נעילה": "lock", "מנעול": "lock", "פתוח": "unlock", "עין": "eye",
  "סימון": "check", "וי": "check", "איקס": "x", "אזהרה": "warning",
  "מידע": "info", "שאלה": "question", "כוכב": "star", "לב": "heart",
  // מדיה
  "מצלמה": "camera", "וידאו": "video", "סרטון": "video", "תמונה": "image",
  "מוזיקה": "music", "מוסיקה": "music", "שמע": "audio", "אודיו": "audio",
  "מיקרופון": "microphone", "רמקול": "speaker", "נגן": "play", "נגינה": "play",
  "עצור": "stop", "השהה": "pause", "הקלטה": "record", "סרט": "film",
  "כתוביות": "subtitles", "קליפ": "clip", "ציר": "timeline", "מספריים": "scissors",
  "חיתוך": "cut", "עריכה": "edit",
  // רשתות חברתיות
  "יוטיוב": "youtube", "אינסטגרם": "instagram", "טיקטוק": "tiktok",
  "פייסבוק": "facebook", "וואטסאפ": "whatsapp", "טלגרם": "telegram",
  "לייק": "thumbs up", "הרשמה": "subscribe", "פעמון": "bell", "התראה": "bell",
  "תגובה": "comment", "הודעה": "message", "שיתוף": "share",
  // עסקים ותוכן
  "גרף": "chart", "תרשים": "chart", "כסף": "money", "עגלה": "cart",
  "קניות": "shopping", "מתנה": "gift", "פרס": "trophy", "גביע": "trophy",
  "לוח": "calendar", "שעון": "clock", "זמן": "clock", "מיקום": "location",
  "מפה": "map", "טלפון": "phone", "מייל": "mail", "דואר": "mail",
  "משתמש": "user", "אנשים": "users", "קבוצה": "users",
  // רגש וקישוט
  "אש": "fire", "ניצוץ": "sparkles", "קסם": "magic", "כתר": "crown",
  "יהלום": "diamond", "מנורה": "lamp", "רעיון": "lightbulb", "מוח": "brain",
  "צחוק": "laugh", "עצוב": "sad", "שמח": "happy", "קונפטי": "confetti",
  "בלון": "balloon", "חגיגה": "celebration", "זיקוקים": "fireworks",
  // יהדות ותוכן תורני — קהל היעד של המוצר
  "תורה": "torah", "ספר": "book", "ספרים": "books", "נר": "candle",
  "נרות": "candles", "מגן דוד": "star of david", "מנורת": "menorah",
  "מנורה שבעה": "menorah", "כיפה": "kippah", "תפילה": "prayer",
  "בית כנסת": "synagogue", "שבת": "shabbat", "חג": "holiday",
};

const HEBREW = /[\u0590-\u05FF]/;

/** True אם הטקסט מכיל אות עברית ולכן לא יימצא בשירות חיפוש אנגלי. */
export function isHebrewQuery(query: string): boolean {
  return HEBREW.test(query || "");
}

/**
 * מתרגם שאילתת חיפוש עברית לאנגלית לצורך שירות חיצוני.
 *
 * מחזיר את המחרוזת המקורית כשאין בה עברית (כדי לא לפגוע בחיפוש אנגלי תקין),
 * וכשאף מילה לא מוכרת — מחזיר "" כדי שהקורא יידע שאין טעם לפנות לשירות
 * ויציג הודעה כנה במקום רשימה ריקה בלי הסבר.
 */
export function translateSearchQuery(query: string): string {
  const raw = String(query || "").trim();
  if (!raw) return "";
  if (!isHebrewQuery(raw)) return raw;

  // צירוף מילים שלם קודם ("מגן דוד"), אחר כך מילה-מילה.
  const whole = TERMS[raw];
  if (whole) return whole;

  const words = raw.split(/\s+/);
  const mapped = words
    .map((w) => TERMS[w] || TERMS[w.replace(/^[הוב]/, "")] || "")
    .filter(Boolean);
  return mapped.length ? [...new Set(mapped.join(" ").split(" "))].join(" ") : "";
}

/** כמה מונחים המילון מכיר — לבדיקות ולתיעוד. */
export const HEBREW_TERM_COUNT = Object.keys(TERMS).length;
