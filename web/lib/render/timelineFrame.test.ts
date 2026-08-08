import { describe, it, expect } from "vitest";
import { Clip } from "@/lib/editor/model";
import { defaultTracks, createVideoTrack } from "@/lib/editor/project";
import { makeGap, isGapClip } from "@/lib/editor/timelineOps";
import { Overlay } from "@/lib/editor/overlay";
import {
  buildMicroEdl, clampTimelineAt, fadeLevelAt, MICRO_WINDOW_SEC, microSeekAt,
  overlaysActiveAt, pickTimelineClip, shiftOverlaysToStart, shiftSubsToStart, subsActiveAt,
} from "./timelineFrame";

const clip = (id: string, sourceId: string, start: number, end: number, extra: Partial<Clip> = {}): Clip =>
  ({ id, sourceId, start, end, ...extra });

const ov = (id: string, start: number, end: number, extra: Partial<Overlay> = {}): Overlay => ({
  id, kind: "text", text: "x", start, end, zIndex: 1,
  transform: { x: 0, y: 0, w: 100, h: 40, rotation: 0, opacity: 1 }, ...extra,
});

const sub = (id: string, start: number, end: number) => ({ id, start, end, text: "שלום" });

const tracks = defaultTracks();

describe("clampTimelineAt", () => {
  it("clamps negative and beyond-end values into [0, total]", () => {
    expect(clampTimelineAt(-2, 10)).toBe(0);
    expect(clampTimelineAt(5, 10)).toBe(5);
    expect(clampTimelineAt(15, 10)).toBe(10);
    expect(clampTimelineAt(0, 0)).toBe(0);
    expect(clampTimelineAt(3, -1)).toBe(0);
  });
});

describe("pickTimelineClip (source-time mapping)", () => {
  const flat: Clip[] = [
    clip("c1", "srcA", 10, 11), // assembled 0-1
    clip("c2", "srcB", 5, 7),   // assembled 1-3
  ];

  it("maps assembled seconds back to the right source second", () => {
    expect(pickTimelineClip(flat, 0)?.sourceSeconds).toBeCloseTo(10, 6);
    expect(pickTimelineClip(flat, 0.5)?.sourceSeconds).toBeCloseTo(10.5, 6);
    expect(pickTimelineClip(flat, 1.5)?.sourceSeconds).toBeCloseTo(5.5, 6);
  });

  it("keeps boundary times on the covering clip (matches assembledToSource)", () => {
    const atEndOfFirst = pickTimelineClip(flat, 1)!;
    expect(atEndOfFirst.index).toBe(0);
    expect(atEndOfFirst.localSeconds).toBeCloseTo(1, 6);
    expect(atEndOfFirst.sourceSeconds).toBeCloseTo(11, 6);
    const atStartOfSecond = pickTimelineClip(flat, 1.0001)!;
    expect(atStartOfSecond.index).toBe(1);
    expect(atStartOfSecond.sourceSeconds).toBeCloseTo(5.0001, 6);
  });

  it("returns the last clip at the exact timeline end", () => {
    const seg = pickTimelineClip(flat, 3)!;
    expect(seg.index).toBe(1);
    expect(seg.localSeconds).toBeCloseTo(2, 6);
    expect(seg.sourceSeconds).toBeCloseTo(7, 6);
  });

  it("returns null beyond the timeline end or for an empty list", () => {
    expect(pickTimelineClip(flat, 3.1)).toBeNull();
    expect(pickTimelineClip([], 0)).toBeNull();
  });
});

