// קטלוג סגנונות כתוביות מוכנים (Caption Style Presets) - 20+ סגנונות בסגנון CapCut / TikTok
//
// כל סגנון מגדיר פונט, גודל, צבע, הדגשה, רקע, צל, מסגרת ומיקום על הקנבס.

import type { CaptionBg, CaptionPosition, CaptionStyle } from "@/lib/editor/captionStyle";

export interface CaptionPreset {
  id: string;
  labelHe: string;
  category: "viral" | "classic" | "boxed" | "cinema" | "creative";
  descriptionHe: string;
  style: CaptionStyle & {
    textShadow?: string;
    borderRadius?: number;
    letterSpacing?: number;
    outlineColor?: string;
  };
}

export const CAPTION_PRESETS: readonly CaptionPreset[] = [
  // ── ויראלי ורשתות חברתיות (VIRAL / TIKTOK / SHORTS) ──────────────────────
  {
    id: "tiktok_bold_yellow",
    labelHe: "טיקטוק צהוב מודגש",
    category: "viral",
    descriptionHe: "הסגנון הוויראלי ביותר — אותיות צהובות עבות עם צל שחור עמוק",
    style: {
      fontSize: 5.4,
      color: "#facc15",
      bold: true,
      position: "bottom",
      bg: "none",
      fontFamily: "Heebo",
      textShadow: "0 3px 0 #000, 0 -3px 0 #000, 3px 0 0 #000, -3px 0 0 #000, 0 4px 10px rgba(0,0,0,0.9)",
    },
  },
  {
    id: "reels_punch_white",
    labelHe: "רילס פאנץ' לבן",
    category: "viral",
    descriptionHe: "לבן בוהק עם מסגרת שחורה חזקה להבלטה מושלמת",
    style: {
      fontSize: 5.2,
      color: "#ffffff",
      bold: true,
      position: "center",
      bg: "none",
      fontFamily: "Rubik",
      textShadow: "0 3px 0 #000, 0 -3px 0 #000, 3px 0 0 #000, -3px 0 0 #000, 0 3px 8px rgba(0,0,0,0.85)",
    },
  },
  {
    id: "karaoke_glow_green",
    labelHe: "קריוקי ירוק זוהר",
    category: "viral",
    descriptionHe: "ירוק ניאון מודרני המושך תשומת לב מיידית",
    style: {
      fontSize: 5.0,
      color: "#4ade80",
      bold: true,
      position: "bottom",
      bg: "none",
      fontFamily: "Heebo",
      textShadow: "0 0 12px rgba(74,222,128,0.7), 0 2px 4px #000",
    },
  },
  {
    id: "neon_cyan_pulse",
    labelHe: "ניאון ציאן",
    category: "viral",
    descriptionHe: "ציאן זוהר עם הילת אור כחלחלה",
    style: {
      fontSize: 4.8,
      color: "#38bdf8",
      bold: true,
      position: "bottom",
      bg: "none",
      fontFamily: "Assistant",
      textShadow: "0 0 14px rgba(56,189,248,0.8), 0 2px 4px #000",
    },
  },
  {
    id: "hot_pink_reels",
    labelHe: "ורוד עז (Hot Pink)",
    category: "viral",
    descriptionHe: "ורוד מודרני מודגש לסרטוני לייפסטייל וקריאייטיב",
    style: {
      fontSize: 5.0,
      color: "#f472b6",
      bold: true,
      position: "bottom",
      bg: "none",
      fontFamily: "Rubik",
      textShadow: "0 3px 0 #000, 0 2px 8px rgba(0,0,0,0.8)",
    },
  },

  // ── קופסאות ותוויות (BOXED / PILL) ──────────────────────────────────────
  {
    id: "minimal_dark_pill",
    labelHe: "תווית שחורה עגולה",
    category: "boxed",
    descriptionHe: "רקע מעוגל שחור חצי-שקוף המבטיח קריאות בכל רקע",
    style: {
      fontSize: 4.4,
      color: "#ffffff",
      bold: true,
      position: "bottom",
      bg: "box",
      fontFamily: "Assistant",
      borderRadius: 16,
    },
  },
  {
    id: "clean_soft_blur",
    labelHe: "רקע רך עדין",
    category: "boxed",
    descriptionHe: "ריכוך עדין של הרקע מאחורי הכתוביות",
    style: {
      fontSize: 4.5,
      color: "#ffffff",
      bold: true,
      position: "bottom",
      bg: "soft",
      fontFamily: "Heebo",
    },
  },
  {
    id: "solid_white_box",
    labelHe: "קופסה לבנה (טקסט שחור)",
    category: "boxed",
    descriptionHe: "ניגוד הפוך — רקע לבן בוהק עם טקסט שחור חד",
    style: {
      fontSize: 4.4,
      color: "#0f172a",
      bold: true,
      position: "bottom",
      bg: "box",
      fontFamily: "Rubik",
      borderRadius: 8,
    },
  },
  {
    id: "yellow_box_black_text",
    labelHe: "קופסה צהובה מודגשת",
    category: "boxed",
    descriptionHe: "רקע צהוב אזהרה בולט עם טקסט שחור כבד",
    style: {
      fontSize: 4.6,
      color: "#000000",
      bold: true,
      position: "bottom",
      bg: "box",
      fontFamily: "Heebo",
      borderRadius: 6,
    },
  },
  {
    id: "red_alert_box",
    labelHe: "מבזק אדום",
    category: "boxed",
    descriptionHe: "רקע אדום חזק לכותרות חדשות ומבזקים",
    style: {
      fontSize: 4.5,
      color: "#ffffff",
      bold: true,
      position: "bottom",
      bg: "box",
      fontFamily: "Heebo",
      borderRadius: 4,
    },
  },

  // ── קולנוע ושידור (CINEMA / TV) ─────────────────────────────────────────
  {
    id: "cinema_sub_classic",
    labelHe: "כתוביות קולנוע צהובות",
    category: "cinema",
    descriptionHe: "סגנון קולנועי מסורתי בגוון צהוב-זהב עדין",
    style: {
      fontSize: 4.2,
      color: "#fef08a",
      bold: false,
      position: "bottom",
      bg: "none",
      fontFamily: "Heebo",
      textShadow: "0 2px 4px #000, 0 0 6px rgba(0,0,0,0.9)",
    },
  },
  {
    id: "netflix_clean_sans",
    labelHe: "נטפליקס סאנס",
    category: "cinema",
    descriptionHe: "טקסט לבן נקי וקריא במיוחד עם צל עמוק",
    style: {
      fontSize: 4.2,
      color: "#ffffff",
      bold: false,
      position: "bottom",
      bg: "none",
      fontFamily: "Assistant",
      textShadow: "0 2px 4px rgba(0,0,0,0.95), 0 0 10px #000",
    },
  },
  {
    id: "documentary_serif",
    labelHe: "דוקומנטרי סריף",
    category: "cinema",
    descriptionHe: "גופן סריף יוקרתי (Frank Ruhl) לשיעורים וסרטי תעודה",
    style: {
      fontSize: 4.5,
      color: "#fef3c7",
      bold: true,
      position: "bottom",
      bg: "none",
      fontFamily: "Frank Ruhl Libre",
      textShadow: "0 2px 4px #000",
    },
  },

  // ── קלאסי ועברית (CLASSIC) ──────────────────────────────────────────────
  {
    id: "hebrew_clean_default",
    labelHe: "עברית נקייה (ברירת מחדל)",
    category: "classic",
    descriptionHe: "גופן Heebo מאוזן עם ריכוך רקע עדין",
    style: {
      fontSize: 4.5,
      color: "#ffffff",
      bold: true,
      position: "bottom",
      bg: "soft",
      fontFamily: "Heebo",
    },
  },
  {
    id: "hebrew_torah_classic",
    labelHe: "שיעור תורה מסורתי",
    category: "classic",
    descriptionHe: "גופן David Libre מכובד עם מסגרת שחורה רכה",
    style: {
      fontSize: 4.6,
      color: "#ffffff",
      bold: true,
      position: "bottom",
      bg: "soft",
      fontFamily: "David Libre",
    },
  },
  {
    id: "large_accessibility",
    labelHe: "נגישות מוגדלת",
    category: "classic",
    descriptionHe: "גופן גדול ומודגש במיוחד עם רקע כהה מלא",
    style: {
      fontSize: 6.5,
      color: "#ffffff",
      bold: true,
      position: "bottom",
      bg: "box",
      fontFamily: "Heebo",
    },
  },

  // ── יצירתי ואומנותי (CREATIVE) ──────────────────────────────────────────
  {
    id: "comic_boom",
    labelHe: "קומיקס בום",
    category: "creative",
    descriptionHe: "גופן מעוגל ועבה (Varela Round) בסגנון קומיקס",
    style: {
      fontSize: 5.5,
      color: "#fef08a",
      bold: true,
      position: "center",
      bg: "none",
      fontFamily: "Varela Round",
      textShadow: "0 4px 0 #000, 0 -3px 0 #000, 4px 0 0 #000, -3px 0 0 #000",
    },
  },
  {
    id: "vintage_sepia_cap",
    labelHe: "וינטג' ספיה",
    category: "creative",
    descriptionHe: "גוון קרם נוסטלגי עם צל חום עדין",
    style: {
      fontSize: 4.4,
      color: "#fef3c7",
      bold: true,
      position: "bottom",
      bg: "soft",
      fontFamily: "Bellefair",
    },
  },
  {
    id: "top_hook_yellow",
    labelHe: "הוק עליון צהוב",
    category: "creative",
    descriptionHe: "כתוביות המוצגות בחלק העליון של הפריים לתפיסת תשומת לב",
    style: {
      fontSize: 5.2,
      color: "#facc15",
      bold: true,
      position: "top",
      bg: "none",
      fontFamily: "Rubik",
      textShadow: "0 3px 0 #000, 0 3px 8px rgba(0,0,0,0.9)",
    },
  },
  {
    id: "tiktok_gold_border",
    labelHe: "טיקטוק זהב ממוסגר",
    category: "viral",
    descriptionHe: "צהוב זוהר עם מסגרת שחורה חדה",
    style: {
      fontSize: 5.4,
      color: "#fde047",
      bold: true,
      position: "center",
      bg: "none",
      fontFamily: "Rubik",
      textShadow: "0 3px 0 #000, 3px 0 0 #000, -3px 0 0 #000, 0 -3px 0 #000",
    },
  },
  {
    id: "minimal_pill_accent",
    labelHe: "קפסולה שחורה עם דגש כחול",
    category: "boxed",
    descriptionHe: "קפסולה שחורה עם גופן כחול בהיר",
    style: {
      fontSize: 4.5,
      color: "#38bdf8",
      bold: true,
      position: "bottom",
      bg: "box",
      fontFamily: "Assistant",
      borderRadius: 14,
    },
  },
  {
    id: "cinema_sub_white_classic",
    labelHe: "קולנועי לבן נקי",
    category: "cinema",
    descriptionHe: "כתוביות סרטים לבנות מסורתיות עם צל עמוק",
    style: {
      fontSize: 4.6,
      color: "#ffffff",
      bold: true,
      position: "bottom",
      bg: "none",
      fontFamily: "Heebo",
      textShadow: "0 2px 5px #000",
    },
  },
  {
    id: "karantina_punch",
    labelHe: "קרנטינה פאנץ'",
    category: "creative",
    descriptionHe: "גופן צר וגבוה עם נוכחות חזקה",
    style: {
      fontSize: 6.0,
      color: "#facc15",
      bold: true,
      position: "center",
      bg: "none",
      fontFamily: "Karantina",
      textShadow: "0 4px 0 #000",
    },
  },
] as const;

export const CAPTION_PRESET_CATEGORIES: Array<{ id: CaptionPreset["category"]; labelHe: string }> = [
  { id: "viral", labelHe: "ויראלי ורשתות" },
  { id: "boxed", labelHe: "קופסאות ותוויות" },
  { id: "cinema", labelHe: "קולנוע וטלוויזיה" },
  { id: "classic", labelHe: "קלאסי ועברית" },
  { id: "creative", labelHe: "יצירתי ואומנותי" },
];

export function captionPresetById(id: string | null | undefined): CaptionPreset | undefined {
  const key = String(id || "").trim().toLowerCase();
  if (!key) return undefined;
  return CAPTION_PRESETS.find((p) => p.id === key) || CAPTION_PRESETS.find((p) => p.labelHe === id);
}

export function searchCaptionPresets(query: string): CaptionPreset[] {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [...CAPTION_PRESETS];
  return CAPTION_PRESETS.filter((p) =>
    p.id.includes(q) || p.labelHe.includes(q) || p.category.includes(q) || p.descriptionHe.includes(q),
  );
}
