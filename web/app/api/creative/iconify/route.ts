import { NextResponse } from "next/server";
import {
  IconCategory, fetchIconifyCollections, searchIconifyIcons, searchVectorElements,
} from "@/lib/creative/iconify";
import { isHebrewQuery, translateSearchQuery } from "@/lib/creative/hebrewSearchTerms";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";
  const limit = Math.min(60, Math.max(1, parseInt(searchParams.get("limit") || "32", 10)));
  const category = (searchParams.get("category") || "all") as IconCategory | "all";

  // מצב "collections": רשימת כל 236 חבילות האייקונים עם הרישיון של כל אחת —
  // לשימושים כמו הצגת/בחירת חבילה, ולא לחיפוש אייקון בודד.
  if (searchParams.get("mode") === "collections") {
    const result = await fetchIconifyCollections();
    return NextResponse.json({
      source: result.error ? "curated_fallback" : "iconify_collections",
      collections: result.collections,
      total: result.collections.length,
      live: result.source === "live",
      error: result.error,
    });
  }

  if (query) {
    // Iconify מחפש באנגלית בלבד. בלי התרגום הזה כל חיפוש טבעי בעברית ("חץ",
    // "לב") היה מחזיר רשימה ריקה, מה שנראה כמו שירות תקול ולא כמו מגבלת שפה.
    const englishQuery = translateSearchQuery(query);
    if (!englishQuery) {
      const items = searchVectorElements(query, category);
      return NextResponse.json({
        source: "curated_fallback",
        items,
        total: items.length,
        untranslatedQuery: isHebrewQuery(query) ? query : undefined,
        noteHe: isHebrewQuery(query)
          ? "ספריית האייקונים החיצונית מחפשת באנגלית. נסה מונח באנגלית, או אחד מהאלמנטים המובנים שמוצגים כאן."
          : undefined,
      });
    }
    try {
      const result = await searchIconifyIcons(englishQuery, limit);
      if (result.items.length > 0) {
        return NextResponse.json({
          source: "iconify_api", items: result.items, total: result.total,
          translatedQuery: englishQuery !== query ? englishQuery : undefined,
        });
      }
    } catch (err) {
      console.warn("Iconify search נכשל, נופלים לרשימת האלמנטים המובנית:", err);
      const items = searchVectorElements(query, category);
      return NextResponse.json({
        source: "curated_fallback",
        items,
        total: items.length,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ללא שאילתה: הקטלוג המובנה (16+ אייקונים אוצרים) הוא הבסיס — עדיף על גלישה
  // עיוורת בין 334,000 אייקונים בלי שום דירוג רלוונטיות.
  const items = searchVectorElements(query, category);
  return NextResponse.json({ source: "curated_fallback", items, total: items.length });
}