describe("overlay/sub active interval boundaries", () => {
  it("overlaysActiveAt is inclusive at both bounds and respects hidden", () => {
    const overlays = [
      ov("a", 1, 3),
      ov("b", 1, 3, { hidden: true }),
      ov("c", 5, 6),
    ];
    expect(overlaysActiveAt(overlays, 1).map((o) => o.id)).toEqual(["a"]);
    expect(overlaysActiveAt(overlays, 3).map((o) => o.id)).toEqual(["a"]);
    expect(overlaysActiveAt(overlays, 1.5).map((o) => o.id)).toEqual(["a"]);
    // outside the 1e-3 tolerance of overlayVisibleAt → not visible
    expect(overlaysActiveAt(overlays, 0.998)).toEqual([]);
    expect(overlaysActiveAt(overlays, 3.002)).toEqual([]);
    expect(overlaysActiveAt(overlays, 5.5).map((o) => o.id)).toEqual(["c"]);
  });

  it("subsActiveAt is inclusive at both bounds and skips zero-length cues", () => {
    const subs = [sub("s1", 1, 3), sub("s2", 5, 6), sub("s3", 7, 7)];
    expect(subsActiveAt(subs, 1).map((s) => s.id)).toEqual(["s1"]);
    expect(subsActiveAt(subs, 3).map((s) => s.id)).toEqual(["s1"]);
    expect(subsActiveAt(subs, 5.5).map((s) => s.id)).toEqual(["s2"]);
    expect(subsActiveAt(subs, 4)).toEqual([]);
    expect(subsActiveAt(subs, 7)).toEqual([]);
  });

  it("shift helpers map items into [0, end]", () => {
    const shiftedOv = shiftOverlaysToStart([ov("a", 2, 8), ov("b", 1, 2)], 0.25);
    expect(shiftedOv.map((o) => [o.start, o.end])).toEqual([[0, 0.25], [0, 0.25]]);
    const shiftedSubs = shiftSubsToStart([sub("s1", 2, 8)], 0.25);
    expect(shiftedSubs[0]).toMatchObject({ start: 0, end: 0.25 });
  });
});

describe("buildMicroEdl — multi-track flatten / cutaway", () => {
  it("selects the cutaway (upper track) clip like preview/export", () => {
    const { tracks: mt } = createVideoTrack(defaultTracks(), "B");
    const upper = mt.find((t) => t.type === "video" && t.id !== "trk_video")!;
    const clips = [
      clip("a", "srcA", 10, 14, { trackId: "trk_video" }),
      clip("b", "srcB", 0, 1, { trackId: upper.id }), // covers assembled 0-1 on the upper track
    ];
    // assembled 0.5 → upper track wins (srcB)
    const microAtStart = buildMicroEdl(clips, mt, 0.5)!;
    expect(microAtStart.segments[0].sourceId).toBe("srcB");
    // assembled 2 → only primary covers it (srcA)
    const microAtMiddle = buildMicroEdl(clips, mt, 2)!;
    expect(microAtMiddle.segments[0].sourceId).toBe("srcA");
  });

  it("exact cutaway boundary stays on the cutaway; just past it the base clip shows through", () => {
    const { tracks: mt } = createVideoTrack(defaultTracks(), "B");
    const upper = mt.find((t) => t.type === "video" && t.id !== "trk_video")!;
    const clips = [
      clip("a", "srcA", 10, 14, { trackId: "trk_video" }),
      clip("b", "srcB", 0, 1, { trackId: upper.id }), // cutaway covers assembled [0,1]
    ];
    // The exact boundary 1.0 belongs to the covering cutaway (flattenVideoTracks splits
    // at 1.0; pickTimelineClip keeps a boundary time on the clip that covers it).
    const atBoundary = buildMicroEdl(clips, mt, 1)!;
    expect(atBoundary.segments[0].sourceId).toBe("srcB");
    expect(atBoundary.sourceTime).toBeCloseTo(1, 6);
    // Just past the boundary the base clip shows through again — and the base source
    // clock has kept running under the cutaway (assembled 1 ↦ source 11).
    const justPast = buildMicroEdl(clips, mt, 1.0001)!;
    expect(justPast.segments[0].sourceId).toBe("srcA");
    expect(justPast.sourceTime).toBeCloseTo(11.0001, 6);
  });

  it("returns null when the flattened timeline is empty", () => {
    expect(buildMicroEdl([], defaultTracks(), 0)).toBeNull();
  });

  it("renders black for a disabled covering clip (export skips disabled clips)", () => {
    const micro = buildMicroEdl([clip("a", "srcA", 0, 1, { enabled: false })], defaultTracks(), 0.5)!;
    expect(micro).not.toBeNull();
    expect(micro.gap).toBe(true);
    expect(isGapClip(micro.segments[0])).toBe(true);
  });
});

