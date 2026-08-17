// קטלוג תבניות טקסט מורחב (48+ תבניות) המותאמות לסרטוני שיעורים, רשתות ופודקאסטים בעברית.

export type TextCategory = "title" | "lower" | "dedication" | "source" | "quote" | "cta" | "chapter";

export interface TextPreset {
  id: string;
  labelHe: string;
  category: TextCategory;
  /** טקסט לדוגמה שיוצג בכרטיס ויוזן לשכבה חדשה. */
  sampleHe: string;
  /** מיקום יחסי באחוזים (0..100). */
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  style: {
    fontSize: number; // באחוזי גובה קנבס (למשל 4 = 4vh)
    color?: string;
    bold?: boolean;
    align?: "right" | "center" | "left";
    background?: string | null;
    borderRadius?: number;
    borderColor?: string;
    borderWidth?: number;
    padding?: number;
    lineHeight?: number;
  };
  /** משך ברירת-מחדל מומלץ בשניות (כותרת 4s, הקדשה 6s, כתובית תחתונה 5s). */
  suggestedDuration: number;
  /** עמעום כניסה/יציאה בשניות. */
  fade: { in: number; out: number };
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
  // ── כותרות ופתיחים ──────────────────────────────────────────────────────
  P("title_center", "כותרת מרכזית קלאסית", "title", "שיעור בנושא עולם המחשבה",
    { x: 10, y: 38, width: 80, height: 24 }, { fontSize: 8, align: "center" }, 4),
  P("title_bar", "כותרת על פס כהה", "title", "פרק א׳ — הקדמה ויסודות",
    { x: 8, y: 12, width: 84, height: 12 }, { fontSize: 5.5, align: "center", background: "rgba(0,0,0,0.62)", borderRadius: 8 }, 4),
  P("title_corner", "כותרת בפינה", "title", "שיעור שבועי בעיון",
    { x: 6, y: 7, width: 45, height: 9 }, { fontSize: 4, align: "right", background: "rgba(0,0,0,0.5)", borderRadius: 6 }, 6),
  P("title_underline", "כותרת עם מסגרת עדינה", "title", "עיקרי הדברים והמסקנות",
    { x: 8, y: 30, width: 84, height: 20 }, { fontSize: 7, align: "center", background: "rgba(0,0,0,0.35)", borderRadius: 8, borderColor: "rgba(255,255,255,0.2)", borderWidth: 2 }, 4),
  P("title_full", "כותרת מסך מלא", "title", "לעילוי נשמת\nהרב אברהם זצ\"ל",
    { x: 5, y: 20, width: 90, height: 60 }, { fontSize: 9.5, align: "center", background: "rgba(0,0,0,0.78)", borderRadius: 0 }, 5, { in: 0.6, out: 0.6 }),
  P("title_bold_neon", "כותרת ניאון מודגשת", "title", "הסוד הגדול שמאחורי ההצלחה",
    { x: 8, y: 25, width: 84, height: 26 }, { fontSize: 7.8, align: "center", color: "#fef08a", background: "rgba(15,23,42,0.88)", borderRadius: 12, borderColor: "#eab308", borderWidth: 3 }, 4),
  P("title_podcast_tag", "כותרת פודקאסט", "title", "פרק 42 · שיחות אל תוך הלילה",
    { x: 12, y: 15, width: 76, height: 14 }, { fontSize: 5.2, align: "center", color: "#67e8f9", background: "rgba(8,51,68,0.85)", borderRadius: 20 }, 5),
  P("title_hook_top", "כותרת פתיח (Hook)", "title", "אל תעשו את הטעות הזאת!",
    { x: 6, y: 8, width: 88, height: 14 }, { fontSize: 6.2, align: "center", color: "#ffffff", background: "rgba(220,38,38,0.92)", borderRadius: 8 }, 3.5),
  P("title_glitch_banner", "כותרת באנר טרנדי", "title", "החלק שכולם חיכו לו 🔥",
    { x: 8, y: 18, width: 84, height: 18 }, { fontSize: 7, align: "center", color: "#facc15", background: "rgba(0,0,0,0.9)", borderRadius: 10, borderColor: "#ef4444", borderWidth: 2 }, 4),
  P("title_minimal_clean", "כותרת נקייה מרווחת", "title", "תובנות ומסקנות",
    { x: 10, y: 35, width: 80, height: 18 }, { fontSize: 6.8, align: "center", color: "#f8fafc", background: "rgba(15,23,42,0.6)", borderRadius: 8 }, 4),
  P("title_question_hook", "כותרת שאלת פתיחה", "title", "איך להשיג תוצאות ב-10 דקות בלבד?",
    { x: 6, y: 15, width: 88, height: 20 }, { fontSize: 6.2, align: "center", color: "#38bdf8", background: "rgba(0,0,0,0.85)", borderRadius: 12, borderColor: "#0284c7", borderWidth: 2 }, 4),

