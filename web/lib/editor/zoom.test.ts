import { describe, it, expect } from "vitest";
import {
  nextZoom, scrollLeftAfterZoom, zoomFactorFromWheel, timelineContentWidth,
  TIMELINE_GUTTER, MIN_LANE_PX, effectiveZoomMin,
} from "./zoom";
import { ZOOM_MAX, ZOOM_MIN } from "./time";

describe("timeline zoom", () => {
  it("wheel up zooms in, down zooms out, with soft per-burst damping", () => {
    expect(zoomFactorFromWheel(-100)).toBeGreaterThan(1);
    expect(zoomFactorFromWheel(100)).toBeLessThan(1);
    expect(zoomFactorFromWheel(-5000, true)).toBeLessThanOrEqual(1.45);
    expect(zoomFactorFromWheel(5000, true)).toBeGreaterThanOrEqual(0.7);
  });

  it("can still reach clamp bounds over many steps", () => {
    let z = 1;
    for (let i = 0; i < 120; i++) z = nextZoom(z, -80, true);
    expect(z).toBe(ZOOM_MAX);
    z = 1;
    for (let i = 0; i < 120; i++) z = nextZoom(z, 80, true);
    expect(z).toBe(ZOOM_MIN);
  });

  it("zooms out below 1 — content narrower than viewport (not locked to fit)", () => {
    const port = 1000;
    const w1 = timelineContentWidth(port, 1);
    const wHalf = timelineContentWidth(port, 0.5);
    expect(w1).toBe(port);
    expect(wHalf).toBe(port * 0.5);
    expect(wHalf).toBeLessThan(port);
  });

  it("zooms in far — content much wider than viewport", () => {
    const port = 800;
    expect(timelineContentWidth(port, 50)).toBe(port * 50);
    expect(timelineContentWidth(port, ZOOM_MAX)).toBe(port * ZOOM_MAX);
  });

  it("never shrinks below gutter + min lane", () => {
    const port = 1000;
    const floor = TIMELINE_GUTTER + MIN_LANE_PX;
    expect(timelineContentWidth(port, 0.01)).toBeGreaterThanOrEqual(floor);
    expect(effectiveZoomMin(port)).toBeCloseTo(floor / port, 5);
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

  it("preserves left-edge anchor when zooming out below fit", () => {
    const portWidth = 1000;
    const gutter = TIMELINE_GUTTER;
    const next = scrollLeftAfterZoom({
      oldZoom: 2, newZoom: 0.5, scrollLeft: 100, portWidth, gutter,
    });
    // תוכן צר מה-viewport → אין גלילה, נשארים ב-0
    expect(timelineContentWidth(portWidth, 0.5)).toBeLessThan(portWidth);
    expect(next).toBe(0);
  });
});
