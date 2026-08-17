// קטלוג גופנים ואינטגרציית Google Fonts Developer API
//
// תמיכה מלאה בכל גופני Google Fonts, עם עדיפות עליונה לגופנים בעברית (Hebrew Subset).
// כולל טוען גופנים דינמי (Dynamic WebFont Loader) להזרקת הגופן ישירות ל-DOM של התצוגה המקדימה.

export type FontCategory = "sans-serif" | "serif" | "display" | "handwriting" | "monospace";

export interface FontMetadata {
  family: string;
  category: FontCategory;
  hebrew: boolean;       // האם תומך בעברית (עדיפות עליונה)
  variants: string[];    // "regular", "italic", "700", "bold", etc.
  subsets: string[];     // "hebrew", "latin", "latin-ext", etc.
  popularityRank?: number;
  previewSampleHe?: string;
  previewSampleEn?: string;
}

/**
 * רשימת גופנים מובנית ואיכותית הזמינה תמיד (גם Offline או ללא מפתח API).
 * בראש הרשימה — כל גופני Google Fonts התומכים בעברית.
 */
export const CURATED_FONTS: readonly FontMetadata[] = [
  // ── עברית: Sans-Serif מובילים ──────────────────────────────────────────
  {
    family: "Heebo",
    category: "sans-serif",
    hebrew: true,
    variants: ["100", "300", "400", "500", "700", "800", "900"],
    subsets: ["hebrew", "latin"],
    popularityRank: 1,
    previewSampleHe: "שלום עולם — גופן היבו נקי ומודרני",
  },
  {
    family: "Assistant",
    category: "sans-serif",
    hebrew: true,
    variants: ["200", "300", "400", "500", "600", "700", "800"],
    subsets: ["hebrew", "latin"],
    popularityRank: 2,
    previewSampleHe: "אסיסטנט — אלגנטי וקריא בכל גודל",
  },
  {
    family: "Rubik",
    category: "sans-serif",
    hebrew: true,
    variants: ["300", "400", "500", "600", "700", "800", "900"],
    subsets: ["hebrew", "latin", "cyrillic"],
    popularityRank: 3,
    previewSampleHe: "רוביק — גיאומטרי עם פינות רכות",
  },
  {
    family: "Varela Round",
    category: "sans-serif",
    hebrew: true,
    variants: ["400"],
    subsets: ["hebrew", "latin"],
    popularityRank: 4,
    previewSampleHe: "ורלה ראונד — עגול, חם וידידותי",
  },
  {
    family: "Alef",
    category: "sans-serif",
    hebrew: true,
    variants: ["400", "700"],
    subsets: ["hebrew", "latin"],
    popularityRank: 7,
    previewSampleHe: "אלף — גופן עברי פתוח ומסורתי",
  },
  {
    family: "Open Sans Hebrew",
    category: "sans-serif",
    hebrew: true,
    variants: ["300", "400", "700", "800"],
    subsets: ["hebrew", "latin"],
    popularityRank: 10,
    previewSampleHe: "אופן סאנס — סטנדרט הקריאות ברשת",
  },

  // ── עברית: Display & כותרות מודגשות ─────────────────────────────────────
  {
    family: "Secular One",
    category: "display",
    hebrew: true,
    variants: ["400"],
    subsets: ["hebrew", "latin"],
    popularityRank: 5,
    previewSampleHe: "סקולר וואן — כותרות עבות ובולטות",
  },
  {
    family: "Suez One",
    category: "display",
    hebrew: true,
    variants: ["400"],
    subsets: ["hebrew", "latin"],
    popularityRank: 8,
    previewSampleHe: "סואץ וואן — אותיות שמנות ומלאות נוכחות",
  },
  {
    family: "Karantina",
    category: "display",
    hebrew: true,
    variants: ["300", "400", "700"],
    subsets: ["hebrew", "latin"],
    popularityRank: 12,
    previewSampleHe: "קרנטינה — גופן צר וגבוה לכותרות",
  },
  {
    family: "Black And White Picture",
    category: "display",
    hebrew: true,
    variants: ["400"],
    subsets: ["hebrew", "latin"],
    popularityRank: 18,
    previewSampleHe: "סגנון גרפי ייחודי",
  },

  // ── עברית: Serif & מסורתי / יוקרתי ──────────────────────────────────────
  {
    family: "Frank Ruhl Libre",
    category: "serif",
    hebrew: true,
    variants: ["300", "400", "500", "700", "900"],
    subsets: ["hebrew", "latin"],
    popularityRank: 6,
    previewSampleHe: "פרנק ריהל — אות הדפוס העברית הקלאסית",
  },
  {
    family: "David Libre",
    category: "serif",
    hebrew: true,
    variants: ["400", "500", "700"],
    subsets: ["hebrew", "latin"],
    popularityRank: 9,
    previewSampleHe: "דוד ליברה — מכובד, תורני ומסורתי",
  },
  {
    family: "Bellefair",
    category: "serif",
    hebrew: true,
    variants: ["400"],
    subsets: ["hebrew", "latin"],
    popularityRank: 11,
    previewSampleHe: "בלפייר — סריף דק, עדין ומלכותי",
  },
  {
    family: "Miriam Libre",
    category: "sans-serif",
    hebrew: true,
    variants: ["400", "700"],
    subsets: ["hebrew", "latin"],
    popularityRank: 13,
    previewSampleHe: "מרים ליברה — גופן מודרני מובהק",
  },

  // ── עברית: Handwriting & כתב יד ─────────────────────────────────────────
  {
    family: "Amatic SC",
    category: "handwriting",
    hebrew: true,
    variants: ["400", "700"],
    subsets: ["hebrew", "latin"],
    popularityRank: 14,
    previewSampleHe: "אמטיק — כתב יד קליל ועליז",
  },
  {
    family: "Mplus 1p",
    category: "sans-serif",
    hebrew: true,
    variants: ["100", "300", "400", "500", "700", "800", "900"],
    subsets: ["hebrew", "latin"],
    popularityRank: 15,
    previewSampleHe: "אמפלוס — אותיות ברורות וסדורות",
  },
  {
    family: "Cousine",
    category: "monospace",
    hebrew: true,
    variants: ["400", "700"],
    subsets: ["hebrew", "latin"],
    popularityRank: 16,
    previewSampleHe: "קוזין — גופן מונוספייס למחשבים וקוד",
  },
  {
    family: "Taviraj",
    category: "serif",
    hebrew: true,
    variants: ["100", "300", "400", "700"],
    subsets: ["hebrew", "latin"],
    popularityRank: 17,
    previewSampleHe: "טביראג' — סריף רחב ויציב",
  },

  // ── גופנים בינלאומיים מובילים (Latin Creators) ─────────────────────────
  {
    family: "Inter",
    category: "sans-serif",
    hebrew: false,
    variants: ["100", "300", "400", "600", "700", "900"],
    subsets: ["latin", "latin-ext", "cyrillic"],
    popularityRank: 20,
    previewSampleEn: "Inter — The modern UI creator font",
  },
  {
    family: "Roboto",
    category: "sans-serif",
    hebrew: false,
    variants: ["100", "300", "400", "500", "700", "900"],
    subsets: ["latin", "cyrillic"],
    popularityRank: 21,
    previewSampleEn: "Roboto — Modern and crisp",
  },
  {
    family: "Montserrat",
    category: "sans-serif",
    hebrew: false,
    variants: ["200", "400", "600", "700", "800", "900"],
    subsets: ["latin"],
    popularityRank: 22,
    previewSampleEn: "Montserrat — Geometric geometric beauty",
  },
  {
    family: "Poppins",
    category: "sans-serif",
    hebrew: false,
    variants: ["300", "400", "500", "600", "700", "800"],
    subsets: ["latin"],
    popularityRank: 23,
    previewSampleEn: "Poppins — Clean and rounded",
  },
  {
    family: "Oswald",
    category: "sans-serif",
    hebrew: false,
    variants: ["200", "400", "600", "700"],
    subsets: ["latin"],
    popularityRank: 24,
    previewSampleEn: "OSWALD — TIGHT IMPACT HEADLINES",
  },
  {
    family: "Bebas Neue",
    category: "display",
    hebrew: false,
    variants: ["400"],
    subsets: ["latin"],
    popularityRank: 25,
    previewSampleEn: "BEBAS NEUE — THE YOUTUBE THUMBNAIL FONT",
  },
  {
    family: "Anton",
    category: "display",
    hebrew: false,
    variants: ["400"],
    subsets: ["latin"],
    popularityRank: 26,
    previewSampleEn: "ANTON — ULTRA BOLD VIRAL HOOKS",
  },
  {
    family: "Playfair Display",
    category: "serif",
    hebrew: false,
    variants: ["400", "600", "700", "900"],
    subsets: ["latin"],
    popularityRank: 27,
    previewSampleEn: "Playfair — Luxurious and editorial",
  },
  {
    family: "Pacifico",
    category: "handwriting",
    hebrew: false,
    variants: ["400"],
    subsets: ["latin"],
    popularityRank: 28,
    previewSampleEn: "Pacifico — Fun brush script",
  },
];

