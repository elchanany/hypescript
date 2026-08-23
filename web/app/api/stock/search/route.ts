// חיפוש מדיה חופשית — GET /api/stock/search?provider=&kind=&query=&per_page=
// המפתחות נקראים ב-env בצד השרת בלבד; התשובה לעולם לא כוללת חומר מפתח.
// שגיאות מוחזרות כ-{error: <code>} לפי מערכת הקודים של הפרויקט.

import { NextRequest, NextResponse } from "next/server";
import {
  StockError,
  clampStockPerPage,
  isKindSupported,
  parseStockProvider,
  searchStock,
} from "@/lib/stock/providers";

export const runtime = "nodejs";

const STATUS_BY_CODE: Record<string, number> = {
  stock_bad_request: 400,
  stock_not_configured: 503,
  stock_search_failed: 502,
};

function errorResponse(err: unknown) {
  const code = err instanceof StockError ? err.code : "stock_search_failed";
  const status = STATUS_BY_CODE[code] ?? 502;
  const message =
    code === "stock_not_configured"
      ? "חיפוש המדיה אינו מחובר — חסר מפתח API של הספק. ניתן להגדיר אותו ב-web/.env.local."
      : code === "stock_bad_request"
        ? "בקשת החיפוש אינה תקינה."
        : "החיפוש מול ספק המדיה נכשל. אפשר לנסות שוב בעוד רגע.";
  return NextResponse.json({ items: [], error: code, message }, { status });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider") || "";
  const kind = searchParams.get("kind") || "";
  const query = (searchParams.get("query") || "").trim();
  const perPage = clampStockPerPage(searchParams.get("per_page"));

  if (!parseStockProvider(provider)) return errorResponse(new StockError("stock_bad_request", "provider"));
  if (!isKindSupported(provider as never, kind)) {
    return errorResponse(new StockError("stock_bad_request", "kind"));
  }
  if (!query) return errorResponse(new StockError("stock_bad_request", "query"));

  try {
    const { items } = await searchStock({ provider, kind, query, perPage });
    return NextResponse.json({ items });
  } catch (err: unknown) {
    console.warn(`stock search failed (${provider}/${kind}):`, err);
    return errorResponse(err);
  }
}
