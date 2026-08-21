import { NextResponse } from "next/server";
import {
  FontCategory, FontMetadata,
  fetchGoogleFontsCatalog, filterFonts, searchCuratedFonts,
} from "@/lib/creative/fonts";

// ── Google Fonts Developer API (רשמי, דורש מפתח) ────────────────────────────
// זהו שיפור אופציונלי בלבד: מוסיף מיון "trending" רשמי. הקטלוג המלא (1,942
// משפחות, כולל כל הגופנים בעברית) זמין גם בלעדיו דרך fetchGoogleFontsCatalog.
interface GoogleWebfontItem {
  family: string;
  category: string;
  variants: string[];
  subsets: string[];
}

let cachedOfficialFonts: GoogleWebfontItem[] | null = null;
let officialCacheTime = 0;
const OFFICIAL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function fetchOfficialGoogleFonts(apiKey: string, sort: string): Promise<GoogleWebfontItem[] | null> {
  const now = Date.now();
  if (cachedOfficialFonts && now - officialCacheTime < OFFICIAL_CACHE_TTL_MS) {
    return cachedOfficialFonts;
  }
  const res = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=${encodeURIComponent(sort)}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data.items)) return null;
  cachedOfficialFonts = data.items;
  officialCacheTime = now;
  return cachedOfficialFonts;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";
  const subset = searchParams.get("subset") || "hebrew"; // ברירת מחדל: עברית קודם — זה עורך וידאו בעברית
  const category = (searchParams.get("category") || "all") as FontCategory | "all";
  const sort = searchParams.get("sort") || "popularity";

  const apiKey = process.env.GOOGLE_FONTS_API_KEY;

  // שיפור אופציונלי: אם מוגדר מפתח, ננסה קודם את ה-API הרשמי (למשל למיון trending מדויק).
  if (apiKey) {
    try {
      const items = await fetchOfficialGoogleFonts(apiKey, sort);
      if (items) {
        const formatted: FontMetadata[] = items.map((f) => ({
          family: f.family,
          category: (f.category as FontCategory) || "sans-serif",
          hebrew: f.subsets.includes("hebrew"),
          variants: f.variants,
          subsets: f.subsets,
        }));
        const results = filterFonts(formatted, { query, category, subset });
        return NextResponse.json({ source: "google_fonts_api", items: results, total: results.length });
      }
    } catch (err) {
      console.warn("Google Fonts Developer API נכשל, ממשיכים לקטלוג ה-metadata החינמי:", err);
    }
  }

  // מקור ראשי: נקודת הקצה הציבורית של Google Fonts — ללא מפתח, כל 1,942 המשפחות.
  const { fonts: fullCatalog, source, error } = await fetchGoogleFontsCatalog();
  if (fullCatalog.length > 0) {
    const results = filterFonts(fullCatalog, { query, category, subset });
    return NextResponse.json({
      source: "google_fonts_metadata",
      items: results,
      total: results.length,
      totalCatalog: fullCatalog.length,
      live: source === "live",
    });
  }

  // רשת נפלה לגמרי ואין אפילו קאש ישן — גיבוי אחרון: הרשימה המובנית המצומצמת.
  const curated = searchCuratedFonts(query, category, subset === "hebrew");
  return NextResponse.json({
    source: "curated_fallback",
    items: curated,
    total: curated.length,
    error,
  });
}
