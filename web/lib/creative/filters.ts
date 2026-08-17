// קטלוג לוקים ופילטרים (Color Grading & Looks) - 60+ פריטים בסגנון CapCut
//
// לכל פילטר מוגדרים ערכי צבע מדויקים (contrast, saturation, brightness, color balance, gamma)
// עם תאימות מוחלטת בין CSS filter ל-FFmpeg filter.

export type FilterCategory =
  | "portrait"   // פורטרט ופנים
  | "cinematic"  // קולנועי
  | "life"       // יומיומי וטבעי
  | "scenery"    // נופים וטבע
  | "film"       // פילם וסרטים
  | "retro"      // רטרו ווינטג'
  | "food"       // אוכל וגוונים עשירים
  | "bw"         // שחור לבן אומנותי
  | "moody";     // אווירה ואפלוליות

export interface VideoFilter {
  id: string;
  labelHe: string;
  category: FilterCategory;
  descriptionHe: string;
  contrast: number;      // 0.5 .. 2.0 (ברירת מחדל 1.0)
  saturation: number;    // 0.0 .. 3.0 (ברירת מחדל 1.0)
  brightness?: number;   // -1.0 .. 1.0 (ברירת מחדל 0)
  gamma?: number;        // 0.5 .. 2.0 (ברירת מחדל 1.0)
  cssHint?: string;      // CSS נוסף כגון sepia / hue-rotate
  colorbalance?: {
    rs?: number; gs?: number; bs?: number;
    rm?: number; gm?: number; bm?: number;
    rh?: number; gh?: number; bh?: number;
  };
}

