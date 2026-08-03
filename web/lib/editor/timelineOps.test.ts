import { describe, it, expect } from "vitest";
import { Clip, clipDur, totalDur } from "./model";
import { closeGap, isGapClip, makeGap, removeClipLeaveGap, removeClipRipple } from "./timelineOps";

const c = (id: string, start: number, end: number): Clip => ({ id, sourceId: "m", start, end });

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
