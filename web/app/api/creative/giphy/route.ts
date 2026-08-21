import { NextResponse } from "next/server";
import { GiphyAssetItem, STARTER_STICKERS } from "@/lib/creative/giphy";
import { isHebrewQuery, translateSearchQuery } from "@/lib/creative/hebrewSearchTerms";

function starterFallback(query: string, hasApiKey: boolean, error?: string) {
  const q = query.toLowerCase();
  const filtered = STARTER_STICKERS.filter((s) => !q || s.title.toLowerCase().includes(q));
  return NextResponse.json({
    source: "starter_fallback",
    items: filtered,
    pagination: { total_count: filtered.length, count: filtered.length, offset: 0 },
    hasApiKey,
    error,
    attribution: "Powered by GIPHY",
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";
  const type = searchParams.get("type") || "stickers"; // stickers, gifs, emojis
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "24", 10)));
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

  const apiKey = process.env.GIPHY_API_KEY;

  // GIPHY_API_KEY לא מוגדר — זה מצב אמיתי ("לא מחובר"), לא כשל רשת. GIPHY דורש
  // מפתח באמת (בניגוד ל-Google Fonts/Iconify) — אין דרך עוקפת, ולכן מציגים
  // בכנות את ה-Starter Pack המובנה בלבד, בלי להעמיד פנים שיש חיבור חי.
  if (!apiKey) {
    return starterFallback(query, false);
  }

  try {
    // GIPHY, כמו Iconify, מתייג באנגלית בלבד. שאילתה עברית שאין לה תרגום מוכר
    // תיפול ל-trending במקום להחזיר רשימה ריקה בלי שום הסבר.
    const englishQuery = translateSearchQuery(query);
    const endpoint = englishQuery ? "search" : "trending";
    const targetType = type === "gifs" ? "gifs" : "stickers";
    const url = new URL(`https://api.giphy.com/v1/${targetType}/${endpoint}`);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("rating", "g");
    if (englishQuery) url.searchParams.set("q", englishQuery);

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) {
      return starterFallback(query, true, `GIPHY החזיר HTTP ${res.status}`);
    }

    const untranslated = isHebrewQuery(query) && !englishQuery ? query : undefined;
    const data = await res.json();
    const items: GiphyAssetItem[] = (data.data || []).map((item: any) => ({
      id: item.id,
      title: item.title || "GIPHY Asset",
      type: targetType === "gifs" ? "gif" : "sticker",
      previewUrl: item.images?.fixed_height_small?.url || item.images?.fixed_width?.url || item.images?.original?.url,
      fullUrl: item.images?.original?.url || item.images?.fixed_height?.url,
      width: parseInt(item.images?.original?.width || "200", 10),
      height: parseInt(item.images?.original?.height || "200", 10),
      isTransparent: targetType === "stickers",
    }));

    return NextResponse.json({
      source: "giphy_api",
      items,
      pagination: data.pagination,
      hasApiKey: true,
      translatedQuery: englishQuery && englishQuery !== query ? englishQuery : undefined,
      untranslatedQuery: untranslated,
      noteHe: untranslated
        ? "GIPHY מתייג באנגלית בלבד, ולכן מוצג כאן התוכן הפופולרי. נסה מונח באנגלית לחיפוש מדויק."
        : undefined,
      attribution: "Powered by GIPHY",
    });
  } catch (err) {
    console.warn("GIPHY API fetch failed, falling back to starter stickers:", err);
    return starterFallback(query, true, err instanceof Error ? err.message : String(err));
  }
}