describe("buildMicroEdl — gap behavior", () => {
  const gapped: Clip[] = [
    clip("c1", "srcA", 0, 1),
    makeGap(1),
    clip("c2", "srcA", 1, 2),
  ];

  it("renders black (gap segment) when the instant lands on a gap", () => {
    const micro = buildMicroEdl(gapped, tracks, 1.5)!;
    expect(micro.gap).toBe(true);
    expect(isGapClip(micro.segments[0])).toBe(true);
    expect(micro.segments[0].start).toBe(0);
    expect(micro.segments[0].end).toBeCloseTo(MICRO_WINDOW_SEC, 6);
  });

  it("keeps overlays/captions active at the gap instant and shifts them into the window", () => {
    const overlays = [ov("logo", 0.5, 2.5)];
    const subs = [sub("cap", 1.2, 1.8)];
    const micro = buildMicroEdl(gapped, tracks, 1.5, overlays, subs)!;
    expect(micro.overlays).toHaveLength(1);
    expect(micro.overlays[0]).toMatchObject({ start: 0, end: micro.microDuration });
    expect(micro.subs).toHaveLength(1);
    expect(micro.subs[0]).toMatchObject({ start: 0, end: micro.microDuration });
  });

  it("non-gap instants are not flagged as gaps", () => {
    const micro = buildMicroEdl(gapped, tracks, 0.5)!;
    expect(micro.gap).toBe(false);
  });
});

describe("buildMicroEdl — microclip positivity and end clamp", () => {
  it("windows around the requested instant inside a long clip", () => {
    const clips = [clip("c1", "srcA", 10, 20)];
    const micro = buildMicroEdl(clips, tracks, 13)!;
    expect(micro.gap).toBe(false);
    expect(micro.segments).toHaveLength(1);
    const s = micro.segments[0];
    expect(s.end - s.start).toBeGreaterThan(0);
    expect(s.start).toBeGreaterThanOrEqual(10);
    expect(s.end).toBeLessThanOrEqual(20);
    // captureAt = requested offset within the micro window, inside [0, microDuration]
    expect(micro.captureAt).toBeGreaterThanOrEqual(0);
    expect(micro.captureAt).toBeLessThanOrEqual(micro.microDuration);
  });

  it("clamps at the exact end boundary without a zero-length clip", () => {
    const clips = [clip("c1", "srcA", 0, 10)];
    const micro = buildMicroEdl(clips, tracks, 10)!;
    expect(micro.segments[0].end - micro.segments[0].start).toBeGreaterThan(0);
    expect(micro.segments[0].end).toBeCloseTo(10, 6);
    expect(micro.segments[0].start).toBeLessThan(10);
  });

  it("clamps beyond-end requests to the timeline end", () => {
    const clips = [clip("c1", "srcA", 0, 10)];
    const micro = buildMicroEdl(clips, tracks, 99)!;
    expect(micro).not.toBeNull();
    expect(micro.segments[0].end).toBeCloseTo(10, 6);
  });

  it("keeps tiny clips positive even when shorter than the minimum window", () => {
    // 0.03s < MIN_WINDOW_SEC — the micro clip is clamped to the remaining source
    // duration and is never inflated up to MIN_WINDOW_SEC or beyond the source end.
    const clips = [clip("c1", "srcA", 5, 5.03)];
    const micro = buildMicroEdl(clips, tracks, 5.015)!;
    expect(micro).not.toBeNull();
    const s = micro.segments[0];
    expect(s.end - s.start).toBeGreaterThan(0);
    expect(s.end).toBeLessThanOrEqual(5.03);
    expect(micro.microDuration).toBeCloseTo(0.03, 6);
    expect(micro.captureAt).toBeGreaterThan(0);
    expect(micro.captureAt).toBeLessThanOrEqual(micro.microDuration);
  });

  it("preserves clip opacity and other visual props on the micro clip", () => {
    const clips = [clip("c1", "srcA", 0, 10, { opacity: 0.5, contrast: 1.3, saturation: 0.4, flipX: true })];
    const micro = buildMicroEdl(clips, tracks, 5)!;
    expect(micro.segments[0]).toMatchObject({ sourceId: "srcA", opacity: 0.5, contrast: 1.3, saturation: 0.4, flipX: true });
  });
});