  // ── כתוביות תחתונות (Lower Thirds) ──────────────────────────────────────
  P("lower_name", "שם ותפקיד מסורתי", "lower", "הרב ישראל כהן\nראש הישיבה",
    { x: 6, y: 72, width: 46, height: 16 }, { fontSize: 4.2, align: "right", background: "rgba(0,0,0,0.65)", borderRadius: 8, lineHeight: 1.5 }, 5),
  P("lower_slim", "פס תחתון דק", "lower", "מתוך השיעור השבועי בירושלים",
    { x: 6, y: 82, width: 60, height: 8 }, { fontSize: 3.6, align: "right", background: "rgba(0,0,0,0.55)", borderRadius: 4 }, 5),
  P("lower_accent", "פס מודרני מודגש", "lower", "שאלה: כיצד נכון לנהוג במצב זה?",
    { x: 6, y: 76, width: 70, height: 12 }, { fontSize: 4.4, align: "right", background: "rgba(17,24,39,0.88)", borderRadius: 10, borderColor: "#38bdf8", borderWidth: 2 }, 5),
  P("lower_social_card", "תגית רשת חברתית", "lower", "@hypescript_ai · עקבו לעוד תכנים",
    { x: 6, y: 84, width: 50, height: 9 }, { fontSize: 3.5, align: "right", color: "#f8fafc", background: "rgba(30,41,59,0.9)", borderRadius: 16 }, 5),
  P("lower_dual_box", "כרטיס דו-שכבתי", "lower", "דוד מזרחי\nיועץ ומנחה סדנאות",
    { x: 6, y: 70, width: 52, height: 18 }, { fontSize: 4.2, align: "right", background: "rgba(15,23,42,0.92)", borderRadius: 12, borderColor: "#f59e0b", borderWidth: 3 }, 5),
  P("lower_news_ticker", "מבזק חדשות תחתון", "lower", "מבזק מיוחד: סיכום ההחלטות והעדכונים האחרונים",
    { x: 2, y: 88, width: 96, height: 8 }, { fontSize: 3.6, align: "right", color: "#ffffff", background: "rgba(185,28,28,0.95)", borderRadius: 0 }, 6),
  P("lower_pill_modern", "פס תחתון קפסולה", "lower", "יוסי כהן · מנהל פרויקטים",
    { x: 6, y: 82, width: 44, height: 8 }, { fontSize: 3.5, align: "center", color: "#ffffff", background: "rgba(15,23,42,0.9)", borderRadius: 20, borderColor: "#3b82f6", borderWidth: 1 }, 5),
  P("lower_quote_author", "שם אומר הציטוט", "lower", "— מתוך דברי הרב קוק זצ\"ל",
    { x: 45, y: 78, width: 50, height: 8 }, { fontSize: 3.6, align: "left", color: "#fde68a", background: "rgba(0,0,0,0.5)", borderRadius: 6 }, 5),
  P("lower_tagline_bar", "פס תיאור רחב", "lower", "סדרת הרצאות בנושא מנהיגות וערכים",
    { x: 5, y: 84, width: 90, height: 8 }, { fontSize: 3.5, align: "center", color: "#e2e8f0", background: "rgba(30,41,59,0.85)", borderRadius: 6 }, 5),

