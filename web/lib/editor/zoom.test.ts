import { describe, it, expect } from "vitest";
import { nextZoom, scrollLeftAfterZoom, zoomFactorFromWheel } from "./zoom";
import { ZOOM_MAX, ZOOM_MIN } from "./time";

describe("timeline zoom", () => {
  it("wheel up zooms in, down zooms out, clamped", () => {
    expect(zoomFactorFromWheel(-100)).toBeGreaterThan(1);
    expect(zoomFactorFromWheel(100)).toBeLessThan(1);
    expect(nextZoom(1, -5000)).toBeLessThanOrEqual(ZOOM_MAX);
    expect(nextZoom(1, 5000)).toBeGreaterThanOrEqual(ZOOM_MIN);
  });

  it("keeps the pointed position stable after zoom", () => {
    // content 1000px, zoom 1→2, pointer at 200 from left, scroll 100 → content offset 300
    const next = scrollLeftAfterZoom({
      oldZoom: 1, newZoom: 2, scrollLeft: 100, clientX: 200, containerLeft: 0, scrollWidth: 1000,
    });
    // new width 2000, ratio 0.3 → 600 - 200 = 400
    expect(next).toBeCloseTo(400, 5);
  });
});
