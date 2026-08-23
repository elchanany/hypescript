import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const spinnerSrc = readFileSync(new URL("./HypescriptBrandSpinner.tsx", import.meta.url), "utf8");
const heroSrc = readFileSync(new URL("../app/welcome/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

describe("HypescriptBrandSpinner & Hero 3D Card", () => {
  it("defines size mappings and authentic brain-play mark references", () => {
    expect(spinnerSrc).toContain("/brand/icons/icon-512.png");
    expect(spinnerSrc).toContain("/brand/icons/icon-256.png");
    expect(spinnerSrc).toContain("hsx-hero-icon-card");
    expect(spinnerSrc).toContain("hsx-brand-spinner");
  });

  it("integrates the giant 3D hero icon card into welcome page", () => {
    expect(heroSrc).toContain("<HypescriptBrandSpinner size=\"hero\" showCard priority />");
    expect(heroSrc).toContain("marketing-hero-header");
    expect(heroSrc).toContain("marketing-hero-visual");
  });

  it("provides full CSS animations and styling in globals.css", () => {
    expect(css).toContain(".hsx-brand-spinner");
    expect(css).toContain(".hsx-hero-icon-card");
    expect(css).toContain("@keyframes hsx-halo-rotate");
    expect(css).toContain("@keyframes hsx-brand-breathe");
    expect(css).toContain("@keyframes hsx-hero-brain-float");
  });
});
