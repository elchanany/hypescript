// קטלוג מעברים.
//
// כל 58 המעברים של פילטר xfade, שכבר קיים בתוך ffmpeg.wasm שהפרויקט מריץ.
// אפס תלויות חדשות, אפס רישוי, אפס build מותאם — וכל מעבר מרונדר בייצוא
// בדיוק כפי שהוא מוגדר כאן.
//
// לתצוגה המקדימה יש לכל מעבר תיאור גיאומטרי (`preview`) שמאפשר לשחזר את
// אותה תנועה ב-CSS/Canvas. זה מקיים את חוזה הפאריטי מ-
// docs/CREATIVE_LIBRARY_ARCHITECTURE.md: פריט קיים רק כששני המסלולים מוגדרים.

export type TransitionCategory =
  | "dissolve"  // המסה ועמעום
  | "wipe"      // מחיקה
  | "slide"     // החלקה
  | "cover"     // כיסוי וחשיפה
  | "shape"     // צורות
  | "motion"    // תנועה ועיוות
  | "stylized"; // אפקטיביים

/** איך התצוגה המקדימה משחזרת את התנועה. */
export type PreviewKind =
  | { kind: "opacity" }
  | { kind: "opacity-through"; color: "black" | "white" | "gray" }
  | { kind: "wipe"; axis: "x" | "y"; from: -1 | 1; soft: number }
  | { kind: "wipe-diagonal"; corner: "tl" | "tr" | "bl" | "br" }
  | { kind: "wipe-split"; axis: "x" | "y"; direction: "open" | "close" }
  | { kind: "slide"; axis: "x" | "y"; from: -1 | 1 }
  | { kind: "cover"; axis: "x" | "y"; from: -1 | 1; reveal: boolean }
  | { kind: "shape"; shape: "circle" | "rect" | "radial"; direction: "open" | "close" }
  | { kind: "squeeze"; axis: "x" | "y" }
  | { kind: "zoom" }
  | { kind: "blur" }
  | { kind: "pixelize" }
  | { kind: "noise" }
  | { kind: "slice"; axis: "x" | "y"; from: -1 | 1; wind: boolean };

export interface Transition {
  id: string;
  /** שם הפילטר ב-xfade — מקור האמת לייצוא. */
  xfade: string;
  labelHe: string;
  category: TransitionCategory;
  preview: PreviewKind;
  /** משך ברירת מחדל בשניות. */
  defaultDuration: number;
}

/**
 * מעברים ש-FFmpeg מכיר אבל אסור להציע.
 *
 * `squeezev` מקריס את FFmpeg עם segfault בכל רזולוציה שנבדקה
 * (160x90 / 320x180 / 640x360 / 1280x720, גרסה 8.0.1). זה באג ב-FFmpeg עצמו,
 * לא בקוד כאן — `squeezeh` עובד תקין. הצעה שלו הייתה מקריסה את הייצוא אצל
 * המשתמש. לא להחזיר בלי להריץ מחדש את בדיקת ה-FFmpeg החיה.
 */
export const BLOCKED_XFADE: Readonly<Record<string, string>> = {
  squeezev: "מקריס את FFmpeg (segfault) בכל רזולוציה — באג ב-FFmpeg 8.0.1",
};

const T = (
  xfade: string,
  labelHe: string,
  category: TransitionCategory,
  preview: PreviewKind,
  defaultDuration = 0.5,
): Transition => ({ id: xfade, xfade, labelHe, category, preview, defaultDuration });

