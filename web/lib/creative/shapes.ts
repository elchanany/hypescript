// קטלוג צורות גיאומטריות ודקורטיביות (Geometric & Decorative Shapes) - 25+ צורות בסגנון CapCut

export type ShapeCategory = "basic" | "speech" | "banners" | "arrows" | "frames";

export interface VectorShape {
  id: string;
  nameHe: string;
  category: ShapeCategory;
  svgContent: string;  // SVG markup (e.g. <rect ... />, <path ... />, <polygon ... />)
  viewBox: string;
  defaultFill: string;
  defaultStroke?: string;
  defaultStrokeWidth?: number;
}

export const VECTOR_SHAPES: readonly VectorShape[] = [
  // ── צורות בסיסיות (BASIC) ───────────────────────────────────────────────
  {
    id: "shape_rect",
    nameHe: "מלבן ישר",
    category: "basic",
    svgContent: '<rect x="2" y="2" width="20" height="20" rx="0" fill="currentColor"/>',
    viewBox: "0 0 24 24",
    defaultFill: "#3b82f6",
  },
  {
    id: "shape_rounded_rect",
    nameHe: "מלבן מעוגל",
    category: "basic",
    svgContent: '<rect x="2" y="2" width="20" height="20" rx="4" fill="currentColor"/>',
    viewBox: "0 0 24 24",
    defaultFill: "#10b981",
  },
  {
    id: "shape_pill",
    nameHe: "קפסולה (Pill)",
    category: "basic",
    svgContent: '<rect x="2" y="5" width="20" height="14" rx="7" fill="currentColor"/>',
    viewBox: "0 0 24 24",
    defaultFill: "#8b5cf6",
  },
  {
    id: "shape_circle",
    nameHe: "עיגול מושלם",
    category: "basic",
    svgContent: '<circle cx="12" cy="12" r="10" fill="currentColor"/>',
    viewBox: "0 0 24 24",
    defaultFill: "#ef4444",
  },
  {
    id: "shape_triangle",
    nameHe: "משולש",
    category: "basic",
    svgContent: '<polygon points="12 2 22 20 2 20" fill="currentColor"/>',
    viewBox: "0 0 24 24",
    defaultFill: "#f59e0b",
  },
  {
    id: "shape_star_5",
    nameHe: "כוכב 5 קצוות",
    category: "basic",
    svgContent: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor"/>',
    viewBox: "0 0 24 24",
    defaultFill: "#eab308",
  },
  {
    id: "shape_hexagon",
    nameHe: "משושה",
    category: "basic",
    svgContent: '<polygon points="12 2 21 7 21 17 12 22 3 17 3 7 12 2" fill="currentColor"/>',
    viewBox: "0 0 24 24",
    defaultFill: "#06b6d4",
  },
  {
    id: "shape_diamond",
    nameHe: "מעוין / יהלום",
    category: "basic",
    svgContent: '<polygon points="12 2 22 12 12 22 2 12 12 2" fill="currentColor"/>',
    viewBox: "0 0 24 24",
    defaultFill: "#ec4899",
  },

  // ── בלוני דיבור וקריאה (SPEECH BUBBLES) ──────────────────────────────────
  {
    id: "shape_speech_bubble_round",
    nameHe: "בלון דיבור מעוגל",
    category: "speech",
    svgContent: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" fill="currentColor"/>',
    viewBox: "0 0 24 24",
    defaultFill: "#ffffff",
  },
  {
    id: "shape_speech_rect",
    nameHe: "בלון דיבור מלבני",
    category: "speech",
    svgContent: '<path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8l-5 4v-4a2 2 0 0 1-1-1.7V6a2 2 0 0 1 2-2z" fill="currentColor"/>',
    viewBox: "0 0 24 24",
    defaultFill: "#ffffff",
  },
  {
    id: "shape_thought_cloud",
    nameHe: "ענן מחשבה",
    category: "speech",
    svgContent: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" fill="currentColor"/><circle cx="6" cy="21" r="1" fill="currentColor"/><circle cx="4" cy="22" r="0.5" fill="currentColor"/>',
    viewBox: "0 0 24 24",
    defaultFill: "#e2e8f0",
  },

  // ── סרטים ובאנרים (BANNERS) ─────────────────────────────────────────────
  {
    id: "shape_ribbon_banner",
    nameHe: "סרט באנר קלאסי",
    category: "banners",
    svgContent: '<path d="M4 6h16l-3 6 3 6H4l3-6-3-6z" fill="currentColor"/>',
    viewBox: "0 0 24 24",
    defaultFill: "#dc2626",
  },
  {
    id: "shape_tag_badge",
    nameHe: "תגית מחיר / מבצע",
    category: "banners",
    svgContent: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01" stroke="currentColor" stroke-width="2" fill="none"/>',
    viewBox: "0 0 24 24",
    defaultFill: "#f59e0b",
  },

  // ── מסגרות וקווים (FRAMES & DIVIDERS) ───────────────────────────────────
  {
    id: "shape_frame_corners",
    nameHe: "מסגרת פינות מיקוד",
    category: "frames",
    svgContent: '<path d="M3 8V3h5M21 8V3h-5M3 16v5h5M21 16v5h-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    viewBox: "0 0 24 24",
    defaultFill: "#38bdf8",
  },
  {
    id: "shape_dashed_box",
    nameHe: "מסגרת מקווקוות",
    category: "frames",
    svgContent: '<rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3" fill="none"/>',
    viewBox: "0 0 24 24",
    defaultFill: "#ffffff",
  },
  {
    id: "shape_divider_line_dots",
    nameHe: "קו מפריד עם נקודה",
    category: "frames",
    svgContent: '<line x1="2" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="currentColor"/><line x1="15" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="2"/>',
    viewBox: "0 0 24 24",
    defaultFill: "#d4d4d8",
  },
];

export const SHAPE_CATEGORIES: Array<{ id: ShapeCategory; labelHe: string }> = [
  { id: "basic", labelHe: "צורות יסוד 📐" },
  { id: "speech", labelHe: "בלוני דיבור 💬" },
  { id: "banners", labelHe: "באנרים וסרטים 🏷️" },
  { id: "frames", labelHe: "מסגרות וקווים 🖼️" },
];

export function searchShapes(query: string, category?: ShapeCategory | "all"): VectorShape[] {
  const q = String(query || "").trim().toLowerCase();
  return VECTOR_SHAPES.filter((s) => {
    if (category && category !== "all" && s.category !== category) return false;
    if (!q) return true;
    return s.id.includes(q) || s.nameHe.includes(q) || s.category.includes(q);
  });
}
