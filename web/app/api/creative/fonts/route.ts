import { NextResponse } from "next/server";
import { CURATED_FONTS, searchCuratedFonts } from "@/lib/creative/fonts";

interface GoogleWebfontItem {
  family: string;
  category: string;
  variants: string[];
  subsets: string[];
  version?: string;
  lastModified?: string;
}

let cachedGoogleFonts: GoogleWebfontItem[] | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";
  const subset = searchParams.get("subset") || "hebrew"; // default to hebrew
  const category = searchParams.get("category") || "all";
  const sort = searchParams.get("sort") || "popularity"; // popularity, trending, alpha, date

  const apiKey = process.env.GOOGLE_FONTS_API_KEY;

  if (apiKey) {
    try {
      const now = Date.now();
      if (!cachedGoogleFonts || now - cacheTime > CACHE_TTL_MS) {
        const res = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=${encodeURIComponent(sort)}`, {
          next: { revalidate: 86400 },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.items)) {
            cachedGoogleFonts = data.items;
            cacheTime = now;
          }
        }
      }

      if (cachedGoogleFonts) {
        let results = cachedGoogleFonts;
        if (subset && subset !== "all") {
          results = results.filter((f) => f.subsets.includes(subset));
        }
        if (category && category !== "all") {
          results = results.filter((f) => f.category === category);
        }
        if (query) {
          const q = query.toLowerCase();
          results = results.filter((f) => f.family.toLowerCase().includes(q));
        }

        const formatted = results.slice(0, 100).map((f) => ({
          family: f.family,
          category: f.category,
          hebrew: f.subsets.includes("hebrew"),
          variants: f.variants,
          subsets: f.subsets,
        }));

        return NextResponse.json({
          source: "google_fonts_api",
          items: formatted,
          total: results.length,
        });
      }
    } catch (err) {
      console.warn("Failed to fetch Google Fonts API, falling back to curated list:", err);
    }
  }

  // Fallback to built-in curated fonts
  const curated = searchCuratedFonts(query, category as any, subset === "hebrew");
  return NextResponse.json({
    source: "curated_fallback",
    items: curated,
    total: curated.length,
    hasApiKey: !!apiKey,
  });
}
