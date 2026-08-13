// תבניות טקסט וכרטיסים.
//
// כל תבנית היא גיאומטריה + סגנון בלבד — ערכים שכבר נתמכים גם ב-PreviewOverlays
// וגם ב-overlayBurn בייצוא. אין כאן נכס חיצוני, פונט מוטמע או קובץ אנימציה,
// ולכן אין שאלת רישוי ואין פער בין תצוגה לייצוא.
//
// המיקומים באחוזים מהקנבס, כך שהתבנית נכונה בכל יחס גובה-רוחב.

export type TextCategory =
  | "title"      // כותרות
  | "lower"      // כתוביות תחתונות
  | "dedication" // הקדשות
  | "source"     // ציון מקור
  | "cta"        // קריאה לפעולה
  | "quote";     // ציטוט

export interface TextPreset {
  id: string;
  labelHe: string;
  category: TextCategory;
  /** טקסט לדוגמה — מוחלף בתוכן אמיתי. */
  sampleHe: string;
  /** מיקום וגודל באחוזים מהקנבס. */
  box: { x: number; y: number; width: number; height: number };
  style: {
    /** אחוז מהצלע הקצרה. */
    fontSize: number;
    color: string;
    bold: boolean;
    align: "right" | "center" | "left";
    background: string | null;
    borderRadius: number;
    /** ריפוד פנימי באחוזים מרוחב התיבה. */
    padding: number;
    lineHeight: number;
  };
  fade: { in: number; out: number };
  /** משך מומלץ בשניות. */
  suggestedDuration: number;
}

const P = (
  id: string,
  labelHe: string,
  category: TextCategory,
  sampleHe: string,
  box: TextPreset["box"],
  style: Partial<TextPreset["style"]> & { fontSize: number },
  suggestedDuration = 4,
  fade: TextPreset["fade"] = { in: 0.35, out: 0.35 },
): TextPreset => ({
  id, labelHe, category, sampleHe, box, suggestedDuration, fade,
  style: {
    color: "#ffffff",
    bold: true,
    align: "right",
    background: null,
    borderRadius: 0,
    padding: 4,
    lineHeight: 1.35,
    ...style,
  },
});

