// קטלוג לוקים ואפקטים חזותיים.
//
// חוזה הפאריטי מ-docs/CREATIVE_LIBRARY_ARCHITECTURE.md: לכל פריט חייבות להיות
// שתי מימושים שנותנים אותה תוצאה — אחד ל-Preview (CSS) ואחד לייצוא (FFmpeg).
// פריט בלי שניהם לא נכנס לקטלוג, כדי שלא יהיו כפתורים שמדמים עריכה.
//
// כל הערכים כאן הם פילטרים מובנים של FFmpeg (eq / colorbalance / curves /
// hue / unsharp / gblur / vignette / noise) ושל CSS. אפס תלויות חדשות,
// אפס רישוי, ואותו קוד רץ ב-ffmpeg.wasm ובנייטיב.

export type EffectCategory =
  | "basic"      // תיקוני יסוד
  | "cinematic"  // לוקים קולנועיים
  | "warm"       // גוונים חמים
  | "cool"       // גוונים קרים
  | "vintage"    // רטרו / פילם
  | "bw"         // שחור-לבן
  | "stylized"   // סגנון חזק
  | "repair";    // שיפור איכות

export interface VisualEffect {
  id: string;
  labelHe: string;
  category: EffectCategory;
  /** מימוש התצוגה המקדימה — ערך תקין ל-CSS filter. */
  css: string;
  /** מימוש הייצוא — שרשרת פילטרים של FFmpeg, בלי פסיק בסוף. */
  ffmpeg: string;
  /** עוצמה ניתנת לכוונון 0..1 (1 = כפי שמוגדר). */
  adjustable?: boolean;
}

/** בונה זוג תואם של eq — אותם מספרים בשני הצדדים. */
function eq(o: { brightness?: number; contrast?: number; saturation?: number; gamma?: number }): { css: string; ffmpeg: string } {
  const b = o.brightness ?? 0;      // FFmpeg: -1..1 · CSS: 1+b
  const c = o.contrast ?? 1;
  const s = o.saturation ?? 1;
  const g = o.gamma ?? 1;
  const cssParts = [
    `brightness(${(1 + b).toFixed(3)})`,
    `contrast(${c.toFixed(3)})`,
    `saturate(${s.toFixed(3)})`,
  ];
  const ff = `eq=brightness=${b.toFixed(3)}:contrast=${c.toFixed(3)}:saturation=${s.toFixed(3)}:gamma=${g.toFixed(3)}`;
  return { css: cssParts.join(" "), ffmpeg: ff };
}

/** איזון צבע — CSS מקורב עם sepia/hue, FFmpeg מדויק עם colorbalance. */
function balance(
  base: { css: string; ffmpeg: string },
  o: { rs?: number; gs?: number; bs?: number; rm?: number; gm?: number; bm?: number; rh?: number; gh?: number; bh?: number },
  cssHint: string,
): { css: string; ffmpeg: string } {
  const parts = Object.entries(o).map(([k, v]) => `${k}=${(v as number).toFixed(3)}`).join(":");
  return {
    css: `${base.css} ${cssHint}`.trim(),
    ffmpeg: `${base.ffmpeg},colorbalance=${parts}`,
  };
}

function make(
  id: string,
  labelHe: string,
  category: EffectCategory,
  impl: { css: string; ffmpeg: string },
  adjustable = true,
): VisualEffect {
  return { id, labelHe, category, css: impl.css, ffmpeg: impl.ffmpeg, adjustable };
}

