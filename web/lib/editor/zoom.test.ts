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

  it("really shrinks the time lane below fit while keeping the gutter fixed", () => {
    const port = 1000;
    const w1 = timelineContentWidth(port, 1);
    const wHalf = timelineContentWidth(port, 0.5);
    expect(w1).toBe(port);
    expect(wHalf).toBe(TIMELINE_GUTTER + (port - TIMELINE_GUTTER) * 0.5);
    expect(wHalf).toBeLessThan(port);
  });

  it("zooms in far — content much wider than viewport", () => {
    const port = 800;
    expect(timelineContentWidth(port, 50)).toBe(TIMELINE_GUTTER + (port - TIMELINE_GUTTER) * 50);
    expect(timelineContentWidth(port, ZOOM_MAX)).toBe(TIMELINE_GUTTER + (port - TIMELINE_GUTTER) * ZOOM_MAX);
  });

  it("never shrinks below gutter + min lane", () => {
    const port = 1000;
    const floor = TIMELINE_GUTTER + MIN_LANE_PX;
    expect(timelineContentWidth(port, 0.01)).toBeGreaterThanOrEqual(floor);
    expect(effectiveZoomMin(port)).toBeCloseTo(Math.max(ZOOM_MIN, MIN_LANE_PX / (port - TIMELINE_GUTTER)), 6);
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
    const oldLaneW = (portWidth - gutter) * oldZoom;
    const newLaneW = (portWidth - gutter) * newZoom;
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
    expect(timelineContentWidth(portWidth, 0.5)).toBeLessThan(portWidth);
    expect(next).toBe(0);
  });

  it("keeps changing through hundreds of deep zoom-out and zoom-in steps", () => {
    const port = 1200;
    let z = 1;
    let previousWidth = timelineContentWidth(port, z);
    for (let i = 0; i < 80 && z > effectiveZoomMin(port); i++) {
      z = nextZoom(z, 80, true, port);
      const width = timelineContentWidth(port, z);
      expect(width).toBeLessThanOrEqual(previousWidth);
      previousWidth = width;
    }
    expect(z).toBeCloseTo(effectiveZoomMin(port), 8);

    for (let i = 0; i < 160; i++) z = nextZoom(z, -80, true, port);
    expect(z).toBe(ZOOM_MAX);
  });
});
