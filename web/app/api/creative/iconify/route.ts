import { NextResponse } from "next/server";
import { CURATED_VECTOR_ELEMENTS, searchVectorElements } from "@/lib/creative/iconify";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";
  const limit = Math.min(60, Math.max(1, parseInt(searchParams.get("limit") || "32", 10)));

  if (query) {
    try {
      // Iconify public search API
      const res = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=${limit}`, {
        next: { revalidate: 86400 },
      });
      if (res.ok) {
        const data = await res.json();
        const icons: string[] = data.icons || [];
        const collections: Record<string, any> = data.collections || {};

        const items = icons.map((fullIconName) => {
          const [prefix, name] = fullIconName.split(":");
          const coll = collections[prefix] || {};
          return {
            id: fullIconName,
            nameHe: name.replace(/-/g, " "),
            category: "ui",
            iconSet: coll.name || prefix,
            license: coll.license?.title || coll.license?.spdx || "Open Source",
            svgUrl: `https://api.iconify.design/${prefix}/${name}.svg`,
          };
        });

        return NextResponse.json({
          source: "iconify_api",
          items,
          total: data.total || icons.length,
        });
      }
    } catch (err) {
      console.warn("Iconify search API failed, falling back to curated elements:", err);
    }
  }

  // Fallback to built-in vector elements
  const items = searchVectorElements(query);
  return NextResponse.json({
    source: "curated_fallback",
    items,
    total: items.length,
  });
}
