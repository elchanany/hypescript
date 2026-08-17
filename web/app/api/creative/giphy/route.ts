import { NextResponse } from "next/server";
import { GiphyAssetItem, STARTER_STICKERS } from "@/lib/creative/giphy";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";
  const type = searchParams.get("type") || "stickers"; // stickers, gifs, emojis
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "24", 10)));
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

  const apiKey = process.env.GIPHY_API_KEY;

  if (apiKey) {
    try {
      const endpoint = query ? "search" : "trending";
      const targetType = type === "gifs" ? "gifs" : "stickers";
      const url = new URL(`https://api.giphy.com/v1/${targetType}/${endpoint}`);
      url.searchParams.set("api_key", apiKey);
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("offset", String(offset));
      url.searchParams.set("rating", "g");
      if (query) url.searchParams.set("q", query);

      const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
      if (res.ok) {
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
          attribution: "Powered by GIPHY",
        });
      }
    } catch (err) {
      console.warn("GIPHY API fetch failed, falling back to starter stickers:", err);
    }
  }

  // Fallback to starter stickers
  const q = query.toLowerCase();
  const filtered = STARTER_STICKERS.filter((s) => !q || s.title.toLowerCase().includes(q));
  return NextResponse.json({
    source: "starter_fallback",
    items: filtered,
    pagination: { total_count: filtered.length, count: filtered.length, offset: 0 },
    hasApiKey: !!apiKey,
    attribution: "Powered by GIPHY",
  });
}