export const VISUAL_EFFECTS: readonly VisualEffect[] = [
  // ── יסוד ────────────────────────────────────────────────────────────────
  make("none", "ללא", "basic", { css: "none", ffmpeg: "" }, false),
  make("crisp", "חד", "basic", eq({ contrast: 1.15, saturation: 1.1 })),
  make("vivid", "חי", "basic", eq({ contrast: 1.1, saturation: 1.35 })),
  make("soft", "רך", "basic", eq({ contrast: 0.95, saturation: 0.92, brightness: 0.03 })),
  make("muted", "מרוכך", "basic", eq({ contrast: 0.95, saturation: 0.6 })),
  make("bright", "בהיר", "basic", eq({ brightness: 0.09, contrast: 1.03 })),
  make("dark", "כהה", "basic", eq({ brightness: -0.09, contrast: 1.06 })),
  make("flat", "שטוח (לתיקון צבע)", "basic", eq({ contrast: 0.82, saturation: 0.85, gamma: 1.08 })),
  make("punch", "אגרוף", "basic", eq({ contrast: 1.28, saturation: 1.2, gamma: 0.96 })),

  // ── קולנועי ─────────────────────────────────────────────────────────────
  make("teal_orange", "טיל-אורנג'", "cinematic",
    balance(eq({ contrast: 1.12, saturation: 1.05 }),
      { rs: -0.12, bs: 0.16, rh: 0.14, bh: -0.1 }, "hue-rotate(-6deg)")),
  make("blockbuster", "בלוקבאסטר", "cinematic",
    balance(eq({ contrast: 1.2, saturation: 1.12, gamma: 0.95 }),
      { rs: -0.08, bs: 0.14, rm: 0.05, bm: -0.04 }, "hue-rotate(-4deg)")),
  make("noir_contrast", "ניגוד דרמטי", "cinematic", eq({ contrast: 1.4, saturation: 0.9, gamma: 0.9 })),
  make("moody", "מצב רוח", "cinematic",
    balance(eq({ contrast: 1.1, saturation: 0.8, brightness: -0.05 }),
      { bs: 0.12, gs: 0.04, rh: -0.05 }, "hue-rotate(-8deg)")),
  make("dreamy", "חלומי", "cinematic",
    { css: "contrast(0.92) saturate(1.05) brightness(1.06) blur(0.3px)", ffmpeg: "eq=contrast=0.920:saturation=1.050:brightness=0.060,gblur=sigma=0.6" }),
  make("documentary", "דוקומנטרי", "cinematic", eq({ contrast: 1.06, saturation: 0.95, gamma: 1.02 })),
  make("lecture_clean", "שיעור נקי", "cinematic", eq({ contrast: 1.08, saturation: 1.02, brightness: 0.04, gamma: 1.03 })),

  // ── חם ──────────────────────────────────────────────────────────────────
  make("warm", "חמים", "warm",
    balance(eq({ contrast: 1.05, saturation: 1.08 }), { rs: 0.1, bs: -0.08 }, "sepia(0.12)")),
  make("golden_hour", "שעת זהב", "warm",
    balance(eq({ contrast: 1.05, saturation: 1.15, brightness: 0.05 }),
      { rs: 0.16, gs: 0.06, bs: -0.14, rh: 0.08 }, "sepia(0.2) saturate(1.1)")),
  make("candle", "אור נר", "warm",
    balance(eq({ contrast: 1.02, saturation: 1.05, brightness: -0.02 }),
      { rs: 0.2, gs: 0.05, bs: -0.18 }, "sepia(0.28)")),
  make("desert", "מדברי", "warm",
    balance(eq({ contrast: 1.1, saturation: 0.95 }), { rs: 0.12, gs: 0.08, bs: -0.12 }, "sepia(0.18)")),
  make("amber", "ענבר", "warm",
    balance(eq({ contrast: 1.04, saturation: 1.1 }), { rm: 0.12, gm: 0.04, bm: -0.1 }, "sepia(0.15)")),

  // ── קר ──────────────────────────────────────────────────────────────────
  make("cool", "קריר", "cool",
    balance(eq({ contrast: 1.05, saturation: 1.02 }), { rs: -0.1, bs: 0.12 }, "hue-rotate(6deg)")),
  make("arctic", "ארקטי", "cool",
    balance(eq({ contrast: 1.12, saturation: 0.9, brightness: 0.04 }),
      { rs: -0.14, bs: 0.18, gh: 0.04 }, "hue-rotate(10deg)")),
  make("night", "לילה", "cool",
    balance(eq({ contrast: 1.15, saturation: 0.75, brightness: -0.12 }),
      { bs: 0.2, rs: -0.12 }, "hue-rotate(12deg) brightness(0.9)")),
  make("steel", "פלדה", "cool",
    balance(eq({ contrast: 1.18, saturation: 0.7 }), { bs: 0.1, rm: -0.05 }, "hue-rotate(8deg)")),
  make("mint", "מנטה", "cool",
    balance(eq({ contrast: 1.02, saturation: 1.08 }), { gs: 0.1, bs: 0.06, rs: -0.08 }, "hue-rotate(14deg)")),

  // ── וינטג' ──────────────────────────────────────────────────────────────
  make("vintage", "וינטג'", "vintage",
    balance(eq({ contrast: 0.92, saturation: 0.78, gamma: 1.1 }),
      { rs: 0.12, bs: -0.1, rh: 0.06 }, "sepia(0.35)")),
  make("faded", "דהוי", "vintage", eq({ contrast: 0.82, saturation: 0.7, brightness: 0.08, gamma: 1.12 })),
  make("super8", "סופר-8", "vintage",
    { css: "sepia(0.4) contrast(1.05) saturate(0.85) brightness(1.04)", ffmpeg: "eq=contrast=1.050:saturation=0.850:brightness=0.040,colorbalance=rs=0.150:bs=-0.120,noise=alls=8:allf=t" }),
  make("sepia", "ספיה", "vintage",
    { css: "sepia(0.85) contrast(1.05)", ffmpeg: "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131,eq=contrast=1.050" }, false),
  make("old_film", "סרט ישן", "vintage",
    { css: "sepia(0.5) contrast(1.15) saturate(0.6) brightness(0.98)", ffmpeg: "eq=contrast=1.150:saturation=0.600,colorbalance=rs=0.140:bs=-0.140,noise=alls=14:allf=t+u,vignette=PI/5" }),

  // ── שחור-לבן ────────────────────────────────────────────────────────────
  make("mono", "שחור-לבן", "bw", eq({ contrast: 1.05, saturation: 0 }), false),
  make("mono_hard", "שחור-לבן ניגודי", "bw", eq({ contrast: 1.45, saturation: 0, gamma: 0.92 }), false),
  make("mono_soft", "שחור-לבן רך", "bw", eq({ contrast: 0.9, saturation: 0, brightness: 0.06, gamma: 1.1 }), false),
  make("silver", "כסוף", "bw",
    balance(eq({ contrast: 1.2, saturation: 0.08 }), { bs: 0.06 }, "grayscale(0.92) contrast(1.2)")),

  // ── מסוגנן ──────────────────────────────────────────────────────────────
  make("vignette_soft", "וינייטה עדינה", "stylized",
    { css: "contrast(1.05)", ffmpeg: "eq=contrast=1.050,vignette=PI/6" }),
  make("vignette_strong", "וינייטה חזקה", "stylized",
    { css: "contrast(1.1) brightness(0.98)", ffmpeg: "eq=contrast=1.100,vignette=PI/3.5" }),
  make("glow", "זוהר", "stylized",
    { css: "brightness(1.08) contrast(0.96) saturate(1.1) blur(0.2px)", ffmpeg: "eq=brightness=0.080:contrast=0.960:saturation=1.100,gblur=sigma=0.8" }),
  make("high_key", "מפתח גבוה", "stylized", eq({ brightness: 0.16, contrast: 0.88, saturation: 0.95, gamma: 1.15 })),
  make("low_key", "מפתח נמוך", "stylized", eq({ brightness: -0.16, contrast: 1.35, saturation: 0.92, gamma: 0.88 })),
  // curves עם רשימת נקודות דורש רווחים בתוך מרכאות; העדפנו את ה-presets
  // המובנים של FFmpeg — חסינים לניתוח, ונותנים בדיוק את אותה עקומה.
  make("posterize", "ניגוד קיצוני", "stylized",
    { css: "contrast(1.4) saturate(1.5)", ffmpeg: "eq=saturation=1.500,curves=preset=strong_contrast" }),
  make("cross_process", "קרוס-פרוסס", "stylized",
    { css: "contrast(1.2) saturate(1.35) hue-rotate(-10deg)", ffmpeg: "curves=preset=cross_process,eq=saturation=1.150" }),
  make("film_vintage_curve", "עקומת פילם", "vintage",
    { css: "contrast(0.95) saturate(0.8) sepia(0.25)", ffmpeg: "curves=preset=vintage" }, false),
  make("lighter_curve", "הבהרה עדינה", "repair",
    { css: "brightness(1.1) contrast(0.98)", ffmpeg: "curves=preset=lighter" }, false),
  make("darker_curve", "הכהיה עדינה", "repair",
    { css: "brightness(0.92) contrast(1.02)", ffmpeg: "curves=preset=darker" }, false),
  make("invert", "היפוך צבעים", "stylized",
    { css: "invert(1)", ffmpeg: "negate" }, false),

  // ── שיפור ───────────────────────────────────────────────────────────────
  make("sharpen", "חידוד", "repair",
    { css: "contrast(1.06)", ffmpeg: "unsharp=5:5:0.8:5:5:0.0" }),
  make("sharpen_strong", "חידוד חזק", "repair",
    { css: "contrast(1.12)", ffmpeg: "unsharp=5:5:1.4:5:5:0.0" }),
  make("denoise_soft", "ריכוך רעש", "repair",
    { css: "blur(0.2px)", ffmpeg: "gblur=sigma=0.5" }),
  make("brighten_face", "הבהרת פנים", "repair", eq({ brightness: 0.12, contrast: 0.98, gamma: 1.12 })),
  make("fix_dark", "תיקון חשוך", "repair", eq({ brightness: 0.18, contrast: 1.08, gamma: 1.25 })),
  make("fix_washed", "תיקון שטוף", "repair", eq({ contrast: 1.25, saturation: 1.2, gamma: 0.92 })),
] as const;

