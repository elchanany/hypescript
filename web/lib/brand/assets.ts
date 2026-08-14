// Single source of truth for Hypescript brand asset paths.

export const BRAND_NAME = "Hypescript";
export const BRAND_NAME_HE = "Hypescript";
export const BRAND_TAGLINE_HE = "עורך הווידאו AI שפשוט מדברים איתו";
export const BRAND_TAGLINE_EN = "The AI video editor you simply talk to";

export const BRAND_PATHS = {
  // The 256px derivative keeps repeated UI logos crisp without shipping the 2K master.
  icon: "/brand/icons/icon-256.png",
  horizontal: "/brand/hypescript-logo-dark.png",
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
    xs: { w: 20, h: 20 },
    sm: { w: 30, h: 30 },
    md: { w: 36, h: 36 },
    lg: { w: 52, h: 52 },
    xl: { w: 80, h: 80 },
  },
  // Native raster lockup is 1272×256 (4.96875:1), including the AI-video descriptor.
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
