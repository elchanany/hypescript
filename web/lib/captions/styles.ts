// סגנונות כתוביות — כולל הדגשת מילה מדוברת.
//
// אותה הרצאה ואותו טיקטוק צריכים כתוביות הפוכות. בטיקטוק המילה הנאמרת
// מודגשת בזמן אמת וזה מה שמחזיק את העין; בהרצאה זה מעייף ומיותר, ושם
// רוצים משפט שלם שנח לקרוא כמה שניות. עד כה היה סגנון אחד.
//
// כל סגנון מגדיר גם *חלוקה* (כמה מילים בפעימה) וגם *מראה* (גופן, צבע, רקע,
// הדגשה). הפרדה ביניהם הייתה מפתה אבל שגויה: הדגשת-מילה דורשת פעימות קצרות,
// ומשפט ארוך דורש קצב קריאה נמוך. הם החלטה אחת.

import type { CaptionPolicy } from "./segment";

export type CaptionStyleId = "karaoke" | "phrase" | "lecture" | "minimal" | "none";

/** איך המילה הנאמרת מודגשת בתוך הכתובית. */
export type WordHighlight =
  /** בלי הדגשה — כל הכתובית באותו מראה. */
  | "none"
  /** המילה הנאמרת מקבלת צבע הדגשה. */
  | "color"
  /** המילה הנאמרת מקבלת רקע צבעוני (סגנון טיקטוק). */
  | "pill"
  /** המילה הנאמרת גדלה מעט. */
  | "scale";

export interface CaptionLook {
  /** משפחת גופן — חייבת להיות ארוזה מקומית (OFL). */
  fontFamily: string;
  /** אחוז מהצלע הקצרה. */
  fontSize: number;
  color: string;
  bold: boolean;
  position: "top" | "center" | "bottom";
  bg: "none" | "soft" | "box";
  /** קו מתאר — קריטי לקריאוּת מעל וידאו בהיר. */
  outlineWidth: number;
  outlineColor: string;
  highlight: WordHighlight;
  highlightColor: string;
  /** אותיות רישיות/ניקוד — לא רלוונטי לעברית, נשמר לתאימות לטינית. */
  uppercase: boolean;
}

export interface CaptionStylePreset {
  id: CaptionStyleId;
  labelHe: string;
  descriptionHe: string;
  look: CaptionLook;
  /** מדיניות החלוקה שנגזרת מהסגנון. */
  policy: Partial<CaptionPolicy>;
}

/**
 * גופנים עבריים בקוד פתוח (OFL) — נארזים עם האפליקציה, בלי CDN וללא רישוי.
 * ראה docs/EXTERNAL_SERVICES.md.
 */
export const HEBREW_FONTS = [
  { id: "Heebo", labelHe: "Heebo — נקי ומודרני" },
  { id: "Rubik", labelHe: "Rubik — עגול וידידותי" },
  { id: "Assistant", labelHe: "Assistant — ניטרלי לקריאה" },
  { id: "Alef", labelHe: "Alef — פשוט וברור" },
  { id: "Suez One", labelHe: "Suez One — כבד וכותרתי" },
  { id: "Secular One", labelHe: "Secular One — בולט לכותרות" },
  { id: "Frank Ruhl Libre", labelHe: "Frank Ruhl Libre — סריפי, מכובד" },
  { id: "David Libre", labelHe: "David Libre — קלאסי תורני" },
] as const;

export const CAPTION_STYLES: Record<CaptionStyleId, CaptionStylePreset> = {
  karaoke: {
    id: "karaoke",
    labelHe: "טיקטוק — הדגשת מילה",
    descriptionHe: "פעימות של 3–4 מילים, המילה הנאמרת מודגשת. מחזיק תשומת לב ברשתות.",
    look: {
      fontFamily: "Suez One", fontSize: 6.5, color: "#ffffff", bold: true,
      position: "center", bg: "none", outlineWidth: 4, outlineColor: "#000000",
      highlight: "pill", highlightColor: "#ffd400", uppercase: false,
    },
    policy: { targetWords: 3, minWords: 2, maxWords: 5, maxCharsPerLine: 16, maxLines: 2, minDurationSec: 0.6, maxCps: 22 },
  },
  phrase: {
    id: "phrase",
    labelHe: "פעימה — 4–6 מילים",
    descriptionHe: "ברירת המחדל. פעימה שלמה בלי חזרות, שבירה לפי מבנה המשפט.",
    look: {
      fontFamily: "Heebo", fontSize: 5, color: "#ffffff", bold: true,
      position: "bottom", bg: "soft", outlineWidth: 3, outlineColor: "#000000",
      highlight: "none", highlightColor: "#ffd400", uppercase: false,
    },
    policy: { targetWords: 5, minWords: 2, maxWords: 8, maxCharsPerLine: 24, maxLines: 2, minDurationSec: 1.0, maxCps: 17 },
  },
  lecture: {
    id: "lecture",
    labelHe: "הרצאה — משפט שלם",
    descriptionHe: "משפט לכמה שניות, קצב קריאה רגוע. מתאים לשיעור ולתוכן ארוך.",
    look: {
      fontFamily: "Assistant", fontSize: 4.4, color: "#ffffff", bold: false,
      position: "bottom", bg: "box", outlineWidth: 2, outlineColor: "#000000",
      highlight: "none", highlightColor: "#ffd400", uppercase: false,
    },
    policy: { targetWords: 8, minWords: 4, maxWords: 12, maxCharsPerLine: 32, maxLines: 2, minDurationSec: 1.6, maxCps: 14 },
  },
  minimal: {
    id: "minimal",
    labelHe: "מינימלי",
    descriptionHe: "כתובית שקטה שלא גונבת את הפריים. למצגות ולתוכן ויזואלי.",
    look: {
      fontFamily: "Assistant", fontSize: 3.8, color: "#ffffff", bold: false,
      position: "bottom", bg: "none", outlineWidth: 2, outlineColor: "#000000",
      highlight: "none", highlightColor: "#ffd400", uppercase: false,
    },
    policy: { targetWords: 6, minWords: 3, maxWords: 9, maxCharsPerLine: 28, maxLines: 1, minDurationSec: 1.4, maxCps: 15 },
  },
  none: {
    id: "none",
    labelHe: "בלי כתוביות",
    descriptionHe: "לא מייצר כתוביות בכלל.",
    look: {
      fontFamily: "Heebo", fontSize: 4.5, color: "#ffffff", bold: true,
      position: "bottom", bg: "soft", outlineWidth: 3, outlineColor: "#000000",
      highlight: "none", highlightColor: "#ffd400", uppercase: false,
    },
    policy: {},
  },
};