  // ── הקדשות וברכות ───────────────────────────────────────────────────────
  P("dedication_card", "כרטיס הנצחה קלאסי", "dedication",
    "הנצחת השיעור לעילוי נשמת\nמשה בן רחל ז\"ל\nת.נ.צ.ב.ה",
    { x: 12, y: 24, width: 76, height: 52 },
    { fontSize: 6, align: "center", background: "rgba(0,0,0,0.78)", borderRadius: 16, lineHeight: 1.6, padding: 6 }, 6, { in: 0.6, out: 0.6 }),
  P("dedication_gold_frame", "הקדשת זהב יוקרתית", "dedication",
    "לעילוי נשמת האהוב והיקר\nיוסף בן שרה ז\"ל\nיהי זכרו ברוך",
    { x: 10, y: 22, width: 80, height: 54 },
    { fontSize: 5.8, align: "center", color: "#fef08a", background: "rgba(13,25,48,0.94)", borderRadius: 16, borderColor: "#d6ad55", borderWidth: 3, lineHeight: 1.6 }, 6, { in: 0.6, out: 0.6 }),
  P("dedication_slim", "הקדשה צרה בתחתית", "dedication", "לעילוי נשמת משה בן רחל · ת.נ.צ.ב.ה",
    { x: 10, y: 78, width: 80, height: 10 }, { fontSize: 4, align: "center", background: "rgba(0,0,0,0.65)", borderRadius: 8 }, 6),
  P("refua_card", "כרטיס רפואה שלמה", "dedication",
    "לרפואה שלמה ובריאות איתנה\nדניאל בן רחל\nבתוך שאר חולי ישראל",
    { x: 14, y: 28, width: 72, height: 44 },
    { fontSize: 5.5, align: "center", color: "#e0f2fe", background: "rgba(6,32,52,0.85)", borderRadius: 16, borderColor: "#38bdf8", borderWidth: 2, lineHeight: 1.6 }, 5, { in: 0.5, out: 0.5 }),
  P("mazal_tov_card", "כרטיס ברכת מזל טוב", "dedication",
    "ברכת מזל טוב ושמחה\nלרגל הולדת הבן והשמחה הגדולה",
    { x: 12, y: 28, width: 76, height: 42 },
    { fontSize: 5.6, align: "center", color: "#fef9c3", background: "rgba(40,20,10,0.88)", borderRadius: 18, borderColor: "#f59e0b", borderWidth: 2, lineHeight: 1.5 }, 5),
  P("dedication_bracha_box", "ברכת הצלחה ופרנסה", "dedication",
    "להצלחה ופרנסה טובה וברווח\nולכל מילי דמיטב",
    { x: 12, y: 28, width: 76, height: 40 },
    { fontSize: 5.5, align: "center", color: "#fef9c3", background: "rgba(20,30,20,0.9)", borderRadius: 16, borderColor: "#22c55e", borderWidth: 2, lineHeight: 1.5 }, 5),
  P("dedication_chayal_box", "תפילה לשלום הלוחמים", "dedication",
    "לשלום וביטחון כל חיילי צה\"ל וכוחות הביטחון\nבכל מקום שהם",
    { x: 10, y: 26, width: 80, height: 46 },
    { fontSize: 5.4, align: "center", color: "#ffffff", background: "rgba(15,23,42,0.95)", borderRadius: 16, borderColor: "#38bdf8", borderWidth: 2.5, lineHeight: 1.6 }, 6),

  // ── ציון מקור ───────────────────────────────────────────────────────────
  P("source_popup", "פופ-אפ מקור עליון", "source", "מתוך שיעור בישיבת הקדיש והחסד",
    { x: 6, y: 8, width: 52, height: 9 }, { fontSize: 3.6, align: "right", background: "rgba(0,0,0,0.65)", borderRadius: 8 }, 4),
  P("source_bottom", "ציון מקור למטה", "source", "גמרא, מסכת ראש השנה, דף כ\"ג ע\"א",
    { x: 6, y: 86, width: 52, height: 8 }, { fontSize: 3.4, align: "right", background: "rgba(0,0,0,0.55)", borderRadius: 6 }, 4),
  P("source_boxed", "מקור במסגרת מעוצבת", "source", "רמב\"ם, הלכות תשובה, פרק ג׳",
    { x: 8, y: 10, width: 48, height: 10 }, { fontSize: 3.6, align: "right", color: "#f8fafc", background: "rgba(15,23,42,0.85)", borderRadius: 8, borderColor: "#94a3b8", borderWidth: 1 }, 4),
  P("source_torah_verse", "פסוק מקראי עם מקור", "source", "״וְאָהַבְתָּ לְרֵעֲךָ כָּמוֹךָ״ (ויקרא י\"ט, י\"ח)",
    { x: 8, y: 12, width: 84, height: 10 }, { fontSize: 4.2, align: "center", color: "#fef3c7", background: "rgba(0,0,0,0.7)", borderRadius: 8 }, 5),
  P("source_mishna_tag", "ציון משנה / הלכה", "source", "שולחן ערוך, אורח חיים, סימן א׳",
    { x: 6, y: 85, width: 48, height: 8 }, { fontSize: 3.4, align: "right", color: "#e2e8f0", background: "rgba(15,23,42,0.8)", borderRadius: 6 }, 4),

