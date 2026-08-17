// קטלוג אנימציות לקליפים ולשכבות (In / Out / Combo) - 85+ אנימציות בסגנון CapCut
//
// כל אנימציה מכילה מזהה, שם בעברית, סוג (כניסה, יציאה, או קומבו מתמשך),
// משך מומלץ והגדרת CSS animation תואמת לתצוגה מקדימה ורינדור.

export type AnimationKind = "in" | "out" | "combo";

export type AnimationCategory =
  | "zoom"      // זום והגדלה
  | "slide"     // החלקה ותזוזה
  | "rotate"    // סיבוב והיפוך
  | "bounce"    // קפיצה ואלסטיות
  | "fade"      // עמעום וטשטוש
  | "dynamic";  // תנועה דינמית ואפקטים

export interface VisualAnimation {
  id: string;
  labelHe: string;
  kind: AnimationKind;
  category: AnimationCategory;
  descriptionHe: string;
  defaultDuration: number; // בשניות (בד"כ 0.3-0.8 לכניסה/יציאה, 1.0-2.5 לקומבו)
  cssKeyframe: string;     // שם ה-keyframe ב-CSS
  cssTiming: string;       // easing (e.g. cubic-bezier(0.16, 1, 0.3, 1))
}

export const CLIP_ANIMATIONS: readonly VisualAnimation[] = [
  // ── IN: זום ─────────────────────────────────────────────────────────────
  { id: "in_zoom_in", labelHe: "זום פנימה", kind: "in", category: "zoom", descriptionHe: "הגדלה חלקה ממרכז המסך", defaultDuration: 0.5, cssKeyframe: "hsAnimZoomIn", cssTiming: "cubic-bezier(0.16, 1, 0.3, 1)" },
  { id: "in_zoom_out", labelHe: "זום החוצה", kind: "in", category: "zoom", descriptionHe: "הקטנה מגודל ענק לגודל מלא", defaultDuration: 0.5, cssKeyframe: "hsAnimZoomOutIn", cssTiming: "cubic-bezier(0.16, 1, 0.3, 1)" },
  { id: "in_zoom_bounce", labelHe: "זום קופצני", kind: "in", category: "zoom", descriptionHe: "זום מהיר עם קפיצה קלה בסיום", defaultDuration: 0.6, cssKeyframe: "hsAnimZoomBounce", cssTiming: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
  { id: "in_zoom_spin", labelHe: "זום מסתובב", kind: "in", category: "zoom", descriptionHe: "זום פנימה עם סיבוב קל", defaultDuration: 0.6, cssKeyframe: "hsAnimZoomSpin", cssTiming: "cubic-bezier(0.16, 1, 0.3, 1)" },
  { id: "in_zoom_left", labelHe: "זום מפינה שמאלית", kind: "in", category: "zoom", descriptionHe: "התרחבות מפינה שמאל עליון", defaultDuration: 0.5, cssKeyframe: "hsAnimZoomLeft", cssTiming: "ease-out" },
  { id: "in_zoom_right", labelHe: "זום מפינה ימנית", kind: "in", category: "zoom", descriptionHe: "התרחבות מפינה ימין עליון", defaultDuration: 0.5, cssKeyframe: "hsAnimZoomRight", cssTiming: "ease-out" },
  { id: "in_zoom_bottom", labelHe: "זום מתחתית", kind: "in", category: "zoom", descriptionHe: "התרחבות מחלקו התחתון של המסך", defaultDuration: 0.5, cssKeyframe: "hsAnimZoomBottom", cssTiming: "ease-out" },

  // ── IN: החלקה ───────────────────────────────────────────────────────────
  { id: "in_slide_left", labelHe: "החלקה משמאל", kind: "in", category: "slide", descriptionHe: "כניסה חלקה מצד שמאל", defaultDuration: 0.5, cssKeyframe: "hsAnimSlideLeft", cssTiming: "cubic-bezier(0.16, 1, 0.3, 1)" },
  { id: "in_slide_right", labelHe: "החלקה מימין", kind: "in", category: "slide", descriptionHe: "כניסה חלקה מצד ימין", defaultDuration: 0.5, cssKeyframe: "hsAnimSlideRight", cssTiming: "cubic-bezier(0.16, 1, 0.3, 1)" },
  { id: "in_slide_up", labelHe: "החלקה מלמטה", kind: "in", category: "slide", descriptionHe: "עליה חלקה מתחתית המסך", defaultDuration: 0.5, cssKeyframe: "hsAnimSlideUp", cssTiming: "cubic-bezier(0.16, 1, 0.3, 1)" },
  { id: "in_slide_down", labelHe: "החלקה מלמעלה", kind: "in", category: "slide", descriptionHe: "ירידה חלקה מחלקו העליון של המסך", defaultDuration: 0.5, cssKeyframe: "hsAnimSlideDown", cssTiming: "cubic-bezier(0.16, 1, 0.3, 1)" },
  { id: "in_slide_diagonal_tl", labelHe: "באלכסון משמאל", kind: "in", category: "slide", descriptionHe: "כניסה אלכסונית מפינה עליונה", defaultDuration: 0.5, cssKeyframe: "hsAnimSlideDiagTL", cssTiming: "cubic-bezier(0.16, 1, 0.3, 1)" },
  { id: "in_slide_diagonal_tr", labelHe: "באלכסון מימין", kind: "in", category: "slide", descriptionHe: "כניסה אלכסונית מפינה ימנית", defaultDuration: 0.5, cssKeyframe: "hsAnimSlideDiagTR", cssTiming: "cubic-bezier(0.16, 1, 0.3, 1)" },
  { id: "in_slide_diagonal_bl", labelHe: "באלכסון משמאל למטה", kind: "in", category: "slide", descriptionHe: "כניסה מפינה שמאלית תחתונה", defaultDuration: 0.5, cssKeyframe: "hsAnimSlideDiagBL", cssTiming: "ease-out" },
  { id: "in_slide_diagonal_br", labelHe: "באלכסון מימין למטה", kind: "in", category: "slide", descriptionHe: "כניסה מפינה ימנית תחתונה", defaultDuration: 0.5, cssKeyframe: "hsAnimSlideDiagBR", cssTiming: "ease-out" },

  // ── IN: סיבוב והיפוך ────────────────────────────────────────────────────
  { id: "in_spin_clockwise", labelHe: "סיבוב עם השעון", kind: "in", category: "rotate", descriptionHe: "סיבוב 360 מעלות פנימה", defaultDuration: 0.6, cssKeyframe: "hsAnimSpinCW", cssTiming: "cubic-bezier(0.16, 1, 0.3, 1)" },
  { id: "in_spin_counter", labelHe: "סיבוב נגד השעון", kind: "in", category: "rotate", descriptionHe: "סיבוב הפוך 360 מעלות פנימה", defaultDuration: 0.6, cssKeyframe: "hsAnimSpinCCW", cssTiming: "cubic-bezier(0.16, 1, 0.3, 1)" },
  { id: "in_flip_x", labelHe: "היפוך אופקי 3D", kind: "in", category: "rotate", descriptionHe: "התהפכות אופקית תלת-ממדית", defaultDuration: 0.6, cssKeyframe: "hsAnimFlipX", cssTiming: "ease-out" },
  { id: "in_flip_y", labelHe: "היפוך אנכי 3D", kind: "in", category: "rotate", descriptionHe: "התהפכות אנכית תלת-ממדית", defaultDuration: 0.6, cssKeyframe: "hsAnimFlipY", cssTiming: "ease-out" },
  { id: "in_roll", labelHe: "גלגול פנימה", kind: "in", category: "rotate", descriptionHe: "גלגול ותזוזה צדדית למרכז", defaultDuration: 0.6, cssKeyframe: "hsAnimRollIn", cssTiming: "ease-out" },
  { id: "in_swirl", labelHe: "מערבולת", kind: "in", category: "rotate", descriptionHe: "סיבוב מתכנס פנימה", defaultDuration: 0.65, cssKeyframe: "hsAnimSwirlIn", cssTiming: "ease-out" },

  // ── IN: קפיצה ואלסטיות ──────────────────────────────────────────────────
  { id: "in_pop", labelHe: "פופ קופצני", kind: "in", category: "bounce", descriptionHe: "קפיצה פתאומית והתייצבות", defaultDuration: 0.45, cssKeyframe: "hsAnimPop", cssTiming: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
  { id: "in_elastic_drop", labelHe: "נפילה אלסטית", kind: "in", category: "bounce", descriptionHe: "נפילה מלמעלה עם קפיציות", defaultDuration: 0.7, cssKeyframe: "hsAnimElasticDrop", cssTiming: "cubic-bezier(0.25, 1.4, 0.5, 1)" },
  { id: "in_elastic_scale", labelHe: "מתיחה אלסטית", kind: "in", category: "bounce", descriptionHe: "התרחבות גמישה וכיווץ חזרה", defaultDuration: 0.6, cssKeyframe: "hsAnimElasticScale", cssTiming: "ease-out" },
  { id: "in_swing", labelHe: "נדנדה", kind: "in", category: "bounce", descriptionHe: "התנדנדות מטוטלת ממעלה המסך", defaultDuration: 0.7, cssKeyframe: "hsAnimSwingIn", cssTiming: "ease-in-out" },
  { id: "in_bounce_left", labelHe: "קפיצה משמאל", kind: "in", category: "bounce", descriptionHe: "החלקה קופצנית מצד שמאל", defaultDuration: 0.6, cssKeyframe: "hsAnimBounceLeft", cssTiming: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
  { id: "in_bounce_right", labelHe: "קפיצה מימין", kind: "in", category: "bounce", descriptionHe: "החלקה קופצנית מצד ימין", defaultDuration: 0.6, cssKeyframe: "hsAnimBounceRight", cssTiming: "cubic-bezier(0.34, 1.56, 0.64, 1)" },

  // ── IN: עמעום וטשטוש ────────────────────────────────────────────────────
  { id: "in_fade", labelHe: "עמעום קלאסי", kind: "in", category: "fade", descriptionHe: "כניסה הדרגתית של שקיפות", defaultDuration: 0.4, cssKeyframe: "hsAnimFadeIn", cssTiming: "linear" },
  { id: "in_blur", labelHe: "חשיפה מטושטשת", kind: "in", category: "fade", descriptionHe: "התחדדות מטשטוש מלא", defaultDuration: 0.6, cssKeyframe: "hsAnimBlurIn", cssTiming: "ease-out" },
  { id: "in_expand", labelHe: "התרחבות רכה", kind: "in", category: "fade", descriptionHe: "פתיחה אופקית ממרכז הפריים", defaultDuration: 0.5, cssKeyframe: "hsAnimExpandIn", cssTiming: "ease-out" },

  // ── OUT: זום ────────────────────────────────────────────────────────────
  { id: "out_zoom_in", labelHe: "זום מוגדל החוצה", kind: "out", category: "zoom", descriptionHe: "הגדלה ענקית תוך כדי עמעום", defaultDuration: 0.45, cssKeyframe: "hsAnimZoomInOut", cssTiming: "ease-in" },
  { id: "out_zoom_out", labelHe: "זום מזעור", kind: "out", category: "zoom", descriptionHe: "הקטנה לנקודה ונעלמות", defaultDuration: 0.45, cssKeyframe: "hsAnimZoomOut", cssTiming: "ease-in" },
  { id: "out_zoom_spin", labelHe: "זום מסתובב החוצה", kind: "out", category: "zoom", descriptionHe: "הקטנה תוך כדי סיבוב מהיר", defaultDuration: 0.5, cssKeyframe: "hsAnimZoomSpinOut", cssTiming: "ease-in" },
  { id: "out_zoom_left", labelHe: "זום מזעור שמאלה", kind: "out", category: "zoom", descriptionHe: "התכנסות לפינה שמאלית", defaultDuration: 0.45, cssKeyframe: "hsAnimZoomLeftOut", cssTiming: "ease-in" },
  { id: "out_zoom_right", labelHe: "זום מזעור ימינה", kind: "out", category: "zoom", descriptionHe: "התכנסות לפינה ימנית", defaultDuration: 0.45, cssKeyframe: "hsAnimZoomRightOut", cssTiming: "ease-in" },
  { id: "out_zoom_drop", labelHe: "צניחה עם זום", kind: "out", category: "zoom", descriptionHe: "נפילה מהירה תוך הקטנה", defaultDuration: 0.5, cssKeyframe: "hsAnimZoomDropOut", cssTiming: "ease-in" },

  // ── OUT: החלקה ──────────────────────────────────────────────────────────
  { id: "out_slide_left", labelHe: "יציאה שמאלה", kind: "out", category: "slide", descriptionHe: "החלקה מהירה שמאלה החוצה", defaultDuration: 0.45, cssKeyframe: "hsAnimSlideOutLeft", cssTiming: "ease-in" },
  { id: "out_slide_right", labelHe: "יציאה ימינה", kind: "out", category: "slide", descriptionHe: "החלקה מהירה ימינה החוצה", defaultDuration: 0.45, cssKeyframe: "hsAnimSlideOutRight", cssTiming: "ease-in" },
  { id: "out_slide_up", labelHe: "יציאה למעלה", kind: "out", category: "slide", descriptionHe: "עלייה מהירה מעבר למסך", defaultDuration: 0.45, cssKeyframe: "hsAnimSlideOutUp", cssTiming: "ease-in" },
  { id: "out_slide_down", labelHe: "יציאה למטה", kind: "out", category: "slide", descriptionHe: "צניחה מהירה למטה מעבר למסך", defaultDuration: 0.45, cssKeyframe: "hsAnimSlideOutDown", cssTiming: "ease-in" },
  { id: "out_slide_diag_tl", labelHe: "יציאה באלכסון שמאל עליון", kind: "out", category: "slide", descriptionHe: "החלקה מהירה לפינה עליונה", defaultDuration: 0.45, cssKeyframe: "hsAnimSlideOutDiagTL", cssTiming: "ease-in" },
  { id: "out_slide_diag_tr", labelHe: "יציאה באלכסון ימין עליון", kind: "out", category: "slide", descriptionHe: "החלקה מהירה לפינה ימנית", defaultDuration: 0.45, cssKeyframe: "hsAnimSlideOutDiagTR", cssTiming: "ease-in" },
  { id: "out_slide_diag_bl", labelHe: "יציאה באלכסון שמאל תחתון", kind: "out", category: "slide", descriptionHe: "צניחה אלכסונית שמאלה", defaultDuration: 0.45, cssKeyframe: "hsAnimSlideOutDiagBL", cssTiming: "ease-in" },
  { id: "out_slide_diag_br", labelHe: "יציאה באלכסון ימין תחתון", kind: "out", category: "slide", descriptionHe: "צניחה אלכסונית ימינה", defaultDuration: 0.45, cssKeyframe: "hsAnimSlideOutDiagBR", cssTiming: "ease-in" },

  // ── OUT: סיבוב והיפוך ───────────────────────────────────────────────────
  { id: "out_spin", labelHe: "סיבוב החוצה", kind: "out", category: "rotate", descriptionHe: "סיבוב מהיר והיעלמות", defaultDuration: 0.5, cssKeyframe: "hsAnimSpinOut", cssTiming: "ease-in" },
  { id: "out_spin_ccw", labelHe: "סיבוב הפוך החוצה", kind: "out", category: "rotate", descriptionHe: "סיבוב נגד השעון עד היעלמות", defaultDuration: 0.5, cssKeyframe: "hsAnimSpinOutCCW", cssTiming: "ease-in" },
  { id: "out_flip_x", labelHe: "היפוך אופקי החוצה", kind: "out", category: "rotate", descriptionHe: "התהפכות אופקית עד היעלמות", defaultDuration: 0.5, cssKeyframe: "hsAnimFlipOutX", cssTiming: "ease-in" },
  { id: "out_flip_y", labelHe: "היפוך אנכי החוצה", kind: "out", category: "rotate", descriptionHe: "התהפכות אנכית עד היעלמות", defaultDuration: 0.5, cssKeyframe: "hsAnimFlipOutY", cssTiming: "ease-in" },
  { id: "out_roll", labelHe: "גלגול החוצה", kind: "out", category: "rotate", descriptionHe: "גלגול צדדי אל מחוץ למסך", defaultDuration: 0.55, cssKeyframe: "hsAnimRollOut", cssTiming: "ease-in" },
  { id: "out_swirl", labelHe: "מערבולת החוצה", kind: "out", category: "rotate", descriptionHe: "היעלמות במערבולת סיבובית", defaultDuration: 0.6, cssKeyframe: "hsAnimSwirlOut", cssTiming: "ease-in" },

  // ── OUT: עמעום וטשטוש ───────────────────────────────────────────────────
  { id: "out_fade", labelHe: "עמעום יציאה", kind: "out", category: "fade", descriptionHe: "היעלמות שקטה והדרגתית", defaultDuration: 0.4, cssKeyframe: "hsAnimFadeOut", cssTiming: "linear" },
  { id: "out_blur", labelHe: "טשטוש החוצה", kind: "out", category: "fade", descriptionHe: "טשטוש הדרגתי עד היעלמות", defaultDuration: 0.5, cssKeyframe: "hsAnimBlurOut", cssTiming: "ease-in" },
  { id: "out_shrink", labelHe: "התכווצות", kind: "out", category: "fade", descriptionHe: "סגירה אופקית למרכז הפריים", defaultDuration: 0.45, cssKeyframe: "hsAnimShrinkOut", cssTiming: "ease-in" },
  { id: "out_elastic_shrink", labelHe: "כיווץ אלסטי", kind: "out", category: "bounce", descriptionHe: "התרחבות קלה וכיווץ מהיר לאפס", defaultDuration: 0.5, cssKeyframe: "hsAnimElasticShrink", cssTiming: "ease-in" },

  // ── COMBO: תנועות רציפות ────────────────────────────────────────────────
  { id: "combo_pulse", labelHe: "פעימה (Pulse)", kind: "combo", category: "dynamic", descriptionHe: "הגדלה והקטנה קצבית ומתמשכת", defaultDuration: 1.5, cssKeyframe: "hsAnimComboPulse", cssTiming: "ease-in-out" },
  { id: "combo_shake", labelHe: "רעד מצלמה (Shake)", kind: "combo", category: "dynamic", descriptionHe: "רעידות קלות ומציאותיות של מצלמה", defaultDuration: 0.8, cssKeyframe: "hsAnimComboShake", cssTiming: "linear" },
  { id: "combo_float", labelHe: "ציפה (Float)", kind: "combo", category: "dynamic", descriptionHe: "תנועת ריחוף גלית ומרגיעה", defaultDuration: 2.5, cssKeyframe: "hsAnimComboFloat", cssTiming: "ease-in-out" },
  { id: "combo_jiggle", labelHe: "רטט (Jiggle)", kind: "combo", category: "dynamic", descriptionHe: "רטט קל ועצבני לתשומת לב", defaultDuration: 0.6, cssKeyframe: "hsAnimComboJiggle", cssTiming: "linear" },
  { id: "combo_swing", labelHe: "נדנוד (Swing)", kind: "combo", category: "dynamic", descriptionHe: "הטיה ימינה ושמאלה כמו מטוטלת", defaultDuration: 2.0, cssKeyframe: "hsAnimComboSwing", cssTiming: "ease-in-out" },
  { id: "combo_heartbeat", labelHe: "פעימות לב", kind: "combo", category: "dynamic", descriptionHe: "פעימה כפולה מהירה כמו דופק", defaultDuration: 1.2, cssKeyframe: "hsAnimComboHeartbeat", cssTiming: "ease-in-out" },
  { id: "combo_wobble", labelHe: "עיוות גלי (Wobble)", kind: "combo", category: "dynamic", descriptionHe: "עיוות אלסטי צדדי", defaultDuration: 1.2, cssKeyframe: "hsAnimComboWobble", cssTiming: "ease-in-out" },
  { id: "combo_breathe", labelHe: "נשימה איטית", kind: "combo", category: "dynamic", descriptionHe: "זום איטי מאוד פנימה והחוצה", defaultDuration: 3.5, cssKeyframe: "hsAnimComboBreathe", cssTiming: "ease-in-out" },
  { id: "combo_glitch", labelHe: "גליץ' מהבהב", kind: "combo", category: "dynamic", descriptionHe: "הפרעות דיגיטליות וקפיצות מיקום", defaultDuration: 1.0, cssKeyframe: "hsAnimComboGlitch", cssTiming: "steps(2, start)" },
  { id: "combo_spin_slow", labelHe: "סיבוב איטי קבוע", kind: "combo", category: "dynamic", descriptionHe: "סיבוב רציף ב-360 מעלות", defaultDuration: 6.0, cssKeyframe: "hsAnimComboSpinSlow", cssTiming: "linear" },
  { id: "combo_bounce_loop", labelHe: "קפיצה מחזורית", kind: "combo", category: "dynamic", descriptionHe: "קפיצות קטנות ורצופות במקום", defaultDuration: 1.0, cssKeyframe: "hsAnimComboBounceLoop", cssTiming: "ease-in-out" },
  { id: "combo_zoom_rock", labelHe: "זום מתנדנד", kind: "combo", category: "dynamic", descriptionHe: "שילוב זום קל עם נדנוד קל", defaultDuration: 2.0, cssKeyframe: "hsAnimComboZoomRock", cssTiming: "ease-in-out" },
  { id: "combo_flicker", labelHe: "הבהוב אור", kind: "combo", category: "dynamic", descriptionHe: "הבהוב עדין של בהירות", defaultDuration: 1.5, cssKeyframe: "hsAnimComboFlicker", cssTiming: "linear" },
  { id: "combo_wave_tilt", labelHe: "גל והטיה", kind: "combo", category: "dynamic", descriptionHe: "תנועה גלית עם זווית הטיה משתנה", defaultDuration: 2.2, cssKeyframe: "hsAnimComboWaveTilt", cssTiming: "ease-in-out" },
  { id: "combo_rubber_band", labelHe: "גומייה אלסטית", kind: "combo", category: "dynamic", descriptionHe: "מתיחה אופקית ואנכית מתחלפת", defaultDuration: 1.4, cssKeyframe: "hsAnimComboRubberBand", cssTiming: "ease-in-out" },
  { id: "combo_pendulum", labelHe: "מטוטלת תלויה", kind: "combo", category: "dynamic", descriptionHe: "תנועת מטוטלת ממרכז החלק העליון", defaultDuration: 2.0, cssKeyframe: "hsAnimComboPendulum", cssTiming: "ease-in-out" },
] as const;

export const ANIMATION_KINDS: Array<{ id: AnimationKind; labelHe: string }> = [
  { id: "in", labelHe: "כניסה (In)" },
  { id: "out", labelHe: "יציאה (Out)" },
  { id: "combo", labelHe: "משולב (Combo)" },
];

export const ANIMATION_CATEGORIES: Array<{ id: AnimationCategory; labelHe: string }> = [
  { id: "zoom", labelHe: "זום והגדלה" },
  { id: "slide", labelHe: "החלקה ותזוזה" },
  { id: "rotate", labelHe: "סיבוב והיפוך" },
  { id: "bounce", labelHe: "קפיצה ואלסטיות" },
  { id: "fade", labelHe: "עמעום וטשטוש" },
  { id: "dynamic", labelHe: "תנועה דינמית" },
];

export function animationById(id: string | null | undefined): VisualAnimation | undefined {
  const key = String(id || "").trim().toLowerCase();
  if (!key) return undefined;
  return CLIP_ANIMATIONS.find((a) => a.id === key) || CLIP_ANIMATIONS.find((a) => a.labelHe === id);
}

export function animationsByKind(kind: AnimationKind): VisualAnimation[] {
  return CLIP_ANIMATIONS.filter((a) => a.kind === kind);
}

export function searchAnimations(query: string): VisualAnimation[] {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [...CLIP_ANIMATIONS];
  return CLIP_ANIMATIONS.filter((a) =>
    a.id.includes(q) || a.labelHe.includes(q) || a.kind.includes(q) || a.descriptionHe.includes(q),
  );
}