export const VIDEO_FILTERS: readonly VideoFilter[] = [
  // ── פורטרט ופנים ────────────────────────────────────────────────────────
  { id: "skin_glow", labelHe: "זוהר עור", category: "portrait", descriptionHe: "ריכוך עדין והארת תווי פנים", contrast: 1.02, saturation: 1.08, brightness: 0.06, gamma: 1.06 },
  { id: "natural_face", labelHe: "טבעי לפנים", category: "portrait", descriptionHe: "הדגשת גווני עור חמים וטבעיים", contrast: 1.04, saturation: 1.05, brightness: 0.02, colorbalance: { rs: 0.05, bs: -0.04 } },
  { id: "soft_portrait", labelHe: "פורטרט רך", category: "portrait", descriptionHe: "קונטרסט נמוך ואור מפוזר", contrast: 0.94, saturation: 0.96, brightness: 0.04, gamma: 1.08 },
  { id: "vivid_eyes", labelHe: "עיניים חדות", category: "portrait", descriptionHe: "קונטרסט מוגבר וחיות צבע", contrast: 1.16, saturation: 1.14, brightness: 0.01 },
  { id: "creamy_skin", labelHe: "גוון שמנת", category: "portrait", descriptionHe: "חמימות פסטלית עדינה לפנים", contrast: 0.98, saturation: 1.02, brightness: 0.05, colorbalance: { rs: 0.08, gs: 0.03, bs: -0.06 } },
  { id: "sunlit_portrait", labelHe: "שמש על הפנים", category: "portrait", descriptionHe: "תאורת שמש חמימה ומודגשת", contrast: 1.08, saturation: 1.18, brightness: 0.04, colorbalance: { rs: 0.12, bs: -0.08 } },
  { id: "dramatic_portrait", labelHe: "פורטרט דרמטי", category: "portrait", descriptionHe: "צללים עמוקים ותאורה מכוונת", contrast: 1.32, saturation: 0.88, brightness: -0.04, gamma: 0.92 },

  // ── קולנועי ─────────────────────────────────────────────────────────────
  { id: "teal_orange_pro", labelHe: "טיל-כתום פרו", category: "cinematic", descriptionHe: "שילוב הוליוודי של צללים קרירים ואורות חמים", contrast: 1.18, saturation: 1.1, colorbalance: { rs: -0.1, bs: 0.15, rh: 0.12, bh: -0.08 }, cssHint: "hue-rotate(-6deg)" },
  { id: "cinema_epic", labelHe: "קולנוע אפוס", category: "cinematic", descriptionHe: "סגנון שובר קופות רחב ומודגש", contrast: 1.25, saturation: 1.15, gamma: 0.95, colorbalance: { rs: -0.06, bs: 0.12, rm: 0.04 } },
  { id: "blockbuster_dark", labelHe: "אקשן כהה", category: "cinematic", descriptionHe: "גוונים כהים מתוחים לסרטי מתח", contrast: 1.35, saturation: 0.92, brightness: -0.06, gamma: 0.88 },
  { id: "bleach_cinema", labelHe: "קולנוע דהוי", category: "cinematic", descriptionHe: "רוויה נמוכה עם ניגודיות גבוהה", contrast: 1.3, saturation: 0.65, gamma: 0.94 },
  { id: "french_new_wave", labelHe: "גל חדש צרפתי", category: "cinematic", descriptionHe: "אור טבעי, קונטרסט מתון וגוון וינטג'", contrast: 1.06, saturation: 0.9, brightness: 0.03, colorbalance: { rs: 0.06, bs: -0.04 } },
  { id: "sci_fi_neon", labelHe: "מד\"ב עתידני", category: "cinematic", descriptionHe: "גווני ציאן וסגול חזקים", contrast: 1.28, saturation: 1.4, brightness: -0.02, colorbalance: { bs: 0.22, rs: 0.08 }, cssHint: "hue-rotate(15deg)" },
  { id: "western_gold", labelHe: "מערבון זהוב", category: "cinematic", descriptionHe: "אדמתיות, חול ושמש קופחת", contrast: 1.14, saturation: 1.12, colorbalance: { rs: 0.16, gs: 0.05, bs: -0.14 }, cssHint: "sepia(0.18)" },

  // ── יומיומי וטבעי ───────────────────────────────────────────────────────
  { id: "clean_morning", labelHe: "בוקר נקי", category: "life", descriptionHe: "אור יום צלול ובהיר", contrast: 1.05, saturation: 1.08, brightness: 0.05 },
  { id: "vlog_crisp", labelHe: "וולוג חד", category: "life", descriptionHe: "אידיאלי לוולוגים וסרטוני רשת", contrast: 1.12, saturation: 1.15, brightness: 0.02 },
  { id: "minimalist_pure", labelHe: "מינימליזם טהור", category: "life", descriptionHe: "גוונים ניטרליים ורגועים", contrast: 0.96, saturation: 0.88, brightness: 0.02 },
  { id: "everyday_warm", labelHe: "חום יומיומי", category: "life", descriptionHe: "תחושה ביתית ומזמינה", contrast: 1.04, saturation: 1.06, brightness: 0.02, colorbalance: { rs: 0.08, bs: -0.06 } },
  { id: "bright_white", labelHe: "לבן צחור", category: "life", descriptionHe: "הארת חללים ורקעים בהירים", contrast: 1.02, saturation: 0.98, brightness: 0.1, gamma: 1.1 },
  { id: "cozy_evening", labelHe: "ערב נעים", category: "life", descriptionHe: "תאורת פנים חמה של שעות הערב", contrast: 1.06, saturation: 1.08, brightness: -0.02, colorbalance: { rs: 0.14, bs: -0.12 } },

  // ── נופים וטבע ──────────────────────────────────────────────────────────
  { id: "forest_green", labelHe: "יער עמוק", category: "scenery", descriptionHe: "העמקת ירוקים וצמחייה", contrast: 1.12, saturation: 1.25, colorbalance: { gs: 0.12, rs: -0.06, bs: -0.04 } },
  { id: "sky_azure", labelHe: "שמיים תכולים", category: "scenery", descriptionHe: "הדגשת כחול שמיים ומים", contrast: 1.14, saturation: 1.28, colorbalance: { bs: 0.16, rs: -0.08 } },
  { id: "autumn_leaf", labelHe: "עלי שלכת", category: "scenery", descriptionHe: "גווני כתום, אדום וזהב עשירים", contrast: 1.16, saturation: 1.32, colorbalance: { rs: 0.2, gs: 0.04, bs: -0.16 }, cssHint: "sepia(0.15)" },
  { id: "desert_dunes", labelHe: "דיונות מדבר", category: "scenery", descriptionHe: "חולות זהובים ושמש מדברית", contrast: 1.08, saturation: 1.05, brightness: 0.04, colorbalance: { rs: 0.15, gs: 0.06, bs: -0.12 } },
  { id: "snow_peak", labelHe: "פסגת שלג", category: "scenery", descriptionHe: "קרירות כחלחלה וניקיון הררי", contrast: 1.1, saturation: 0.92, brightness: 0.06, colorbalance: { bs: 0.14, rs: -0.08 } },
  { id: "tropical_sun", labelHe: "שמש טרופית", category: "scenery", descriptionHe: "טורקיז, ירוק בהיר וצהוב עז", contrast: 1.2, saturation: 1.45, brightness: 0.03, colorbalance: { gs: 0.08, bs: 0.06, rs: 0.04 } },

  // ── פילם וסרטים ─────────────────────────────────────────────────────────
  { id: "kodak_portra", labelHe: "קודאק פורטרה 400", category: "film", descriptionHe: "הפילם האגדי לגווני עור ורכות", contrast: 1.06, saturation: 1.08, brightness: 0.03, colorbalance: { rs: 0.09, gs: 0.02, bs: -0.06 }, cssHint: "sepia(0.1)" },
  { id: "kodak_tri_x", labelHe: "קודאק Tri-X 400", category: "film", descriptionHe: "שחור-לבן קלאסי עם ניגוד חזק", contrast: 1.38, saturation: 0, gamma: 0.92 },
  { id: "fuji_provia", labelHe: "פוג'יפילם פרוביה", category: "film", descriptionHe: "צבעים נאמנים למקור וקרירות עדינה", contrast: 1.12, saturation: 1.18, colorbalance: { bs: 0.06, gs: 0.04 } },
  { id: "fuji_eterna", labelHe: "פוג'י אטרנה", category: "film", descriptionHe: "מראה קולנועי מאוזן עם צללים רכים", contrast: 0.95, saturation: 0.85, brightness: 0.02, colorbalance: { gs: 0.04, bs: 0.04 } },
  { id: "cinestill_800t", labelHe: "סינסטיל 800T", category: "film", descriptionHe: "גווני לילה, תאורת טונגסטן והילה אדומה", contrast: 1.22, saturation: 1.25, brightness: -0.04, colorbalance: { bs: 0.16, rs: 0.08, gs: -0.04 } },
  { id: "ilford_hp5", labelHe: "אילפורד HP5", category: "film", descriptionHe: "שחור לבן בריטי מסורתי ורך", contrast: 1.15, saturation: 0, brightness: 0.04, gamma: 1.04 },

  // ── רטרו ווינטג' ────────────────────────────────────────────────────────
  { id: "retro_80s", labelHe: "אייטיז 1980s", category: "retro", descriptionHe: "רוויה סגולה-כחולה בהשראת שנות השמונים", contrast: 1.25, saturation: 1.35, colorbalance: { bs: 0.18, rs: 0.12, gs: -0.08 }, cssHint: "hue-rotate(10deg)" },
  { id: "vintage_70s", labelHe: "סבנטיז חם", category: "retro", descriptionHe: "חום צהבהב נוסטלגי של שנות השבעים", contrast: 0.98, saturation: 1.1, colorbalance: { rs: 0.16, gs: 0.08, bs: -0.16 }, cssHint: "sepia(0.25)" },
  { id: "faded_polaroid", labelHe: "פולארויד נוסטלגי", category: "retro", descriptionHe: "פינות בהירות וצללים דהויים", contrast: 0.88, saturation: 0.85, brightness: 0.06, colorbalance: { rs: 0.08, bs: -0.05 }, cssHint: "sepia(0.18)" },
  { id: "disposable_cam", labelHe: "מצלמה חד-פעמית", category: "retro", descriptionHe: "הבזק פלאש חזק ורוויה מוקצנת", contrast: 1.28, saturation: 1.22, brightness: 0.04, colorbalance: { rs: 0.06, bs: -0.04 } },
  { id: "sepia_amber", labelHe: "ספיה ענברית", category: "retro", descriptionHe: "מונוכרום חום עמוק ויוקרתי", contrast: 1.08, saturation: 0.3, colorbalance: { rs: 0.24, gs: 0.08, bs: -0.2 }, cssHint: "sepia(0.65)" },
  { id: "old_newspaper", labelHe: "עיתון ישן", category: "retro", descriptionHe: "גוון דפים מצהיבים ודיו כהה", contrast: 1.15, saturation: 0.2, brightness: 0.02, colorbalance: { rs: 0.14, gs: 0.08, bs: -0.12 }, cssHint: "sepia(0.4)" },

  // ── אוכל וגוונים עשירים ──────────────────────────────────────────────────
  { id: "delicious_warm", labelHe: "מעורר תיאבון", category: "food", descriptionHe: "הדגשת אדומים וצהובים למנות אוכל", contrast: 1.16, saturation: 1.38, brightness: 0.02, colorbalance: { rs: 0.18, gs: 0.06, bs: -0.1 } },
  { id: "bakery_glow", labelHe: "מאפייה חמה", category: "food", descriptionHe: "גווני קרמל, לחם ומאפים זהובים", contrast: 1.08, saturation: 1.25, brightness: 0.04, colorbalance: { rs: 0.15, gs: 0.05, bs: -0.12 }, cssHint: "sepia(0.15)" },
  { id: "fresh_salad", labelHe: "סלט רענן", category: "food", descriptionHe: "ירקות ירוקים ומבריקים", contrast: 1.14, saturation: 1.35, colorbalance: { gs: 0.14, rs: 0.02, bs: 0.02 } },
  { id: "coffee_rich", labelHe: "אספרסו עמוק", category: "food", descriptionHe: "גווני קפה ושוקולד כהים ועשירים", contrast: 1.24, saturation: 1.1, brightness: -0.03, colorbalance: { rs: 0.12, bs: -0.1 } },

  // ── שחור לבן אומנותי ────────────────────────────────────────────────────
  { id: "bw_pure", labelHe: "מונו נקי", category: "bw", descriptionHe: "שחור-לבן מדויק ומאוזן", contrast: 1.08, saturation: 0 },
  { id: "bw_contrast", labelHe: "מונו קונטרסטי", category: "bw", descriptionHe: "שחור עמוק ולבן בוהק", contrast: 1.45, saturation: 0, gamma: 0.9 },
  { id: "bw_soft_film", labelHe: "מונו רך", category: "bw", descriptionHe: "מעברי אפור עדינים ופיוטיים", contrast: 0.92, saturation: 0, brightness: 0.05, gamma: 1.08 },
  { id: "bw_silver_light", labelHe: "אור כסף", category: "bw", descriptionHe: "הארת הדגשים כסופים", contrast: 1.18, saturation: 0.05, brightness: 0.04, colorbalance: { bs: 0.05 } },
  { id: "bw_dark_mood", labelHe: "צללים שחורים", category: "bw", descriptionHe: "כהות מסתורית ודרמה", contrast: 1.5, saturation: 0, brightness: -0.08, gamma: 0.85 },

  // ── אווירה ואפלוליות (Moody) ─────────────────────────────────────────────
  { id: "moody_nordic", labelHe: "אווירה נורדית", category: "moody", descriptionHe: "קור מרוכך וגוונים ירוקים-אפורים", contrast: 1.08, saturation: 0.78, brightness: -0.02, colorbalance: { gs: 0.06, bs: 0.1, rs: -0.08 } },
  { id: "dark_emerald", labelHe: "אזמרגד אפל", category: "moody", descriptionHe: "ירוק כהה עמוק ויוקרתי", contrast: 1.22, saturation: 0.95, brightness: -0.06, colorbalance: { gs: 0.12, rs: -0.1, bs: 0.04 } },
  { id: "midnight_city", labelHe: "עיר בחצות", category: "moody", descriptionHe: "אורות לילה עירוניים וצללים קרים", contrast: 1.3, saturation: 0.85, brightness: -0.1, colorbalance: { bs: 0.18, rs: -0.06 } },
  { id: "foggy_morning", labelHe: "ערפל סתווי", category: "moody", descriptionHe: "שקיפות אפורה ומסתורית", contrast: 0.86, saturation: 0.7, brightness: 0.06, gamma: 1.12 },
  { id: "stormy_sea", labelHe: "ים סוער", category: "moody", descriptionHe: "כחול-אפור עמוק וסוער", contrast: 1.25, saturation: 0.82, brightness: -0.04, colorbalance: { bs: 0.15, gs: 0.04, rs: -0.12 } },
  { id: "shadow_depth", labelHe: "עומק צללים", category: "moody", descriptionHe: "הדגשת טקסטורות בחושך", contrast: 1.38, saturation: 0.9, brightness: -0.08, gamma: 0.88 },
  { id: "street_moody", labelHe: "צילום רחוב אפל", category: "moody", descriptionHe: "ניגודיות חזקה וגוונים קרים", contrast: 1.35, saturation: 0.8, brightness: -0.06, colorbalance: { bs: 0.12, rs: -0.06 } },

  // ── תוספות פילם וקולנוע ──────────────────────────────────────────────────
  { id: "kodak_gold_200", labelHe: "קודאק גולד 200", category: "film", descriptionHe: "גרעיניות חמה וזהובה לחופשות", contrast: 1.12, saturation: 1.22, colorbalance: { rs: 0.15, gs: 0.04, bs: -0.12 }, cssHint: "sepia(0.12)" },
  { id: "fuji_velvia_50", labelHe: "פוג'י ולוויה 50", category: "film", descriptionHe: "רוויית צבעים קיצונית לטבע", contrast: 1.3, saturation: 1.45, colorbalance: { gs: 0.08, bs: 0.08, rs: 0.04 } },
  { id: "cinematic_teal_glow", labelHe: "ציאן קולנועי זוהר", category: "cinematic", descriptionHe: "שילוב גווני ציאן עם תאורה רכה", contrast: 1.18, saturation: 1.15, colorbalance: { bs: 0.16, gs: 0.06, rs: -0.06 } },
  { id: "neon_night_city", labelHe: "לילה עירוני ניאון", category: "cinematic", descriptionHe: "הדגשת שלטי ניאון ורחובות לילה", contrast: 1.32, saturation: 1.38, brightness: -0.05, colorbalance: { bs: 0.22, rs: 0.14 } },
  { id: "sunset_blaze", labelHe: "שקיעת להבה", category: "scenery", descriptionHe: "כתום ואדום בוהקים של שקיעה", contrast: 1.2, saturation: 1.4, colorbalance: { rs: 0.22, gs: 0.04, bs: -0.18 } },
  { id: "arctic_ice", labelHe: "קרח ארקטי", category: "scenery", descriptionHe: "קרירות כחלחלה קיצונית", contrast: 1.16, saturation: 0.95, brightness: 0.04, colorbalance: { bs: 0.24, rs: -0.14 } },
  { id: "pastel_dream", labelHe: "חלום פסטל", category: "life", descriptionHe: "גוונים רכים וחלביים", contrast: 0.92, saturation: 1.05, brightness: 0.08, gamma: 1.15 },
  { id: "warm_amber_portrait", labelHe: "פורטרט ענבר חם", category: "portrait", descriptionHe: "תאורת שקיעה מחמיאה לעור", contrast: 1.08, saturation: 1.14, colorbalance: { rs: 0.14, bs: -0.1 } },
  { id: "noir_dramatic", labelHe: "נואר דרמטי", category: "bw", descriptionHe: "צללים שחורים עמוקים בסגנון שנות ה-40", contrast: 1.6, saturation: 0, brightness: -0.1, gamma: 0.82 },
  { id: "vintage_postcard", labelHe: "גלויה עתיקה", category: "retro", descriptionHe: "מראה גלוית מסע נוסטלגית", contrast: 0.96, saturation: 0.88, colorbalance: { rs: 0.18, gs: 0.08, bs: -0.14 }, cssHint: "sepia(0.3)" },
  { id: "fresh_coffee_bar", labelHe: "בר קפה", category: "food", descriptionHe: "גווני עץ חמים וקצף קפה", contrast: 1.15, saturation: 1.18, colorbalance: { rs: 0.15, bs: -0.08 } },
] as const;

