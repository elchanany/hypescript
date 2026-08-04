import { describe, it, expect } from "vitest";
import { trimClip, splitClip, Clip } from "./model";

const clips = (): Clip[] => [{ id: "x", sourceId: "v", start: 55.44, end: 67.92 }];

describe("trimClip", () => {
  it("trims end within clip without NaN", () => {
    const r = trimClip(clips(), "x", 55.44, 58.4, 360);
    expect(r[0]).toMatchObject({ start: 55.44, end: 58.4 });
    expect(Number.isFinite(r[0].start)).toBe(true);
    expect(Number.isFinite(r[0].end)).toBe(true);
  });

  it("uses existing bounds when start/end are NaN", () => {
    const r = trimClip(clips(), "x", NaN, NaN, 360);
    expect(r[0]).toMatchObject({ start: 55.44, end: 67.92 });
  });

  it("tolerates missing maxDuration", () => {
    const r = trimClip(clips(), "x", 55.44, 58.4, NaN);
    expect(r[0].end).toBe(58.4);
  });
});

describe("splitClip (linked A/V)", () => {
  it("splits into two and inherits volume/enabled on the right half", () => {
    const src: Clip[] = [{ id: "a", sourceId: "v", start: 0, end: 10, volume: 0.5, enabled: true }];
    const r = splitClip(src, "a", 4);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ id: "a", start: 0, end: 4, volume: 0.5 });
    expect(r[1]).toMatchObject({ sourceId: "v", start: 4, end: 10, volume: 0.5, enabled: true });
    expect(r[1].id).not.toBe("a");
  });
});
