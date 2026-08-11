import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://hypescript.vercel.app";
  return {
    rules: [
      { userAgent: "*", allow: ["/welcome", "/legal/"], disallow: ["/api/", "/account", "/dashboard", "/settings"] },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