  // ── ציטוטים ומשפטי מפתח ──────────────────────────────────────────────────
  P("quote_center", "ציטוט מרכזי מודגש", "quote", "״קשה סילוקו של אדם כשר\nכשריפת בית אלהינו״",
    { x: 12, y: 32, width: 76, height: 36 }, { fontSize: 6.5, align: "center", background: "rgba(0,0,0,0.6)", borderRadius: 14, lineHeight: 1.55 }, 5),
  P("quote_side", "ציטוט בצד המסך", "quote", "״אפשר עוד לשחזר,\nאפשר להציל״",
    { x: 52, y: 30, width: 42, height: 30 }, { fontSize: 5, align: "right", background: "rgba(0,0,0,0.65)", borderRadius: 12, lineHeight: 1.5 }, 5),
  P("quote_serif_elegant", "ציטוט סריף אלגנטי", "quote", "״האדם נברא יחידי, ללמדך שכל המקיים נפש אחת מעלים עליו כאילו קיים עולם מלא״",
    { x: 10, y: 30, width: 80, height: 38 }, { fontSize: 5.2, align: "center", color: "#fef3c7", background: "rgba(15,15,25,0.85)", borderRadius: 12, borderColor: "#fde68a", borderWidth: 1.5, lineHeight: 1.6 }, 6),
  P("quote_modern_card", "כרטיס תובנה מודרני", "quote", "״ההבדל בין הצלחה לכישלון הוא ההתמדה בעשייה יומיומית״",
    { x: 14, y: 32, width: 72, height: 34 }, { fontSize: 5.4, align: "center", color: "#ffffff", background: "rgba(30,41,59,0.92)", borderRadius: 16, borderColor: "#818cf8", borderWidth: 2, lineHeight: 1.5 }, 5),
  P("quote_box_gold", "ציטוט במסגרת זהב", "quote", "״איזהו עשיר? השמח בחלקו״",
    { x: 12, y: 34, width: 76, height: 28 }, { fontSize: 6.2, align: "center", color: "#fef08a", background: "rgba(20,20,30,0.9)", borderRadius: 14, borderColor: "#eab308", borderWidth: 2 }, 5),
  P("quote_dark_pill", "כרטיס מסר קצר", "quote", "מעט מן האור דוחה הרבה מן החושך",
    { x: 10, y: 38, width: 80, height: 20 }, { fontSize: 5.4, align: "center", color: "#ffffff", background: "rgba(0,0,0,0.85)", borderRadius: 24 }, 5),

