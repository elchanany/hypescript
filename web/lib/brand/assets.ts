// Single source of truth for Hypescript brand asset paths.

export const BRAND_NAME = "Hypescript";
export const BRAND_NAME_HE = "Hypescript";
export const BRAND_TAGLINE_HE = "עריכת וידאו מקצועית עם סוכן AI מובנה";
export const BRAND_TAGLINE_EN = "AI-powered video editing with professional manual controls";

export const BRAND_PATHS = {
  icon: "/brand/hypescript-icon.png",
  horizontal: "/brand/hypescript-logo-horizontal.png",
  dark: "/brand/hypescript-logo-dark.png",
  light: "/brand/hypescript-logo-light.png",
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
    xs: { w: 16, h: 16 },
    sm: { w: 24, h: 24 },
    md: { w: 28, h: 28 },
    lg: { w: 40, h: 40 },
    xl: { w: 64, h: 64 },
  },
  horizontal: {
    xs: { w: 96, h: 28 },
    sm: { w: 128, h: 36 },
    md: { w: 168, h: 48 },
    lg: { w: 220, h: 64 },
    xl: { w: 280, h: 80 },
  },
};

export function brandSrc(variant: BrandVariant, theme: BrandTheme = "auto"): string {
  if (variant === "icon") return BRAND_PATHS.icon;
  if (theme === "light") return BRAND_PATHS.light;
  if (theme === "dark") return BRAND_PATHS.dark;
  return BRAND_PATHS.horizontal;
}
