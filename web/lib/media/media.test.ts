import { describe, it, expect } from "vitest";
import { computePeaks, bucketRange } from "./waveform";
import { thumbTimes, filmstripCount } from "./thumbnails";

describe("waveform peaks", () => {
  it("computes normalized max-amplitude buckets", () => {
    // ramp 0..1 over 100 samples -> 10 buckets, last bucket loudest -> normalized to 1
    const data = Float32Array.from({ length: 100 }, (_, i) => i / 99);
    const peaks = computePeaks(data, 10);
    expect(peaks.length).toBe(10);
    expect(peaks[9]).toBeCloseTo(1, 5);          // loudest bucket normalized to 1
    expect(peaks[0]).toBeLessThan(peaks[9]);      // rising envelope
    expect(Math.max(...Array.from(peaks))).toBeCloseTo(1, 5);
  });
  it("uses absolute value (negative samples count)", () => {
    const data = new Float32Array([-1, -0.5, 0.25, 0]);
    const peaks = computePeaks(data, 2);
    expect(peaks[0]).toBeCloseTo(1, 5); // |-1| dominates first half
  });
  it("handles empty input without NaN", () => {
    const peaks = computePeaks(new Float32Array(0), 8);
    expect(peaks.every((v) => v === 0)).toBe(true);
  });
});

describe("bucketRange (clip window -> peak slice)", () => {
  it("maps sourceIn/out to bucket indices by duration", () => {
    expect(bucketRange(0, 10, 10, 1000)).toEqual([0, 1000]);
    const [a, b] = bucketRange(2.5, 5, 10, 1000);
    expect(a).toBe(250); expect(b).toBe(500);
  });
  it("always returns a non-empty range", () => {
    const [a, b] = bucketRange(3, 3, 10, 1000);
    expect(b).toBeGreaterThan(a);
  });
  it("falls back to full range when duration unknown", () => {
    expect(bucketRange(1, 2, 0, 500)).toEqual([0, 500]);
  });
});

describe("filmstrip layout", () => {
  it("spaces thumbnail times at bucket centers inside the clip window", () => {
    const t = thumbTimes(0, 4, 4);
    expect(t).toEqual([0.5, 1.5, 2.5, 3.5]);
  });
  it("respects sourceIn offset after trim", () => {
    const t = thumbTimes(10, 12, 2);
    expect(t).toEqual([10.5, 11.5]);
  });
  it("count scales with width but is clamped", () => {
    expect(filmstripCount(200, 40)).toBe(5);
    expect(filmstripCount(5, 40)).toBe(1);       // at least one
    expect(filmstripCount(100000, 40)).toBe(14); // clamped
  });
});