  // ── קריאה לפעולה (CTA) ──────────────────────────────────────────────────
  P("cta_full", "מסך קריאה לפעולה מלא", "cta",
    "רוצים להקדיש שיעור לעילוי נשמת יקירכם?\nצרו קשר עכשיו בטלפון",
    { x: 8, y: 26, width: 84, height: 48 },
    { fontSize: 6.5, align: "center", background: "rgba(0,0,0,0.82)", borderRadius: 18, lineHeight: 1.6 }, 6, { in: 0.5, out: 0.5 }),
  P("cta_bar", "פס הנעה לפעולה", "cta", "להקדשת שיעור הבא — התקשרו עכשיו",
    { x: 8, y: 80, width: 84, height: 11 }, { fontSize: 4.6, align: "center", background: "rgba(180,83,9,0.92)", borderRadius: 10 }, 5),
  P("cta_phone", "כרטיס טלפון ישיר", "cta", "לפרטים והקדשות:\n03-0000000",
    { x: 20, y: 62, width: 60, height: 26 }, { fontSize: 5.5, align: "center", background: "rgba(0,0,0,0.78)", borderRadius: 14, lineHeight: 1.5 }, 6),
  P("cta_subscribe_button", "כפתור הירשמו לערוץ", "cta", "הרשמו כמנויים והפעילו את הפעמון 🔔",
    { x: 18, y: 78, width: 64, height: 12 }, { fontSize: 4.4, align: "center", color: "#ffffff", background: "rgba(220,38,38,0.94)", borderRadius: 24 }, 5),
  P("cta_website_pill", "קישור לאתר", "cta", "לצפייה בשיעור המלא: www.example.com",
    { x: 15, y: 82, width: 70, height: 10 }, { fontSize: 3.8, align: "center", color: "#0284c7", background: "rgba(255,255,255,0.95)", borderRadius: 20 }, 5),
  P("cta_whatsapp_group", "הצטרפות לקבוצת ווטסאפ", "cta", "להצטרפות לקבוצת העדכונים השקטה — קישור בתיאור",
    { x: 8, y: 80, width: 84, height: 10 }, { fontSize: 3.8, align: "center", color: "#22c55e", background: "rgba(15,23,42,0.95)", borderRadius: 12, borderColor: "#22c55e", borderWidth: 1.5 }, 5),
  P("cta_download_app", "הורדת האפליקציה", "cta", "הורידו את האפליקציה בחינם בחנויות",
    { x: 14, y: 78, width: 72, height: 11 }, { fontSize: 4.2, align: "center", color: "#ffffff", background: "rgba(37,99,235,0.92)", borderRadius: 12 }, 5),

  // ── פרקים ומבנה ─────────────────────────────────────────────────────────
  P("chapter_pill", "תגית פרק", "chapter", "חלק ב׳ · עקרונות המעשה",
    { x: 6, y: 8, width: 36, height: 8 }, { fontSize: 3.6, align: "center", color: "#ffffff", background: "rgba(59,130,246,0.9)", borderRadius: 16 }, 4),
  P("chapter_badge", "באנר נושא ראשי", "chapter", "נושא 3: סיכום שיטות הראשונים",
    { x: 8, y: 12, width: 84, height: 11 }, { fontSize: 4.5, align: "right", background: "rgba(15,23,42,0.85)", borderRadius: 8, borderColor: "#3b82f6", borderWidth: 2 }, 4),
  P("chapter_summary_card", "כרטיס סיכום נקודות", "chapter", "3 נקודות מפתח לשיעור זה:\n1. הבנת היסוד\n2. בירור ההלכה\n3. יישום מעשי",
    { x: 12, y: 25, width: 76, height: 50 }, { fontSize: 4.8, align: "right", background: "rgba(15,23,42,0.92)", borderRadius: 14, borderColor: "#10b981", borderWidth: 2, lineHeight: 1.6 }, 6),
  P("chapter_timeline_step", "שלב בתהליך", "chapter", "שלב 1 מתוך 4: הגדרת המטרה",
    { x: 6, y: 8, width: 45, height: 8 }, { fontSize: 3.5, align: "center", color: "#38bdf8", background: "rgba(0,0,0,0.75)", borderRadius: 14, borderColor: "#0284c7", borderWidth: 1 }, 4),
  P("chapter_takeaway_pill", "מסקנה מרכזית", "chapter", "מסקנה: תכנון מוקדם חוסך 80% מהטעויות",
    { x: 8, y: 12, width: 84, height: 9 }, { fontSize: 3.8, align: "right", color: "#facc15", background: "rgba(15,23,42,0.9)", borderRadius: 8 }, 4),
] as const;

export const TEXT_CATEGORIES: Array<{ id: TextCategory; labelHe: string }> = [
  { id: "title", labelHe: "כותרות ופתיחים" },
  { id: "lower", labelHe: "כתוביות תחתונות" },
  { id: "dedication", labelHe: "הקדשות וברכות" },
  { id: "source", labelHe: "ציון מקור" },
  { id: "quote", labelHe: "ציטוטים" },
  { id: "cta", labelHe: "הנעה לפעולה" },
  { id: "chapter", labelHe: "פרקים ומבנה" },
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
  return TEXT_PRESETS.filter((p) => p.id.includes(q) || p.labelHe.includes(q) || p.category.includes(q) || p.sampleHe.includes(q));
}