export const TRANSITIONS: readonly Transition[] = [
  // ── המסה ועמעום ─────────────────────────────────────────────────────────
  T("fade", "עמעום", "dissolve", { kind: "opacity" }),
  T("fadefast", "עמעום מהיר", "dissolve", { kind: "opacity" }, 0.35),
  T("fadeslow", "עמעום איטי", "dissolve", { kind: "opacity" }, 0.9),
  T("fadeblack", "דרך שחור", "dissolve", { kind: "opacity-through", color: "black" }, 0.7),
  T("fadewhite", "דרך לבן", "dissolve", { kind: "opacity-through", color: "white" }, 0.7),
  T("fadegrays", "דרך אפור", "dissolve", { kind: "opacity-through", color: "gray" }, 0.7),
  T("dissolve", "המסה מגורענת", "dissolve", { kind: "noise" }),
  T("distance", "מרחק צבע", "dissolve", { kind: "opacity" }, 0.6),

  // ── מחיקה ───────────────────────────────────────────────────────────────
  T("wipeleft", "מחיקה שמאלה", "wipe", { kind: "wipe", axis: "x", from: 1, soft: 0 }),
  T("wiperight", "מחיקה ימינה", "wipe", { kind: "wipe", axis: "x", from: -1, soft: 0 }),
  T("wipeup", "מחיקה למעלה", "wipe", { kind: "wipe", axis: "y", from: 1, soft: 0 }),
  T("wipedown", "מחיקה למטה", "wipe", { kind: "wipe", axis: "y", from: -1, soft: 0 }),
  T("smoothleft", "מחיקה רכה שמאלה", "wipe", { kind: "wipe", axis: "x", from: 1, soft: 0.25 }),
  T("smoothright", "מחיקה רכה ימינה", "wipe", { kind: "wipe", axis: "x", from: -1, soft: 0.25 }),
  T("smoothup", "מחיקה רכה למעלה", "wipe", { kind: "wipe", axis: "y", from: 1, soft: 0.25 }),
  T("smoothdown", "מחיקה רכה למטה", "wipe", { kind: "wipe", axis: "y", from: -1, soft: 0.25 }),
  T("wipetl", "מחיקה מפינה עליונה-שמאל", "wipe", { kind: "wipe-diagonal", corner: "tl" }),
  T("wipetr", "מחיקה מפינה עליונה-ימין", "wipe", { kind: "wipe-diagonal", corner: "tr" }),
  T("wipebl", "מחיקה מפינה תחתונה-שמאל", "wipe", { kind: "wipe-diagonal", corner: "bl" }),
  T("wipebr", "מחיקה מפינה תחתונה-ימין", "wipe", { kind: "wipe-diagonal", corner: "br" }),
  T("diagtl", "אלכסון עליון-שמאל", "wipe", { kind: "wipe-diagonal", corner: "tl" }),
  T("diagtr", "אלכסון עליון-ימין", "wipe", { kind: "wipe-diagonal", corner: "tr" }),
  T("diagbl", "אלכסון תחתון-שמאל", "wipe", { kind: "wipe-diagonal", corner: "bl" }),
  T("diagbr", "אלכסון תחתון-ימין", "wipe", { kind: "wipe-diagonal", corner: "br" }),
  T("vertopen", "פתיחה אנכית", "wipe", { kind: "wipe-split", axis: "x", direction: "open" }),
  T("vertclose", "סגירה אנכית", "wipe", { kind: "wipe-split", axis: "x", direction: "close" }),
  T("horzopen", "פתיחה אופקית", "wipe", { kind: "wipe-split", axis: "y", direction: "open" }),
  T("horzclose", "סגירה אופקית", "wipe", { kind: "wipe-split", axis: "y", direction: "close" }),

  // ── החלקה ───────────────────────────────────────────────────────────────
  T("slideleft", "החלקה שמאלה", "slide", { kind: "slide", axis: "x", from: 1 }),
  T("slideright", "החלקה ימינה", "slide", { kind: "slide", axis: "x", from: -1 }),
  T("slideup", "החלקה למעלה", "slide", { kind: "slide", axis: "y", from: 1 }),
  T("slidedown", "החלקה למטה", "slide", { kind: "slide", axis: "y", from: -1 }),

  // ── כיסוי וחשיפה ────────────────────────────────────────────────────────
  T("coverleft", "כיסוי משמאל", "cover", { kind: "cover", axis: "x", from: 1, reveal: false }),
  T("coverright", "כיסוי מימין", "cover", { kind: "cover", axis: "x", from: -1, reveal: false }),
  T("coverup", "כיסוי מלמעלה", "cover", { kind: "cover", axis: "y", from: 1, reveal: false }),
  T("coverdown", "כיסוי מלמטה", "cover", { kind: "cover", axis: "y", from: -1, reveal: false }),
  T("revealleft", "חשיפה שמאלה", "cover", { kind: "cover", axis: "x", from: 1, reveal: true }),
  T("revealright", "חשיפה ימינה", "cover", { kind: "cover", axis: "x", from: -1, reveal: true }),
  T("revealup", "חשיפה למעלה", "cover", { kind: "cover", axis: "y", from: 1, reveal: true }),
  T("revealdown", "חשיפה למטה", "cover", { kind: "cover", axis: "y", from: -1, reveal: true }),

  // ── צורות ───────────────────────────────────────────────────────────────
  T("circleopen", "מעגל נפתח", "shape", { kind: "shape", shape: "circle", direction: "open" }),
  T("circleclose", "מעגל נסגר", "shape", { kind: "shape", shape: "circle", direction: "close" }),
  T("circlecrop", "חיתוך מעגלי", "shape", { kind: "shape", shape: "circle", direction: "close" }, 0.7),
  T("rectcrop", "חיתוך מלבני", "shape", { kind: "shape", shape: "rect", direction: "close" }, 0.7),
  T("radial", "סריקה רדיאלית", "shape", { kind: "shape", shape: "radial", direction: "open" }, 0.6),

  // ── תנועה ועיוות ────────────────────────────────────────────────────────
  T("squeezeh", "מעיכה אופקית", "motion", { kind: "squeeze", axis: "x" }),
  // squeezev חסר בכוונה — ראה BLOCKED_XFADE למטה.
  T("zoomin", "זום פנימה", "motion", { kind: "zoom" }, 0.6),
  T("hlslice", "פרוסות שמאלה", "motion", { kind: "slice", axis: "x", from: 1, wind: false }),
  T("hrslice", "פרוסות ימינה", "motion", { kind: "slice", axis: "x", from: -1, wind: false }),
  T("vuslice", "פרוסות למעלה", "motion", { kind: "slice", axis: "y", from: 1, wind: false }),
  T("vdslice", "פרוסות למטה", "motion", { kind: "slice", axis: "y", from: -1, wind: false }),
  T("hlwind", "רוח שמאלה", "motion", { kind: "slice", axis: "x", from: 1, wind: true }, 0.6),
  T("hrwind", "רוח ימינה", "motion", { kind: "slice", axis: "x", from: -1, wind: true }, 0.6),
  T("vuwind", "רוח למעלה", "motion", { kind: "slice", axis: "y", from: 1, wind: true }, 0.6),
  T("vdwind", "רוח למטה", "motion", { kind: "slice", axis: "y", from: -1, wind: true }, 0.6),

  // ── מסוגנן ──────────────────────────────────────────────────────────────
  T("hblur", "טשטוש מעבר", "stylized", { kind: "blur" }, 0.6),
  T("pixelize", "פיקסול", "stylized", { kind: "pixelize" }, 0.6),
] as const;

