import { describe, it, expect } from "vitest";
import { snapToleranceSec } from "@/lib/editor/time";

// B-03: the magnet must feel the same at every zoom level, which means the threshold is
// defined in SCREEN PIXELS and converted to seconds using the current zoom — never a
// fixed number of seconds.

const LANE = 1000; // px

describe("snapToleranceSec", () => {
  it("converts a pixel threshold into seconds using the visible span", () => {
    // 10px of a 1000px lane showing 20s => 0.2s (below the stickiness clamp)
    expect(snapToleranceSec(10, LANE, 20)).toBeCloseTo(0.2, 6);
    // and the raw conversion is exact when the clamp is lifted
    expect(snapToleranceSec(10, LANE, 100, Infinity)).toBeCloseTo(1, 6);
  });

  it("keeps a CONSTANT on-screen size across zoom levels", () => {
    const px = 10;
    for (const span of [2, 10, 60, 300]) {
      const tol = snapToleranceSec(px, LANE, span, Infinity);
      const onScreenPx = (tol / span) * LANE; // convert back
      expect(onScreenPx).toBeCloseTo(px, 6);
    }
  });

  it("does NOT impose a seconds floor that would block frame-accurate work", () => {
    // zoomed right in: 1000px showing 1s. 10px => 0.01s, well under one frame at 30fps.
    const tol = snapToleranceSec(10, LANE, 1);
    expect(tol).toBeCloseTo(0.01, 6);
    expect(tol).toBeLessThan(1 / 30); // must not swallow a whole frame
  });

  it("clamps the radius when zoomed far out so the magnet is not absurdly sticky", () => {
    // 1000px showing 10 hours: 10px would be 360s without the clamp
    expect(snapToleranceSec(10, LANE, 36000)).toBe(0.45);
  });

  it("is monotonic in zoom: a wider visible span never snaps over a smaller radius", () => {
    let prev = 0;
    for (const span of [1, 5, 20, 40]) {
      const tol = snapToleranceSec(10, LANE, span);
      expect(tol).toBeGreaterThanOrEqual(prev);
      prev = tol;
    }
  });

  it("survives degenerate inputs instead of producing NaN/Infinity", () => {
    expect(snapToleranceSec(10, 0, 100)).toBeGreaterThan(0);
    expect(Number.isFinite(snapToleranceSec(10, LANE, 0))).toBe(true);
    expect(snapToleranceSec(-5, LANE, 100)).toBe(0);
  });
});