export const TEXT_PRESETS: readonly TextPreset[] = [
  // ── כותרות ──────────────────────────────────────────────────────────────
  P("title_center", "כותרת מרכזית", "title", "שיעור על הפטירה ועולם העליון",
    { x: 10, y: 38, width: 80, height: 24 }, { fontSize: 8, align: "center" }, 4),
  P("title_bar", "כותרת על פס", "title", "פרק א׳ — הקדמה",
    { x: 8, y: 12, width: 84, height: 12 }, { fontSize: 5.5, align: "center", background: "rgba(0,0,0,0.62)", borderRadius: 8 }, 4),
  P("title_corner", "כותרת בפינה", "title", "ישיבת הקדיש והחסד",
    { x: 6, y: 7, width: 45, height: 9 }, { fontSize: 4, align: "right", background: "rgba(0,0,0,0.5)", borderRadius: 6 }, 6),
  P("title_underline", "כותרת עם קו", "title", "קשה סילוקו של אדם כשר",
    { x: 8, y: 30, width: 84, height: 20 }, { fontSize: 7, align: "center", background: "rgba(0,0,0,0.28)", borderRadius: 4 }, 4),
  P("title_full", "כותרת מסך מלא", "title", "לעילוי נשמת",
    { x: 5, y: 20, width: 90, height: 60 }, { fontSize: 10, align: "center", background: "rgba(0,0,0,0.78)", borderRadius: 0 }, 5, { in: 0.6, out: 0.6 }),

  // ── כתוביות תחתונות ─────────────────────────────────────────────────────
  P("lower_name", "שם ותפקיד", "lower", "הרב ישראל כהן\nראש הישיבה",
    { x: 6, y: 72, width: 46, height: 16 }, { fontSize: 4.2, align: "right", background: "rgba(0,0,0,0.6)", borderRadius: 8, lineHeight: 1.5 }, 5),
  P("lower_slim", "פס דק", "lower", "מתוך השיעור השבועי",
    { x: 6, y: 82, width: 60, height: 8 }, { fontSize: 3.6, align: "right", background: "rgba(0,0,0,0.55)", borderRadius: 4 }, 5),
  P("lower_accent", "פס עם הדגשה", "lower", "שאלה: למה פעם שריפה ופעם חורבן?",
    { x: 6, y: 76, width: 70, height: 12 }, { fontSize: 4.4, align: "right", background: "rgba(17,24,39,0.85)", borderRadius: 10 }, 5),

  // ── הקדשות ──────────────────────────────────────────────────────────────
  P("dedication_card", "כרטיס הקדשה", "dedication",
    "הנצחת השיעור לעילוי נשמת\nמשה בן רחל\nת.נ.צ.ב.ה",
    { x: 12, y: 24, width: 76, height: 52 },
    { fontSize: 6, align: "center", background: "rgba(0,0,0,0.72)", borderRadius: 16, lineHeight: 1.6, padding: 6 }, 6, { in: 0.6, out: 0.6 }),
  P("dedication_slim", "הקדשה צרה", "dedication", "לעילוי נשמת משה בן רחל",
    { x: 10, y: 78, width: 80, height: 10 }, { fontSize: 4, align: "center", background: "rgba(0,0,0,0.6)", borderRadius: 8 }, 6),
  P("refua_card", "כרטיס רפואה שלמה", "dedication",
    "להצלחה ולרפואה שלמה\nדניאל בן רחל",
    { x: 14, y: 30, width: 72, height: 40 },
    { fontSize: 5.5, align: "center", background: "rgba(6,32,52,0.78)", borderRadius: 16, lineHeight: 1.6 }, 5, { in: 0.5, out: 0.5 }),

  // ── ציון מקור ───────────────────────────────────────────────────────────
  P("source_popup", "פופ-אפ מקור", "source", "מתוך שיעור בישיבת הקדיש והחסד",
    { x: 6, y: 8, width: 52, height: 9 }, { fontSize: 3.6, align: "right", background: "rgba(0,0,0,0.62)", borderRadius: 8 }, 4),
  P("source_bottom", "מקור למטה", "source", "גמרא, מסכת ראש השנה",
    { x: 6, y: 86, width: 48, height: 8 }, { fontSize: 3.4, align: "right", background: "rgba(0,0,0,0.5)", borderRadius: 6 }, 4),

  // ── קריאה לפעולה ────────────────────────────────────────────────────────
  P("cta_full", "מסך CTA מלא", "cta",
    "רוצים להקדיש שיעור לעילוי נשמת יקירכם?\nפנו אלינו עכשיו",
    { x: 8, y: 26, width: 84, height: 48 },
    { fontSize: 6.5, align: "center", background: "rgba(0,0,0,0.8)", borderRadius: 18, lineHeight: 1.6 }, 6, { in: 0.5, out: 0.5 }),
  P("cta_bar", "פס CTA", "cta", "להקדשת שיעור — התקשרו עכשיו",
    { x: 8, y: 80, width: 84, height: 11 }, { fontSize: 4.6, align: "center", background: "rgba(180,83,9,0.9)", borderRadius: 10 }, 5),
  P("cta_phone", "CTA עם טלפון", "cta", "לפרטים והקדשות\n03-0000000",
    { x: 20, y: 62, width: 60, height: 26 }, { fontSize: 5.5, align: "center", background: "rgba(0,0,0,0.75)", borderRadius: 14, lineHeight: 1.5 }, 6),

  // ── ציטוט ───────────────────────────────────────────────────────────────
  P("quote_center", "ציטוט מרכזי", "quote", "״קשה סילוקו של אדם כשר\nכשריפת בית אלהינו״",
    { x: 12, y: 32, width: 76, height: 36 }, { fontSize: 6.5, align: "center", background: "rgba(0,0,0,0.55)", borderRadius: 12, lineHeight: 1.55 }, 5),
  P("quote_side", "ציטוט בצד", "quote", "״אפשר עוד לשחזר,\nאפשר להציל״",
    { x: 52, y: 30, width: 42, height: 30 }, { fontSize: 5, align: "right", background: "rgba(0,0,0,0.6)", borderRadius: 12, lineHeight: 1.5 }, 5),
] as const;

export const TEXT_CATEGORIES: Array<{ id: TextCategory; labelHe: string }> = [
  { id: "title", labelHe: "כותרות" },
  { id: "lower", labelHe: "כתוביות תחתונות" },
  { id: "dedication", labelHe: "הקדשות" },
  { id: "source", labelHe: "ציון מקור" },
  { id: "cta", labelHe: "קריאה לפעולה" },
  { id: "quote", labelHe: "ציטוטים" },
];

export function textPresetById(id: string | null | undefined): TextPreset | undefined {
  const key = String(id || "").trim().toLowerCase();
  if (!key) return undefined;
  return TEXT_PRESETS.find((p) => p.id === key) || TEXT_PRESETS.find((p) => p.labelHe === id);
}

export function textPresetsByCategory(category: TextCategory): TextPreset[] {
  return TEXT_PRESETS.filter((p) => p.category === category);
}

export function searchTextPresets(query: string): TextPreset[] {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [...TEXT_PRESETS];
  return TEXT_PRESETS.filter((p) => p.id.includes(q) || p.labelHe.includes(q) || p.category.includes(q));
}