export const EFFECT_CATEGORIES: Array<{ id: EffectCategory; labelHe: string }> = [
  { id: "basic", labelHe: "יסוד" },
  { id: "cinematic", labelHe: "קולנועי" },
  { id: "warm", labelHe: "חם" },
  { id: "cool", labelHe: "קר" },
  { id: "vintage", labelHe: "וינטג'" },
  { id: "bw", labelHe: "שחור-לבן" },
  { id: "stylized", labelHe: "מסוגנן" },
  { id: "repair", labelHe: "שיפור" },
];

export function effectById(id: string | null | undefined): VisualEffect | undefined {
  const key = String(id || "").trim().toLowerCase();
  if (!key) return undefined;
  return VISUAL_EFFECTS.find((e) => e.id === key) || VISUAL_EFFECTS.find((e) => e.labelHe === id);
}

export function effectsByCategory(category: EffectCategory): VisualEffect[] {
  return VISUAL_EFFECTS.filter((e) => e.category === category);
}

/** חיפוש חופשי בעברית או באנגלית. */
export function searchEffects(query: string): VisualEffect[] {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [...VISUAL_EFFECTS];
  return VISUAL_EFFECTS.filter((e) => e.id.includes(q) || e.labelHe.includes(q) || e.category.includes(q));
}

