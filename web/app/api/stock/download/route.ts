// הורדת קובץ מדיה מספק stock — POST {provider, id, url}.
// אבטחה: ה-URL מאומת מול רשימת hostnames סגורה לכל ספק (הגנת SSRF), כל
// הפניית redirect מאומתת מחדש, והבייטים זורמים דרך השרת — לעולם לא חושפים
// את המפתח. ב-Freesound ההורדה המקורית דורשת OAuth, ולכן מוחזר קובץ
// התצוגה המקדימה (MP3) עם X-Stock-Quality: preview.

import { NextRequest, NextResponse } from "next/server";
import {
  StockError,
  assertAllowedStockDownloadUrl,
  parseStockProvider,
} from "@/lib/stock/providers";

export const runtime = "nodejs";

const STATUS_BY_CODE: Record<string, number> = {
  stock_bad_request: 400,
  stock_search_failed: 502,
};

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 3;

function fallbackMime(url: URL): string {
  const ext = (url.pathname.split(".").pop() || "").toLowerCase();
  if (ext === "mp4") return "video/mp4";
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "png") return "image/png";
  return "image/jpeg";
}

function errorResponse(err: unknown) {
  const code = err instanceof StockError ? err.code : "stock_search_failed";
  const status = STATUS_BY_CODE[code] ?? 502;
  const message =
    code === "stock_bad_request"
      ? "כתובת ההורדה אינה מוכרת ונדחתה מסיבות אבטחה."
      : "הורדת הקובץ מספק המדיה נכשלה. אפשר לנסות שוב.";
  return NextResponse.json({ error: code, message }, { status });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const provider = parseStockProvider((body as any)?.provider);
  const id = typeof (body as any)?.id === "string" ? (body as any).id.trim() : "";
  const url = typeof (body as any)?.url === "string" ? (body as any).url.trim() : "";

  if (!provider || !id || !url) {
    return errorResponse(new StockError("stock_bad_request", "body"));
  }

  try {
    let currentUrl: string = url;
    let res: Response | undefined;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const parsed = assertAllowedStockDownloadUrl(provider, currentUrl);
      res = await fetch(currentUrl, { redirect: "manual" });
      if (!REDIRECT_STATUSES.has(res.status)) {
        if (!res.ok) throw new StockError("stock_search_failed", `HTTP ${res.status}`);
        const quality = provider === "freesound" ? "preview" : "full";
        return new NextResponse(res.body, {
          status: 200,
          headers: {
            "Content-Type": res.headers.get("content-type") || fallbackMime(parsed),
            "X-Stock-Quality": quality,
            "X-Stock-Id": id.replace(/[^\w.-]/g, "_"),
          },
        });
      }
      const location = res.headers.get("location");
      if (!location) break;
      currentUrl = new URL(location, currentUrl).toString();
    }
    throw new StockError("stock_search_failed");
  } catch (err: unknown) {
    console.warn(`stock download failed (${provider}/${id}):`, err);
    return errorResponse(err);
  }
}
