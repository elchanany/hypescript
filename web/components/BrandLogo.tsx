"use client";

import {
  BRAND_NAME,
  BRAND_SIZE_PX,
  BrandSize,
  BrandTheme,
  BrandVariant,
  brandSrc,
} from "@/lib/brand/assets";
import { useTheme } from "@/lib/theme/ThemeProvider";

interface Props {
  variant?: BrandVariant;
  size?: BrandSize;
  theme?: BrandTheme;
  priority?: boolean;
  className?: string;
  ariaLabel?: string;
  /** When true, hide from screen readers (parent already names the product). */
  decorative?: boolean;
}

export default function BrandLogo({
  variant = "icon",
  size = "md",
  theme = "auto",
  priority = false,
  className = "",
  ariaLabel,
  decorative = false,
}: Props) {
  const { resolved } = useTheme();
  const effective: BrandTheme =
    theme === "auto" ? (variant === "horizontal" ? resolved : "dark") : theme;
  const dim = BRAND_SIZE_PX[variant][size];
  const src = brandSrc(variant, effective);
  const alt = decorative ? "" : (ariaLabel || BRAND_NAME);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={dim.w}
      height={dim.h}
      className={`brand-logo brand-logo-${variant} brand-logo-${size} ${className}`.trim()}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      draggable={false}
      aria-hidden={decorative || undefined}
    />
  );
}
