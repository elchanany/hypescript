// קטלוג אנימציות טקסט (Text Animations) - 20+ אנימציות בסגנון CapCut

export type TextAnimKind = "in" | "out" | "loop";

export type TextAnimCategory =
  | "reveal"    // חשיפה ואותיות
  | "motion"    // תנועה והחלקה
  | "emphasis"  // הדגשה ופעימה
  | "stylized"; // אפקטים מיוחדים

export interface TextAnimation {
  id: string;
  labelHe: string;
  kind: TextAnimKind;
  category: TextAnimCategory;
  descriptionHe: string;
  defaultDuration: number;
  cssKeyframe: string;
  cssTiming: string;
}

export const TEXT_ANIMATIONS: readonly TextAnimation[] = [
  // ── חשיפה ואותיות (IN) ──────────────────────────────────────────────────
  { id: "text_typewriter", labelHe: "מכונת כתיבה", kind: "in", category: "reveal", descriptionHe: "חשיפת טקסט אות אחר אות", defaultDuration: 1.2, cssKeyframe: "hsTextTypewriter", cssTiming: "steps(30, end)" },
  { id: "text_fade_up", labelHe: "עליה עם עמעום", kind: "in", category: "reveal", descriptionHe: "צמיחה חלקה מלמטה למעלה", defaultDuration: 0.6, cssKeyframe: "hsTextFadeUp", cssTiming: "cubic-bezier(0.16, 1, 0.3, 1)" },
  { id: "text_blur_reveal", labelHe: "חשיפה מטושטשת", kind: "in", category: "reveal", descriptionHe: "התחדדות מטשטוש מלא לפוקוס", defaultDuration: 0.7, cssKeyframe: "hsTextBlurReveal", cssTiming: "ease-out" },
  { id: "text_letter_spacing", labelHe: "התרחבות רווחים", kind: "in", category: "reveal", descriptionHe: "פתיחת רווחים בין אותיות", defaultDuration: 0.8, cssKeyframe: "hsTextLetterSpacing", cssTiming: "ease-out" },
  { id: "text_word_pop", labelHe: "פופ מילים", kind: "in", category: "reveal", descriptionHe: "קפיצת מילים אנרגטית", defaultDuration: 0.5, cssKeyframe: "hsTextWordPop", cssTiming: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
  { id: "text_drop_bounce", labelHe: "נפילה קופצנית", kind: "in", category: "reveal", descriptionHe: "נפילה מלמעלה עם ריבאונד", defaultDuration: 0.75, cssKeyframe: "hsTextDropBounce", cssTiming: "cubic-bezier(0.25, 1.3, 0.5, 1)" },

  // ── תנועה והחלקה ────────────────────────────────────────────────────────
  { id: "text_slide_left", labelHe: "החלקה משמאל", kind: "in", category: "motion", descriptionHe: "כניסה צדדית חלקה משמאל", defaultDuration: 0.5, cssKeyframe: "hsTextSlideLeft", cssTiming: "cubic-bezier(0.16, 1, 0.3, 1)" },
  { id: "text_slide_right", labelHe: "החלקה מימין", kind: "in", category: "motion", descriptionHe: "כניסה צדדית חלקה מימין", defaultDuration: 0.5, cssKeyframe: "hsTextSlideRight", cssTiming: "cubic-bezier(0.16, 1, 0.3, 1)" },
  { id: "text_zoom_in", labelHe: "זום טקסט פנימה", kind: "in", category: "motion", descriptionHe: "הגדלה ישירה ממרכז הטקסט", defaultDuration: 0.5, cssKeyframe: "hsTextZoomIn", cssTiming: "cubic-bezier(0.16, 1, 0.3, 1)" },
  { id: "text_flip_x", labelHe: "היפוך תלת-ממדי 3D", kind: "in", category: "motion", descriptionHe: "התהפכות אופקית של אותיות", defaultDuration: 0.65, cssKeyframe: "hsTextFlipX", cssTiming: "ease-out" },
  { id: "text_wave_in", labelHe: "גל כניסה", kind: "in", category: "motion", descriptionHe: "תנועה גלית של הטקסט", defaultDuration: 0.8, cssKeyframe: "hsTextWaveIn", cssTiming: "ease-in-out" },

  // ── הדגשה ולולאות (LOOP / EMPHASIS) ─────────────────────────────────────
  { id: "text_pulse_loop", labelHe: "פעימה רציפה", kind: "loop", category: "emphasis", descriptionHe: "הגדלה והקטנה קבועה", defaultDuration: 1.5, cssKeyframe: "hsTextPulseLoop", cssTiming: "ease-in-out" },
  { id: "text_glow_pulse", labelHe: "זוהר ניאון מהבהב", kind: "loop", category: "emphasis", descriptionHe: "הבהובי אור ניאון מסביב לטקסט", defaultDuration: 1.8, cssKeyframe: "hsTextGlowPulse", cssTiming: "ease-in-out" },
  { id: "text_wiggle_loop", labelHe: "רטט עליז", kind: "loop", category: "emphasis", descriptionHe: "תנודות קלות ועליזות של הטקסט", defaultDuration: 0.7, cssKeyframe: "hsTextWiggleLoop", cssTiming: "linear" },
  { id: "text_shimmer_highlight", labelHe: "ברק זז (Shimmer)", kind: "loop", category: "emphasis", descriptionHe: "קרן ברק שעוברת לרוחב הטקסט", defaultDuration: 2.0, cssKeyframe: "hsTextShimmer", cssTiming: "linear" },

  // ── אפקטים מסוגננים (STYLIZED) ──────────────────────────────────────────
  { id: "text_glitch", labelHe: "גליץ' דיגיטלי", kind: "in", category: "stylized", descriptionHe: "קפיצות והפרעות דיגיטליות בטקסט", defaultDuration: 0.8, cssKeyframe: "hsTextGlitch", cssTiming: "steps(3, start)" },
  { id: "text_smoke_fade", labelHe: "התפוגגות עשן", kind: "out", category: "stylized", descriptionHe: "פיזור הדרגתי של הטקסט כמו עשן", defaultDuration: 0.7, cssKeyframe: "hsTextSmokeFade", cssTiming: "ease-out" },
  { id: "text_elastic_out", labelHe: "כיווץ ויציאה", kind: "out", category: "stylized", descriptionHe: "מתיחה מהירה והיעלמות", defaultDuration: 0.45, cssKeyframe: "hsTextElasticOut", cssTiming: "ease-in" },
  { id: "text_slide_out_up", labelHe: "יציאה למעלה", kind: "out", category: "motion", descriptionHe: "החלקה מהירה למעלה ונעלמות", defaultDuration: 0.45, cssKeyframe: "hsTextSlideOutUp", cssTiming: "ease-in" },
  { id: "text_fade_out", labelHe: "עמעום יציאה שקט", kind: "out", category: "reveal", descriptionHe: "היעלמות שקטה של האותיות", defaultDuration: 0.4, cssKeyframe: "hsTextFadeOut", cssTiming: "linear" },
] as const;

export const TEXT_ANIM_KINDS: Array<{ id: TextAnimKind; labelHe: string }> = [
  { id: "in", labelHe: "כניסה (In)" },
  { id: "out", labelHe: "יציאה (Out)" },
  { id: "loop", labelHe: "הדגשה / לולאה" },
];

export function textAnimationById(id: string | null | undefined): TextAnimation | undefined {
  const key = String(id || "").trim().toLowerCase();
  if (!key) return undefined;
  return TEXT_ANIMATIONS.find((a) => a.id === key) || TEXT_ANIMATIONS.find((a) => a.labelHe === id);
}

export function textAnimationsByKind(kind: TextAnimKind): TextAnimation[] {
  return TEXT_ANIMATIONS.filter((a) => a.kind === kind);
}

export function searchTextAnimations(query: string): TextAnimation[] {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [...TEXT_ANIMATIONS];
  return TEXT_ANIMATIONS.filter((a) =>
    a.id.includes(q) || a.labelHe.includes(q) || a.kind.includes(q) || a.descriptionHe.includes(q),
  );
}
