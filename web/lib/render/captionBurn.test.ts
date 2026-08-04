import { describe, it, expect } from "vitest";
import { captionLayoutForTarget, captionYFraction } from "./captionBurn";
import { DEFAULT_CAPTION_STYLE } from "@/lib/editor/captionStyle";
import { DEFAULT_TARGET } from "./graph";

describe("captionBurn layout", () => {
  const canvas = { width: 1920, height: 1080 };
  const target = DEFAULT_TARGET;

  it("maps positions to vertical fractions", () => {
    expect(captionYFraction("top")).toBeLessThan(0.2);
    expect(captionYFraction("center")).toBeCloseTo(0.5);
    expect(captionYFraction("bottom")).toBeGreaterThan(0.8);
  });

  it("scales font and box to target", () => {
    const layout = captionLayoutForTarget(DEFAULT_CAPTION_STYLE, canvas, target, 2);
    expect(layout.w).toBeGreaterThan(target.w * 0.7);
    expect(layout.x).toBeCloseTo(target.w / 2);
    expect(layout.y).toBeCloseTo(target.h * captionYFraction("bottom"));
    expect(layout.fontPx).toBeGreaterThan(10);
    expect(layout.h).toBeGreaterThan(layout.fontPx);
  });
});