export const TRANSITION_CATEGORIES: Array<{ id: TransitionCategory; labelHe: string }> = [
  { id: "dissolve", labelHe: "עמעום" },
  { id: "wipe", labelHe: "מחיקה" },
  { id: "slide", labelHe: "החלקה" },
  { id: "cover", labelHe: "כיסוי" },
  { id: "shape", labelHe: "צורות" },
  { id: "motion", labelHe: "תנועה" },
  { id: "stylized", labelHe: "מסוגנן" },
];

export function transitionById(id: string | null | undefined): Transition | undefined {
  const key = String(id || "").trim().toLowerCase();
  if (!key) return undefined;
  return TRANSITIONS.find((t) => t.id === key) || TRANSITIONS.find((t) => t.labelHe === id);
}

export function transitionsByCategory(category: TransitionCategory): Transition[] {
  return TRANSITIONS.filter((t) => t.category === category);
}

export function searchTransitions(query: string): Transition[] {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [...TRANSITIONS];
  return TRANSITIONS.filter((t) => t.id.includes(q) || t.labelHe.includes(q) || t.category.includes(q));
}

/**
 * בונה את קטע ה-xfade לייצוא.
 * `offset` הוא הרגע על ציר הפלט שבו המעבר מתחיל — כלומר סוף הקליפ הראשון
 * פחות משך המעבר, כי xfade *חופף* את שני הקליפים ולא משרשר אותם.
 */
export function xfadeFilter(transition: Transition, durationSec: number, offsetSec: number): string {
  const duration = Math.max(0.05, durationSec);
  return `xfade=transition=${transition.xfade}:duration=${duration.toFixed(3)}:offset=${Math.max(0, offsetSec).toFixed(3)}`;
}

/**
 * משך מעבר בטוח בין שני קליפים. xfade חופף אותם, ולכן מעבר ארוך מדי בולע
 * דיבור. התקרה היא שליש מהקליפ הקצר מבין השניים.
 */
export function safeTransitionDuration(
  requestedSec: number,
  previousClipSec: number,
  nextClipSec: number,
): number {
  const ceiling = Math.max(0.05, Math.min(previousClipSec, nextClipSec) / 3);
  return Math.max(0.05, Math.min(requestedSec, ceiling));
}
