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

  it("keeps the lane point under the pointer stable (accounts for gutter)", () => {
    const portWidth = 1000;
    const gutter = TIMELINE_GUTTER;
    const oldZoom = 1;
    const newZoom = 2;
    const scrollLeft = 0;
    // pointer over lane, 200px into the lane area
    const pointerInPort = gutter + 200;
    const next = scrollLeftAfterZoom({
      oldZoom, newZoom, scrollLeft,
      clientX: pointerInPort, containerLeft: 0, portWidth, gutter,
    });
    const oldLaneW = portWidth * oldZoom - gutter;
    const newLaneW = portWidth * newZoom - gutter;
    const frac = 200 / oldLaneW;
    const expected = gutter + frac * newLaneW - pointerInPort;
    expect(next).toBeCloseTo(expected, 5);
  });

  it("does not push playhead-at-zero under the gutter when zooming in at lane start", () => {
    const portWidth = 800;
    const gutter = TIMELINE_GUTTER;
    // pointer just at the lane start (right edge of headers)
    const next = scrollLeftAfterZoom({
      oldZoom: 1, newZoom: 4, scrollLeft: 0,
      clientX: gutter, containerLeft: 0, portWidth, gutter,
    });
    // playhead at t=0 sits at contentX=gutter; with this scroll it stays at viewport=gutter
    expect(next).toBe(0);
  });
});
