import { describe, it, expect } from "vitest";
import { nextZoom, scrollLeftAfterZoom, zoomFactorFromWheel, TIMELINE_GUTTER } from "./zoom";
import { ZOOM_MAX, ZOOM_MIN } from "./time";

describe("timeline zoom", () => {
  it("wheel up zooms in, down zooms out, with soft per-burst damping", () => {
    expect(zoomFactorFromWheel(-100)).toBeGreaterThan(1);
    expect(zoomFactorFromWheel(100)).toBeLessThan(1);
    expect(zoomFactorFromWheel(-5000, true)).toBeLessThanOrEqual(1.4);
    expect(zoomFactorFromWheel(5000, true)).toBeGreaterThanOrEqual(0.72);
  });

  it("can still reach clamp bounds over many steps", () => {
    let z = 1;
    for (let i = 0; i < 80; i++) z = nextZoom(z, -80, true);
    expect(z).toBe(ZOOM_MAX);
    z = 1;
    for (let i = 0; i < 80; i++) z = nextZoom(z, 80, true);
    expect(z).toBe(ZOOM_MIN);
  });

  it("keeps scroll at 0 when zooming from the start — start stays at start", () => {
    const next = scrollLeftAfterZoom({
      oldZoom: 1, newZoom: 4, scrollLeft: 0, portWidth: 800, gutter: TIMELINE_GUTTER,
    });
    expect(next).toBe(0);
  });

  it("scales scroll by lane growth when already panned (left-edge time stays)", () => {
    const portWidth = 1000;
    const gutter = TIMELINE_GUTTER;
    const oldZoom = 1;
    const newZoom = 2;
    const scrollLeft = 200;
    const oldLaneW = portWidth * oldZoom - gutter;
    const newLaneW = portWidth * newZoom - gutter;
    const next = scrollLeftAfterZoom({
      oldZoom, newZoom, scrollLeft, portWidth, gutter,
    });
    expect(next).toBeCloseTo((scrollLeft / oldLaneW) * newLaneW, 5);
  });
});