export function getHebrewFonts(): FontMetadata[] {
  return CURATED_FONTS.filter((f) => f.hebrew);
}

export function searchCuratedFonts(query: string, category?: FontCategory | "all", hebrewOnly = false): FontMetadata[] {
  const q = String(query || "").trim().toLowerCase();
  return CURATED_FONTS.filter((f) => {
    if (hebrewOnly && !f.hebrew) return false;
    if (category && category !== "all" && f.category !== category) return false;
    if (!q) return true;
    return f.family.toLowerCase().includes(q) || (f.previewSampleHe && f.previewSampleHe.includes(q));
  });
}

const loadedFonts = new Set<string>();

/**
 * טוען גופן באופן דינמי ל-DOM בדפדפן כדי שהמשתמש יראה מיד את הגופן האמיתי.
 */
export function loadGoogleFont(family: string): void {
  if (typeof window === "undefined" || !family) return;
  const clean = family.trim();
  if (loadedFonts.has(clean)) return;

  try {
    const linkId = `gfont-${clean.replace(/\s+/g, "-").toLowerCase()}`;
    if (document.getElementById(linkId)) {
      loadedFonts.add(clean);
      return;
    }

    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(clean)}:ital,wght@0,300;0,400;0,500;0,700;0,900;1,400;1,700&display=swap`;
    document.head.appendChild(link);
    loadedFonts.add(clean);
  } catch (err) {
    console.warn("Failed to load Google Font dynamically:", family, err);
  }
}
