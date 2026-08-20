import { describe, it, expect } from "vitest";
import { moveClipAtTimeline, clipsOnTrack } from "@/lib/editor/tracks";
import { assembledStart, Clip } from "@/lib/editor/model";
import { isGapClip } from "@/lib/editor/timelineOps";

// B-01 / B-02 regression: moving one clip must never move a clip the user did not touch.
// The space a clip vacates becomes a gap — on EVERY track, including the primary video
// track, which previously collapsed the hole and slid all later clips left.

const c = (id: string, dur: number, trackId?: string): Clip =>
  ({ id, sourceId: "src1", start: 0, end: dur, ...(trackId ? { trackId } : {}) } as Clip);

/** timeline start of a clip by id, on its track */
function startOf(clips: Clip[], trackId: string, id: string, primary = "trk_video"): number {
  const list = clipsOnTrack(clips, trackId, primary);
  const i = list.findIndex((x) => x.id === id);
  return i < 0 ? -1 : assembledStart(list, i);
}

describe("free placement — vacated space stays open", () => {
  const PRIMARY = "trk_video";

  it("does not drag untouched clips left when a clip moves away (primary track)", () => {
    // A[0-2] B[2-4] C[4-6]
    const clips = [c("A", 2), c("B", 2), c("C", 2)];
    const out = moveClipAtTimeline(clips, "B", PRIMARY, 10, PRIMARY);

    expect(startOf(out, PRIMARY, "A")).toBeCloseTo(0, 5);
    expect(startOf(out, PRIMARY, "C")).toBeCloseTo(4, 5); // was 4 before, must still be 4
    expect(startOf(out, PRIMARY, "B")).toBeCloseTo(10, 5); // exactly where it was dropped
  });

  it("drops a clip at an exact arbitrary time, not snapped to the end of the previous clip", () => {
    const clips = [c("A", 2), c("B", 2)];
    const out = moveClipAtTimeline(clips, "B", PRIMARY, 3.2, PRIMARY);
    expect(startOf(out, PRIMARY, "B")).toBeCloseTo(3.2, 5); // gap of 1.2s is legal
  });

  it("leaves no trailing gap when the last clip is moved away", () => {
    const clips = [c("A", 2), c("B", 2)];
    const out = moveClipAtTimeline(clips, "B", PRIMARY, 0.5, PRIMARY);
    const list = clipsOnTrack(out, PRIMARY, PRIMARY);
    expect(isGapClip(list[list.length - 1])).toBe(false);
  });

  it("keeps the moved clip's source range intact", () => {
    const clips = [c("A", 2), { id: "B", sourceId: "src1", start: 5, end: 9 } as Clip];
    const out = moveClipAtTimeline(clips, "B", PRIMARY, 20, PRIMARY);
    const moved = out.find((x) => x.id === "B")!;
    expect(moved.start).toBe(5);
    expect(moved.end).toBe(9);
  });

  it("is idempotent: re-dropping at the same time does not shift anything", () => {
    const clips = [c("A", 2), c("B", 2), c("C", 2)];
    const once = moveClipAtTimeline(clips, "B", PRIMARY, 10, PRIMARY);
    const twice = moveClipAtTimeline(once, "B", PRIMARY, 10, PRIMARY);
    expect(startOf(twice, PRIMARY, "A")).toBeCloseTo(startOf(once, PRIMARY, "A"), 5);
    expect(startOf(twice, PRIMARY, "C")).toBeCloseTo(startOf(once, PRIMARY, "C"), 5);
    expect(startOf(twice, PRIMARY, "B")).toBeCloseTo(10, 5);
  });
});