describe("fadeLevelAt (matches preview edgeFadeFactor)", () => {
  it("returns 1 outside fade zones", () => {
    const c = clip("c1", "srcA", 0, 4, { visualFadeIn: 1, visualFadeOut: 1 });
    expect(fadeLevelAt(c, 2)).toBe(1);
  });
  it("ramps during fade-in", () => {
    const c = clip("c1", "srcA", 0, 4, { visualFadeIn: 1 });
    expect(fadeLevelAt(c, 0)).toBe(0);
    expect(fadeLevelAt(c, 0.5)).toBeCloseTo(0.5, 6);
  });
  it("ramps during fade-out", () => {
    const c = clip("c1", "srcA", 0, 4, { visualFadeOut: 1 });
    expect(fadeLevelAt(c, 3.5)).toBeCloseTo(0.5, 6);
    expect(fadeLevelAt(c, 4)).toBe(0);
  });
  it("bakes the fade level into micro-clip opacity at the instant", () => {
    const clips = [clip("c1", "srcA", 0, 4, { opacity: 1, visualFadeIn: 1 })];
    // at assembled 0.5 the clip is 50% into a 1s fade-in → opacity 0.5
    const micro = buildMicroEdl(clips, tracks, 0.5)!;
    expect(micro.segments[0].opacity).toBeCloseTo(0.5, 6);
    // fades are dropped from the micro clip so the micro window does not re-fade
    expect(micro.segments[0].visualFadeIn).toBeUndefined();
    expect(micro.segments[0].visualFadeOut).toBeUndefined();
  });
});

describe("microSeekAt (frame-extraction seek inside a positive micro clip)", () => {
  it("keeps a mid-window capture as-is", () => {
    expect(microSeekAt(0.125, 0.25)).toBeCloseTo(0.125, 6);
  });

  it("pulls back from the clip end by the capped 20ms margin", () => {
    // microDuration/4 = 0.0625 > 0.02 → capped at 0.02
    expect(microSeekAt(0.25, 0.25)).toBeCloseTo(0.23, 6);
  });

  it("scales the margin down for tiny micro clips", () => {
    // microDuration/4 = 0.0075 < 0.02 → proportional margin keeps seek inside
    expect(microSeekAt(0.03, 0.03)).toBeCloseTo(0.0225, 6);
    expect(microSeekAt(0.03, 0.03)).toBeLessThan(0.03);
    expect(microSeekAt(0.03, 0.03)).toBeGreaterThan(0);
  });

  it("never seeks before 0", () => {
    expect(microSeekAt(-1, 0.25)).toBe(0);
    expect(microSeekAt(0, 0.25)).toBe(0);
  });

  it("returns 0 for a non-positive micro duration", () => {
    expect(microSeekAt(0.1, 0)).toBe(0);
    expect(microSeekAt(0.1, -0.5)).toBe(0);
    expect(microSeekAt(0.1, Number.NaN)).toBe(0);
  });
});