/**
 * מערבב אפקט בעוצמה חלקית. 0 = ללא, 1 = מלא.
 * FFmpeg אינו יודע לערבב פילטר חלקית, לכן העוצמה נאכפת על ידי הזזת הערכים
 * עצמם לכיוון הנייטרלי — אותה נוסחה בדיוק משמשת גם ל-CSS.
 */
export function scaleEffect(effect: VisualEffect, amount: number): { css: string; ffmpeg: string } {
  const k = Math.max(0, Math.min(1, amount));
  if (k >= 0.999 || !effect.adjustable) return { css: effect.css, ffmpeg: effect.ffmpeg };
  if (k <= 0.001) return { css: "none", ffmpeg: "" };
  const lerpNumbers = (text: string, neutral: (key: string) => number) =>
    text.replace(/([a-z_]+)=(-?\d*\.?\d+)/g, (_m, key: string, value: string) => {
      const target = parseFloat(value);
      const base = neutral(key);
      return `${key}=${(base + (target - base) * k).toFixed(3)}`;
    });
  const ffmpegNeutral = (key: string) => (key === "contrast" || key === "saturation" || key === "gamma" ? 1 : 0);
  const css = effect.css.replace(/([a-z-]+)\(([-\d.]+)(px|deg)?\)/g, (_m, fn: string, value: string, unit = "") => {
    const target = parseFloat(value);
    const base = fn === "brightness" || fn === "contrast" || fn === "saturate" ? 1 : 0;
    return `${fn}(${(base + (target - base) * k).toFixed(3)}${unit})`;
  });
  return { css, ffmpeg: lerpNumbers(effect.ffmpeg, ffmpegNeutral) };
}
