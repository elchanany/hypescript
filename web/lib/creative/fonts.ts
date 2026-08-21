// קטלוג גופנים ואינטגרציית Google Fonts
//
// תמיכה מלאה בכל גופני Google Fonts, עם עדיפות עליונה לגופנים בעברית (Hebrew Subset).
// כולל טוען גופנים דינמי (Dynamic WebFont Loader) להזרקת הגופן ישירות ל-DOM של התצוגה המקדימה.
//
// המקור העיקרי הוא https://fonts.google.com/metadata/fonts — נקודת קצה ציבורית ללא
// מפתח, שחושפת את כל קטלוג Google Fonts (כ-1,942 משפחות, מתוכן כ-62 עם subset עברי).
// GOOGLE_FONTS_API_KEY (Developer API הרשמי) הוא שיפור אופציונלי בלבד; אסור שהיעדרו
// יגרום למסך "חסר מפתח" — המוצר חייב לעבוד במלואו בלעדיו.

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

/** מסננים גנריים המשותפים לקטלוג המובנה ולקטלוג המלא שמגיע מ-Google Fonts. */
export interface FontFilterOptions {
  query?: string;
  category?: FontCategory | "all";
  /** "hebrew" | "latin" | subset ספציפי אחר | "all" (ברירת מחדל: ללא סינון). */
  subset?: string;
}

export function filterFonts(fonts: readonly FontMetadata[], opts: FontFilterOptions = {}): FontMetadata[] {
  const q = String(opts.query || "").trim().toLowerCase();
  const subset = opts.subset && opts.subset !== "all" ? opts.subset : undefined;
  return fonts.filter((f) => {
    if (subset) {
      if (subset === "hebrew" ? !f.hebrew : !f.subsets.includes(subset)) return false;
    }
    if (opts.category && opts.category !== "all" && f.category !== opts.category) return false;
    if (!q) return true;
    return f.family.toLowerCase().includes(q) || (f.previewSampleHe && f.previewSampleHe.includes(q));
  });
}

export function searchCuratedFonts(query: string, category?: FontCategory | "all", hebrewOnly = false): FontMetadata[] {
  return filterFonts(CURATED_FONTS, { query, category, subset: hebrewOnly ? "hebrew" : "all" });
}

// ── Google Fonts Metadata (קטלוג מלא, ללא מפתח) ────────────────────────────

export const GOOGLE_FONTS_METADATA_URL = "https://fonts.google.com/metadata/fonts";

/** גוגל ממפה קטגוריה כ-"Sans Serif" וכד' — כאן ממפים לטיפוסי ה-FontCategory שלנו. */
const GOOGLE_CATEGORY_MAP: Record<string, FontCategory> = {
  "sans serif": "sans-serif",
  "serif": "serif",
  "display": "display",
  "handwriting": "handwriting",
  "monospace": "monospace",
};

function mapGoogleCategory(raw: unknown): FontCategory {
  const key = String(raw || "").trim().toLowerCase();
  return GOOGLE_CATEGORY_MAP[key] || "sans-serif";
}

interface RawGoogleFontFamily {
  family?: string;
  category?: string;
  subsets?: string[];
  fonts?: Record<string, unknown>;
  popularity?: number;
  defaultSort?: number;
}

interface RawGoogleFontsMetadata {
  familyMetadataList?: RawGoogleFontFamily[];
}

/**
 * גוגל לפעמים (לא תמיד, תלוי בקשה) מקדימה guard אנטי-hijacking לפני ה-JSON האמיתי
 * (כמו `)]}'`). חותכים מה-`{` הראשון כדי שזה יעבוד גם אם ה-guard קיים וגם אם לא —
 * במקום להניח על תבנית קבועה שעלולה להשתנות.
 */
export function stripXssiGuard(raw: string): string {
  const start = raw.indexOf("{");
  return start >= 0 ? raw.slice(start) : raw;
}

/** "menu" הוא subset פנימי של גוגל (טקסט הדוגמה בתפריט), לא שפה/כתב אמיתיים. */
const NON_LANGUAGE_SUBSETS = new Set(["menu"]);

export function parseGoogleFontsMetadata(raw: string): FontMetadata[] {
  let data: RawGoogleFontsMetadata;
  try {
    data = JSON.parse(stripXssiGuard(raw));
  } catch {
    return [];
  }
  const list = Array.isArray(data.familyMetadataList) ? data.familyMetadataList : [];
  const result: FontMetadata[] = [];
  for (const f of list) {
    if (!f.family) continue;
    const subsets = (f.subsets || []).filter((s) => !NON_LANGUAGE_SUBSETS.has(s));
    const variantKeys = f.fonts ? Object.keys(f.fonts) : [];
    result.push({
      family: f.family,
      category: mapGoogleCategory(f.category),
      hebrew: subsets.includes("hebrew"),
      variants: variantKeys.length ? variantKeys : ["400"],
      subsets,
      // popularity הוא דירוג (1 = הכי פופולרי); defaultSort הוא גיבוי כשהוא חסר.
      popularityRank: typeof f.popularity === "number" ? f.popularity
        : typeof f.defaultSort === "number" ? f.defaultSort
        : undefined,
    });
  }
  return result;
}

export function sortFontsByPopularity(fonts: readonly FontMetadata[]): FontMetadata[] {
  return [...fonts].sort((a, b) => {
    const ra = a.popularityRank ?? Number.MAX_SAFE_INTEGER;
    const rb = b.popularityRank ?? Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return a.family.localeCompare(b.family);
  });
}

export interface GoogleFontsCatalogResult {
  fonts: FontMetadata[];
  /** "live" = הגיע עכשיו מגוגל. "cache" = קאש (טרי או ישן-אך-עדיף-על-כלום בכשל רשת). */
  source: "live" | "cache";
  error?: string;
}

interface GoogleFontsCacheEntry {
  fonts: FontMetadata[];
  fetchedAt: number;
}

let googleFontsCache: GoogleFontsCacheEntry | null = null;

/** קטלוג גופנים כמעט ולא משתנה בין שעה לשעה — קאש ל-24 שעות חוסך אלפי בקשות. */
export const GOOGLE_FONTS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * שולף את קטלוג הגופנים המלא של גוגל (ללא מפתח), עם קאש בזיכרון בצד השרת.
 * בכשל רשת: אם יש קאש ישן — עדיף להחזיר אותו מאשר ליפול לרשימה המצומצמת.
 */
export async function fetchGoogleFontsCatalog(opts: { ttlMs?: number; force?: boolean } = {}): Promise<GoogleFontsCatalogResult> {
  const ttl = opts.ttlMs ?? GOOGLE_FONTS_CACHE_TTL_MS;
  const now = Date.now();
  if (!opts.force && googleFontsCache && now - googleFontsCache.fetchedAt < ttl) {
    return { fonts: googleFontsCache.fonts, source: "cache" };
  }
  try {
    const res = await fetch(GOOGLE_FONTS_METADATA_URL, { next: { revalidate: 86400 } } as RequestInit);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.text();
    const parsed = sortFontsByPopularity(parseGoogleFontsMetadata(raw));
    if (!parsed.length) throw new Error("קטלוג ריק אחרי parsing");
    googleFontsCache = { fonts: parsed, fetchedAt: now };
    return { fonts: parsed, source: "live" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (googleFontsCache) return { fonts: googleFontsCache.fonts, source: "cache", error: message };
    return { fonts: [], source: "cache", error: message };
  }
}

/** מאפס את הקאש בין טסטים — לא לשימוש בקוד המוצר. */
export function __resetGoogleFontsCacheForTests(): void {
  googleFontsCache = null;
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
