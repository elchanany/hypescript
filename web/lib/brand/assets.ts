// Single source of truth for Hypescript brand asset paths.

export const BRAND_NAME = "Hypescript";
export const BRAND_NAME_HE = "Hypescript";
export const BRAND_TAGLINE_HE = "עורך וידאו AI בעברית — מהרעיון לסרטון מוכן";
export const BRAND_TAGLINE_EN = "AI video editor for Hebrew creators, from first cut to final export";

export const BRAND_PATHS = {
  icon: "/brand/hypescript-mark-minimal.png",
  horizontal: "/brand/hypescript-wordmark-dark.svg",
  dark: "/brand/hypescript-wordmark-dark.svg",
  light: "/brand/hypescript-wordmark-light.svg",
  favicon16: "/favicon-16.png",
  favicon32: "/favicon-32.png",
  appleTouch: "/apple-touch-icon.png",
  openGraph: "/brand/social/open-graph.png",
  twitter: "/brand/social/twitter-card.png",
  icons: {
    16: "/brand/icons/icon-16.png",
    32: "/brand/icons/icon-32.png",
    48: "/brand/icons/icon-48.png",
    64: "/brand/icons/icon-64.png",
    96: "/brand/icons/icon-96.png",
    128: "/brand/icons/icon-128.png",
    180: "/brand/icons/icon-180.png",
    192: "/brand/icons/icon-192.png",
    256: "/brand/icons/icon-256.png",
    512: "/brand/icons/icon-512.png",
    maskable192: "/brand/icons/icon-maskable-192.png",
    maskable512: "/brand/icons/icon-maskable-512.png",
  },
} as const;

export type BrandVariant = "icon" | "horizontal";
export type BrandSize = "xs" | "sm" | "md" | "lg" | "xl";
export type BrandTheme = "auto" | "dark" | "light";

export const BRAND_SIZE_PX: Record<BrandVariant, Record<BrandSize, { w: number; h: number }>> = {
  icon: {
    xs: { w: 20, h: 20 },
    sm: { w: 30, h: 30 },
    md: { w: 36, h: 36 },
    lg: { w: 52, h: 52 },
    xl: { w: 80, h: 80 },
  },
  // Native SVG viewBox is 318×64 (4.96875:1), including the AI-video descriptor.
  horizontal: {
    xs: { w: 160, h: 32 },
    sm: { w: 225, h: 45 },
    md: { w: 300, h: 60 },
    lg: { w: 380, h: 76 },
    xl: { w: 460, h: 92 },
  },
};

export function brandSrc(variant: BrandVariant, theme: BrandTheme = "auto"): string {
  if (variant === "icon") return BRAND_PATHS.icon;
  if (theme === "light") return BRAND_PATHS.light;
  if (theme === "dark") return BRAND_PATHS.dark;
  return BRAND_PATHS.horizontal;
}
