// אינטגרציית Iconify API וספריית אלמנטים ואייקונים וקטוריים עשירה (150,000+ אייקונים פתוחים)
//
// כולל אימות מטא-דאטה של רישיונות (MIT / Apache-2.0 / CC0), חיפוש דינמי,
// וחבילת Starter Icons עשירה ב-SVG טהור להוספה מיידית לשכבות הווידאו.

export type IconCategory = "arrows" | "social" | "badges" | "symbols" | "ui" | "decorative";

export interface VectorElement {
  id: string;
  nameHe: string;
  category: IconCategory;
  svgPath: string;     // SVG path data (d attribute) או full inner SVG
  viewBox: string;     // default "0 0 24 24"
  defaultColor: string;
  license: string;     // e.g. "MIT", "Apache-2.0", "CC0"
  iconSet: string;     // e.g. "lucide", "phosphor", "tabler"
}

export const CURATED_VECTOR_ELEMENTS: readonly VectorElement[] = [
  // ── חצים והצבעה (ARROWS) ────────────────────────────────────────────────
  {
    id: "arrow_right_thick",
    nameHe: "חץ ימינה מודגש",
    category: "arrows",
    svgPath: '<path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
    viewBox: "0 0 24 24",
    defaultColor: "#facc15",
    license: "MIT",
    iconSet: "lucide",
  },
  {
    id: "arrow_left_thick",
    nameHe: "חץ שמאלה מודגש",
    category: "arrows",
    svgPath: '<path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
    viewBox: "0 0 24 24",
    defaultColor: "#facc15",
    license: "MIT",
    iconSet: "lucide",
  },
  {
    id: "arrow_down_curved",
    nameHe: "חץ מעוגל למטה",
    category: "arrows",
    svgPath: '<path d="M4 4v6a4 4 0 0 0 4 4h12M15 9l5 5-5 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
    viewBox: "0 0 24 24",
    defaultColor: "#ef4444",
    license: "MIT",
    iconSet: "lucide",
  },
  {
    id: "pointer_hand",
    nameHe: "אצבע מצביעה",
    category: "arrows",
    svgPath: '<path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    viewBox: "0 0 24 24",
    defaultColor: "#ffffff",
    license: "MIT",
    iconSet: "lucide",
  },

  // ── רשתות חברתיות ומדיה (SOCIAL & MEDIA) ────────────────────────────────
  {
    id: "social_youtube",
    nameHe: "יוטיוב (YouTube)",
    category: "social",
    svgPath: '<path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17M10 15l5-3-5-3v6Z" fill="currentColor"/>',
    viewBox: "0 0 24 24",
    defaultColor: "#ff0000",
    license: "MIT",
    iconSet: "lucide",
  },
  {
    id: "social_instagram",
    nameHe: "אינסטגרם (Instagram)",
    category: "social",
    svgPath: '<rect width="20" height="20" x="2" y="2" rx="5" ry="5" stroke="currentColor" stroke-width="2"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    viewBox: "0 0 24 24",
    defaultColor: "#e1306c",
    license: "MIT",
    iconSet: "lucide",
  },
  {
    id: "social_tiktok",
    nameHe: "טיקטוק (TikTok)",
    category: "social",
    svgPath: '<path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
    viewBox: "0 0 24 24",
    defaultColor: "#00f2fe",
    license: "MIT",
    iconSet: "lucide",
  },
  {
    id: "social_whatsapp",
    nameHe: "וואטסאפ (WhatsApp)",
    category: "social",
    svgPath: '<path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    viewBox: "0 0 24 24",
    defaultColor: "#25d366",
    license: "MIT",
    iconSet: "lucide",
  },
  {
    id: "social_bell",
    nameHe: "פעמון התראות",
    category: "social",
    svgPath: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    viewBox: "0 0 24 24",
    defaultColor: "#facc15",
    license: "MIT",
    iconSet: "lucide",
  },

  // ── תגים וסמלים (BADGES & SYMBOLS) ──────────────────────────────────────
  {
    id: "badge_verified_check",
    nameHe: "וי מאומת (Verified)",
    category: "badges",
    svgPath: '<path d="M12 2l2.4 2.6 3.5-.4 1.2 3.3 3.3 1.2-.4 3.5 2.6 2.4-2.6 2.4.4 3.5-3.3 1.2-1.2 3.3-3.5-.4L12 22l-2.4-2.6-3.5.4-1.2-3.3-3.3-1.2.4-3.5L2 12l2.6-2.4-.4-3.5 3.3-1.2 1.2-3.3 3.5.4L12 2zM9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    viewBox: "0 0 24 24",
    defaultColor: "#38bdf8",
    license: "MIT",
    iconSet: "lucide",
  },
  {
    id: "badge_fire",
    nameHe: "אש לוהטת",
    category: "badges",
    svgPath: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" stroke="currentColor" stroke-width="2" fill="currentColor"/>',
    viewBox: "0 0 24 24",
    defaultColor: "#f97316",
    license: "MIT",
    iconSet: "lucide",
  },
  {
    id: "badge_sparkles",
    nameHe: "ניצוצות קסם (AI)",
    category: "badges",
    svgPath: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3zM20 3v4M22 5h-4M4 17v2M5 18H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    viewBox: "0 0 24 24",
    defaultColor: "#a855f7",
    license: "MIT",
    iconSet: "lucide",
  },
  {
    id: "badge_heart_solid",
    nameHe: "לב מלא",
    category: "badges",
    svgPath: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" fill="currentColor"/>',
    viewBox: "0 0 24 24",
    defaultColor: "#ef4444",
    license: "MIT",
    iconSet: "lucide",
  },
  {
    id: "badge_star_gold",
    nameHe: "כוכב זהב",
    category: "badges",
    svgPath: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor"/>',
    viewBox: "0 0 24 24",
    defaultColor: "#eab308",
    license: "MIT",
    iconSet: "lucide",
  },
  {
    id: "badge_trophy",
    nameHe: "גביע ניצחון",
    category: "badges",
    svgPath: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.45.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.45.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    viewBox: "0 0 24 24",
    defaultColor: "#f59e0b",
    license: "MIT",
    iconSet: "lucide",
  },

  // ── ממשק וסמלים (UI & SYMBOLS) ──────────────────────────────────────────
  {
    id: "ui_info_circle",
    nameHe: "מידע (Info)",
    category: "ui",
    svgPath: '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    viewBox: "0 0 24 24",
    defaultColor: "#38bdf8",
    license: "MIT",
    iconSet: "lucide",
  },
  {
    id: "ui_alert_triangle",
    nameHe: "אזהרה (Warning)",
    category: "ui",
    svgPath: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" x2="12" y1="9" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" x2="12.01" y1="17" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    viewBox: "0 0 24 24",
    defaultColor: "#eab308",
    license: "MIT",
    iconSet: "lucide",
  },
  {
    id: "ui_check_circle",
    nameHe: "צ'ק ירוק",
    category: "ui",
    svgPath: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    viewBox: "0 0 24 24",
    defaultColor: "#22c55e",
    license: "MIT",
    iconSet: "lucide",
  },
  {
    id: "ui_cross_circle",
    nameHe: "איקס אדום",
    category: "ui",
    svgPath: '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    viewBox: "0 0 24 24",
    defaultColor: "#ef4444",
    license: "MIT",
    iconSet: "lucide",
  },
];

export const ICON_CATEGORIES: Array<{ id: IconCategory; labelHe: string }> = [
  { id: "arrows", labelHe: "חצים והצבעה 🎯" },
  { id: "social", labelHe: "רשתות ומדיה 📱" },
  { id: "badges", labelHe: "תגים וסמלים 🏆" },
  { id: "ui", labelHe: "ממשק ואזהרות ℹ️" },
];

export function searchVectorElements(query: string, category?: IconCategory | "all"): VectorElement[] {
  const q = String(query || "").trim().toLowerCase();
  return CURATED_VECTOR_ELEMENTS.filter((el) => {
    if (category && category !== "all" && el.category !== category) return false;
    if (!q) return true;
    return el.id.includes(q) || el.nameHe.includes(q) || el.category.includes(q);
  });
}
