import { describe, it, expect } from "vitest";
import { roundToMs, clampTime, timeToPixels, pixelsToTime, snapRangeStart, snapTime, snapTimeTo, snapToMagneticTarget, formatTimecode, secToMs, msToSec } from "./time";

describe("time model", () => {
  it("roundToMs removes float drift", () => {
    expect(roundToMs(0.1 + 0.2)).toBe(0.3);
    expect(roundToMs(1.23456)).toBe(1.235);
  });
  it("seconds <-> ms", () => {
    expect(secToMs(1.234)).toBe(1234);
    expect(msToSec(1500)).toBe(1.5);
  });
  it("clampTime bounds", () => {
    expect(clampTime(5, 0, 3)).toBe(3);
    expect(clampTime(-1, 0, 3)).toBe(0);
    expect(clampTime(2, 0, 3)).toBe(2);
  });
  it("pixels <-> time inverse", () => {
    expect(pixelsToTime(timeToPixels(2, 50), 50)).toBeCloseTo(2);
    expect(pixelsToTime(100, 0)).toBe(0);
  });
  it("snapTime snaps within tolerance only", () => {
    expect(snapTime(2.02, [2, 5], 0.05)).toBe(2);
    expect(snapTime(2.2, [2, 5], 0.05)).toBeCloseTo(2.2);
  });
  it("snapTimeTo reports whether a target was hit", () => {
    expect(snapTimeTo(2.02, [2, 5], 0.05)).toEqual({ time: 2, snapped: true, target: 2 });
    expect(snapTimeTo(2.2, [2, 5], 0.05)).toEqual({ time: 2.2, snapped: false, target: null });
  });
  it("prefers the higher-priority magnetic target on an exact tie", () => {
    const result = snapToMagneticTarget(5.02, [
      { time: 5, label: "playhead", kind: "playhead", priority: 1 },
      { time: 5, label: "clip edge", kind: "clip", priority: 5 },
    ], 0.05);
    expect(result.match?.label).toBe("clip edge");
  });
  it("snaps either edge of a moving range while preserving duration", () => {
    const targets = [{ time: 10, label: "upper track end", kind: "clip" as const, priority: 5 }];
    expect(snapRangeStart(9.98, 3, targets, 0.05)).toMatchObject({ start: 10, edge: "start", snapped: true });
    expect(snapRangeStart(7.02, 3, targets, 0.05)).toMatchObject({ start: 7, edge: "end", snapped: true });
  });
  it("formatTimecode", () => {
    expect(formatTimecode(65, 30)).toBe("01:05;00");
    expect(formatTimecode(3661)).toBe("01:01:01;00");
    expect(formatTimecode(-4)).toBe("00:00;00");
  });
});
