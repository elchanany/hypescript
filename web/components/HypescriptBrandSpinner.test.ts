import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const spinnerSrc = readFileSync(new URL("./HypescriptBrandSpinner.tsx", import.meta.url), "utf8");
const icon3dSrc = readFileSync(new URL("./Hypescript3DIconAnimation.tsx", import.meta.url), "utf8");
const heroSrc = readFileSync(new URL("../app/welcome/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

describe("HypescriptBrandSpinner & 3D Clay Motion System", () => {
  it("defines 3D slices with left hemisphere, center play, and right hemisphere", () => {
    expect(icon3dSrc).toContain("slice-left");
    expect(icon3dSrc).toContain("slice-center");
    expect(icon3dSrc).toContain("slice-right");
    expect(icon3dSrc).toContain("hsx-3d-sheen-sweep");
    expect(spinnerSrc).toContain("Hypescript3DIconAnimation");
    expect(spinnerSrc).toContain("hsx-hero-icon-card");
    expect(spinnerSrc).toContain("hsx-brand-spinner");
  });

  it("integrates the giant 3D hero icon card into welcome page", () => {
    expect(heroSrc).toContain("<HypescriptBrandSpinner size=\"hero\" showCard priority />");
    expect(heroSrc).toContain("marketing-hero-header");
    expect(heroSrc).toContain("marketing-hero-visual");
  });

  it("provides full 3D slice motion animations and styling in globals.css", () => {
    expect(css).toContain(".hsx-3d-icon-stage");
    expect(css).toContain(".slice-left");
    expect(css).toContain(".slice-center");
    expect(css).toContain(".slice-right");
    expect(css).toContain("@keyframes hsx-3d-enter-left");
    expect(css).toContain("@keyframes hsx-3d-enter-right");
    expect(css).toContain("@keyframes hsx-3d-enter-center");
    expect(css).toContain("@keyframes hsx-3d-sheen");
  });
});
