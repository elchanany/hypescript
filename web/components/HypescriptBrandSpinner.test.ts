import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const spinnerSrc = readFileSync(new URL("./HypescriptBrandSpinner.tsx", import.meta.url), "utf8");
const vectorSrc = readFileSync(new URL("./HypescriptBrainPlayVector.tsx", import.meta.url), "utf8");
const heroSrc = readFileSync(new URL("../app/welcome/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

describe("HypescriptBrandSpinner & Animated Vector Anatomy", () => {
  it("defines vector anatomy with lobes, neural grooves, and central playhead", () => {
    expect(vectorSrc).toContain("lobe-left");
    expect(vectorSrc).toContain("lobe-right");
    expect(vectorSrc).toContain("hsx-pulse-path");
    expect(vectorSrc).toContain("hsx-play-triangle");
    expect(vectorSrc).toContain("hsx-synapse-nodes");
    expect(spinnerSrc).toContain("HypescriptBrainPlayVector");
    expect(spinnerSrc).toContain("hsx-hero-icon-card");
    expect(spinnerSrc).toContain("hsx-brand-spinner");
  });

  it("integrates the giant 3D hero icon card into welcome page", () => {
    expect(heroSrc).toContain("<HypescriptBrandSpinner size=\"hero\" showCard priority />");
    expect(heroSrc).toContain("marketing-hero-header");
    expect(heroSrc).toContain("marketing-hero-visual");
  });

  it("provides full vector anatomical CSS animations and styling in globals.css", () => {
    expect(css).toContain(".hsx-brain-vector");
    expect(css).toContain(".hsx-hero-icon-card");
    expect(css).toContain("@keyframes hsx-lobe-breathe-left");
    expect(css).toContain("@keyframes hsx-lobe-breathe-right");
    expect(css).toContain("@keyframes hsx-neural-laser");
    expect(css).toContain("@keyframes hsx-play-core-beat");
  });
});