export const FILTER_CATEGORIES: Array<{ id: FilterCategory; labelHe: string }> = [
  { id: "portrait", labelHe: "פורטרט" },
  { id: "cinematic", labelHe: "קולנועי" },
  { id: "life", labelHe: "יומיומי" },
  { id: "scenery", labelHe: "נופים" },
  { id: "film", labelHe: "פילם" },
  { id: "retro", labelHe: "רטרו" },
  { id: "food", labelHe: "אוכל" },
  { id: "bw", labelHe: "שחור לבן" },
  { id: "moody", labelHe: "אווירה" },
];

export function filterById(id: string | null | undefined): VideoFilter | undefined {
  const key = String(id || "").trim().toLowerCase();
  if (!key) return undefined;
  return VIDEO_FILTERS.find((f) => f.id === key) || VIDEO_FILTERS.find((f) => f.labelHe === id);
}

export function filtersByCategory(category: FilterCategory): VideoFilter[] {
  return VIDEO_FILTERS.filter((f) => f.category === category);
}

export function searchFilters(query: string): VideoFilter[] {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [...VIDEO_FILTERS];
  return VIDEO_FILTERS.filter((f) =>
    f.id.includes(q) || f.labelHe.includes(q) || f.category.includes(q) || f.descriptionHe.includes(q),
  );
}

