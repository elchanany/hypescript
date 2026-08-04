import { describe, expect, it } from "vitest";
import { BRAND_NAME, BRAND_PATHS, BRAND_SIZE_PX, brandSrc } from "./assets";
import { existsSync } from "fs";
import { join } from "path";

const publicDir = join(__dirname, "../../public");

describe("brand assets", () => {
  it("keeps product name stable", () => {
    expect(BRAND_NAME).toBe("Hypescript");
  });

  it("resolves icon and theme variants", () => {
    expect(brandSrc("icon")).toBe(BRAND_PATHS.icon);
    expect(brandSrc("horizontal", "light")).toBe(BRAND_PATHS.light);
    expect(brandSrc("horizontal", "dark")).toBe(BRAND_PATHS.dark);
  });

  it("defines non-zero sizes for all variants", () => {
    for (const variant of ["icon", "horizontal"] as const) {
      for (const size of ["xs", "sm", "md", "lg", "xl"] as const) {
        const dim = BRAND_SIZE_PX[variant][size];
        expect(dim.w).toBeGreaterThan(0);
        expect(dim.h).toBeGreaterThan(0);
      }
    }
  });

  it("ships required public files", () => {
    const required = [
      "brand/hypescript-icon.png",
      "brand/hypescript-logo-horizontal.png",
      "brand/hypescript-logo-dark.png",
      "brand/hypescript-logo-light.png",
      "brand/icons/icon-16.png",
      "brand/icons/icon-32.png",
      "brand/icons/icon-192.png",
      "brand/icons/icon-512.png",
      "brand/icons/icon-maskable-192.png",
      "brand/icons/icon-maskable-512.png",
      "brand/social/open-graph.png",
      "favicon-16.png",
      "favicon-32.png",
      "apple-touch-icon.png",
      "manifest.webmanifest",
    ];
    for (const rel of required) {
      expect(existsSync(join(publicDir, rel)), `missing ${rel}`).toBe(true);
    }
  });
});
