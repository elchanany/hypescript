import { describe, it, expect } from "vitest";
import { Clip, clipDur, totalDur } from "./model";
import {
  closeGap, isGapClip, makeGap, removeClipLeaveGap, removeClipRipple,
  rollAtBoundary, slipClip,
} from "./timelineOps";

const c = (id: string, start: number, end: number, sourceId = "m"): Clip => ({ id, sourceId, start, end });

describe("timelineOps — gaps / ripple", () => {
  const clips = [c("a", 0, 2), c("b", 0, 3), c("c", 1, 2)];

  it("ripple delete closes the hole", () => {
    const next = removeClipRipple(clips, "b");
    expect(next.map((x) => x.id)).toEqual(["a", "c"]);
    expect(totalDur(next)).toBeCloseTo(3, 5);
  });

  it("leave-gap replaces clip with equal-duration gap", () => {
    const next = removeClipLeaveGap(clips, "b");
    expect(next).toHaveLength(3);
    expect(isGapClip(next[1])).toBe(true);
    expect(clipDur(next[1])).toBeCloseTo(3, 5);
    expect(totalDur(next)).toBeCloseTo(totalDur(clips), 5);
  });

  it("closeGap removes only gap rows", () => {
    const withGap = removeClipLeaveGap(clips, "a");
    const closed = closeGap(withGap, withGap[0].id);
    expect(closed.map((x) => x.id)).toEqual(["b", "c"]);
    expect(closeGap(clips, "a")).toEqual(clips); // not a gap
  });

  it("makeGap enforces minimum duration", () => {
    expect(clipDur(makeGap(0))).toBeGreaterThanOrEqual(0.05);
  });
});

describe("timelineOps — roll / slip", () => {
  const max = () => 100;

  it("roll moves the cut while preserving pair duration", () => {
    const clips = [c("a", 0, 2), c("b", 5, 9)]; // left 2s, right 4s
    const next = rollAtBoundary(clips, 0, 1, max);
    expect(totalDur(next)).toBeCloseTo(totalDur(clips), 5);
    expect(clipDur(next[0])).toBeCloseTo(3, 5);
    expect(clipDur(next[1])).toBeCloseTo(3, 5);
    expect(next[0].end).toBeCloseTo(3, 5);
    expect(next[1].start).toBeCloseTo(6, 5);
  });

  it("roll clamps when source runs out", () => {
    const clips = [c("a", 0, 2), c("b", 0, 2)];
    const next = rollAtBoundary(clips, 0, 5, () => 2);
    expect(next).toEqual(clips);
  });

  it("slip slides source window without changing duration", () => {
    const clips = [c("a", 1, 3)];
    const next = slipClip(clips, "a", 2, 10);
    expect(clipDur(next[0])).toBeCloseTo(2, 5);
    expect(next[0].start).toBeCloseTo(3, 5);
    expect(next[0].end).toBeCloseTo(5, 5);
  });

  it("slip clamps to source bounds", () => {
    const clips = [c("a", 0, 2)];
    const next = slipClip(clips, "a", -5, 10);
    expect(next[0].start).toBe(0);
    expect(next[0].end).toBe(2);
  });
});