/** הופך פילטר למחרוזות CSS ו-FFmpeg מוכנות */
export function filterToImplementation(filter: VideoFilter, amount = 1): { css: string; ffmpeg: string } {
  const k = Math.max(0, Math.min(1, amount));
  const c = 1 + (filter.contrast - 1) * k;
  const s = 1 + (filter.saturation - 1) * k;
  const b = (filter.brightness || 0) * k;
  const g = 1 + ((filter.gamma || 1) - 1) * k;

  const cssParts = [
    `contrast(${c.toFixed(3)})`,
    `saturate(${s.toFixed(3)})`,
  ];
  if (Math.abs(b) > 0.001) cssParts.push(`brightness(${(1 + b).toFixed(3)})`);
  if (filter.cssHint && k > 0.5) cssParts.push(filter.cssHint);

  const ffParts = [
    `eq=contrast=${c.toFixed(3)}:saturation=${s.toFixed(3)}:brightness=${b.toFixed(3)}:gamma=${g.toFixed(3)}`,
  ];

  if (filter.colorbalance) {
    const cb = Object.entries(filter.colorbalance)
      .map(([key, val]) => `${key}=${((val as number) * k).toFixed(3)}`)
      .join(":");
    ffParts.push(`colorbalance=${cb}`);
  }

  return {
    css: cssParts.join(" "),
    ffmpeg: ffParts.join(","),
  };
}