export function captionStyleById(id: string | null | undefined): CaptionStylePreset | undefined {
  const key = String(id || "").trim().toLowerCase();
  if (!key) return undefined;
  return (CAPTION_STYLES as Record<string, CaptionStylePreset>)[key]
    ?? Object.values(CAPTION_STYLES).find((s) => s.labelHe === id);
}

// ─── הדגשת מילה ───────────────────────────────────────────────────────────

export interface HighlightedWord {
  text: string;
  start: number;
  end: number;
}

export interface HighlightSpan {
  /** אינדקס המילה בתוך הכתובית. */
  index: number;
  start: number;
  end: number;
}

/**
 * חלונות ההדגשה בתוך כתובית אחת.
 *
 * המילה מודגשת מרגע שהיא נאמרת ועד שהבאה מתחילה — לא רק בזמן ההגייה שלה.
 * אחרת נוצרים חורים שבהם שום מילה אינה מודגשת, וההדגשה מהבהבת.
 */
export function highlightSpans(words: HighlightedWord[], cueEnd: number): HighlightSpan[] {
  const clean = words.filter((w) => Number.isFinite(w.start) && Number.isFinite(w.end));
  return clean.map((word, index) => {
    const next = clean[index + 1];
    const end = next ? Math.max(word.start + 0.05, next.start) : Math.max(word.start + 0.05, cueEnd);
    return { index, start: word.start, end };
  });
}

/** איזו מילה מודגשת בזמן נתון; -1 כשאין. */
export function activeHighlight(spans: HighlightSpan[], time: number): number {
  for (const span of spans) {
    if (time >= span.start - 1e-6 && time < span.end) return span.index;
  }
  return -1;
}

/**
 * ASS override tags לצריבה ב-FFmpeg. `subtitles` מריץ libass, שתומך
 * בקוד עיצוב מוטבע — כך הדגשת-מילה נצרבת בייצוא ולא רק נראית בתצוגה.
 */
export function assWordTags(look: CaptionLook, words: string[], activeIndex: number): string {
  const hex = (color: string) => {
    const c = color.replace("#", "");
    return `&H00${c.slice(4, 6)}${c.slice(2, 4)}${c.slice(0, 2)}`.toUpperCase();
  };
  const base = hex(look.color);
  const accent = hex(look.highlightColor);
  return words.map((word, index) => {
    if (index !== activeIndex || look.highlight === "none") return `{\\c${base}}${word}`;
    if (look.highlight === "scale") return `{\\c${accent}\\fscx115\\fscy115}${word}{\\fscx100\\fscy100}`;
    return `{\\c${accent}}${word}`;
  }).join(" ");
}

/** CSS לתצוגה המקדימה — אותם ערכים בדיוק. */
export function captionLookToCss(look: CaptionLook, canvasShortSidePx: number): Record<string, string> {
  const px = (percent: number) => `${(canvasShortSidePx * percent) / 100}px`;
  const shadow = look.outlineWidth > 0
    ? `0 0 ${look.outlineWidth}px ${look.outlineColor}, 0 0 ${look.outlineWidth * 2}px ${look.outlineColor}`
    : "none";
  return {
    fontFamily: `"${look.fontFamily}", system-ui, sans-serif`,
    fontSize: px(look.fontSize),
    color: look.color,
    fontWeight: look.bold ? "800" : "500",
    textShadow: shadow,
    background: look.bg === "box" ? "rgba(0,0,0,0.72)" : look.bg === "soft" ? "rgba(0,0,0,0.42)" : "transparent",
    textTransform: look.uppercase ? "uppercase" : "none",
  };
}
