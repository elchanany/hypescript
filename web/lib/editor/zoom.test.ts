import { describe, it, expect } from "vitest";
import { nextZoom, scrollLeftAfterZoom, zoomFactorFromWheel } from "./zoom";
import { ZOOM_MAX, ZOOM_MIN } from "./time";

describe("timeline zoom", () => {
  it("wheel up zooms in, down zooms out, with per-event damping", () => {
    expect(zoomFactorFromWheel(-100)).toBeGreaterThan(1);
    expect(zoomFactorFromWheel(100)).toBeLessThan(1);
    expect(zoomFactorFromWheel(-5000, true)).toBeLessThanOrEqual(1.12);
    expect(zoomFactorFromWheel(5000, true)).toBeGreaterThanOrEqual(0.89);
  });

  it("can still reach clamp bounds over many steps", () => {
    let z = 1;
    for (let i = 0; i < 120; i++) z = nextZoom(z, -80, true);
    expect(z).toBe(ZOOM_MAX);
    z = 1;
    for (let i = 0; i < 120; i++) z = nextZoom(z, 80, true);
    expect(z).toBe(ZOOM_MIN);
  });

  it("keeps the pointed position stable after zoom", () => {
    const next = scrollLeftAfterZoom({
      oldZoom: 1, newZoom: 2, scrollLeft: 100, clientX: 200, containerLeft: 0, scrollWidth: 1000,
    });
    expect(next).toBeCloseTo(400, 5);
  });
});
