import { describe, it, expect } from "vitest";
import { Clip } from "./model";
import { defaultTracks, createVideoTrack } from "./project";
import {
  clipTrackId, clipsOnTrack, flattenVideoTracks, insertClipAtTimeline, moveClipAtTimeline, moveClipOnTrack, normalizeTrackGaps, projectDuration, replaceTrackClips,
} from "./tracks";

describe("multi-track helpers", () => {
  it("defaults missing trackId to primary", () => {
    expect(clipTrackId({ id: "a", sourceId: "m", start: 0, end: 1 })).toBe("trk_video");
  });

  it("filters and replaces clips per track", () => {
    const clips: Clip[] = [
      { id: "a", sourceId: "m", start: 0, end: 2, trackId: "trk_video" },
      { id: "b", sourceId: "m", start: 0, end: 1, trackId: "trk_b" },
    ];
    expect(clipsOnTrack(clips, "trk_b")).toHaveLength(1);
    const next = replaceTrackClips(clips, "trk_b", [{ id: "c", sourceId: "m", start: 1, end: 3 }], "trk_video");
    expect(next.find((x) => x.id === "c")?.trackId).toBe("trk_b");
    expect(next.find((x) => x.id === "b")).toBeUndefined();
    expect(next.find((x) => x.id === "a")).toBeTruthy();
  });

  it("moves clip within its track only", () => {
    const clips: Clip[] = [
      { id: "a", sourceId: "m", start: 0, end: 1, trackId: "trk_video" },
      { id: "b", sourceId: "m", start: 1, end: 2, trackId: "trk_video" },
      { id: "x", sourceId: "m", start: 0, end: 5, trackId: "trk_b" },
    ];
    const moved = moveClipOnTrack(clips, "b", 0, "trk_video");
    const primary = clipsOnTrack(moved, "trk_video");
    expect(primary.map((c) => c.id)).toEqual(["b", "a"]);
    expect(clipsOnTrack(moved, "trk_b")[0].id).toBe("x");
  });

  it("projectDuration is max across video tracks", () => {
    const { tracks } = createVideoTrack(defaultTracks(), "B");
    const b = tracks.find((t) => t.type === "video" && t.id !== "trk_video")!;
    const clips: Clip[] = [
      { id: "a", sourceId: "m", start: 0, end: 2, trackId: "trk_video" },
      { id: "b", sourceId: "m", start: 0, end: 5, trackId: b.id },
    ];
    expect(projectDuration(clips, tracks)).toBeCloseTo(5, 5);
  });

  it("flattenVideoTracks: upper track wins (cutaway)", () => {
    const { tracks } = createVideoTrack(defaultTracks(), "B");
    const b = tracks.find((t) => t.type === "video" && t.id !== "trk_video")!;
    // primary 0-4 from source A; upper 1-2 from source B → middle is B
    const clips: Clip[] = [
      { id: "a", sourceId: "srcA", start: 10, end: 14, trackId: "trk_video" },
      { id: "b", sourceId: "srcB", start: 0, end: 1, trackId: b.id }, // occupies 0-1 on upper
    ];
    // Pad upper so it covers 0-1 only; primary covers 0-4
    // Actually upper clip duration 1s at start of track → times 0-1 upper, 1-4 primary
    const flat = flattenVideoTracks(clips, tracks);
    expect(flat.length).toBeGreaterThanOrEqual(2);
    expect(flat[0].sourceId).toBe("srcB");
    expect(flat[flat.length - 1].sourceId).toBe("srcA");
  });

  it("places a clip at an exact empty-track time with a real leading gap", () => {
    const clip: Clip = { id: "b", sourceId: "src", start: 3, end: 5 };
    const placed = insertClipAtTimeline([], clip, 7.125, "trk_b");
    expect(placed).toHaveLength(2);
    expect(placed[0]).toMatchObject({ sourceId: "__gap__", end: 7.125, trackId: "trk_b" });
    expect(placed[1]).toMatchObject({ id: "b", start: 3, end: 5, trackId: "trk_b" });
  });

  it("moves a clip to a cross-track magnetic edge without changing its source range", () => {
    const clips: Clip[] = [
      { id: "base", sourceId: "a", start: 10, end: 20, trackId: "trk_video" },
      { id: "logo", sourceId: "b", start: 2, end: 5, trackId: "trk_b" },
    ];
    const moved = moveClipAtTimeline(clips, "logo", "trk_video", 10, "trk_video");
    const primary = clipsOnTrack(moved, "trk_video");
    expect(primary.map((item) => item.id)).toEqual(["base", "logo"]);
    expect(primary[1]).toMatchObject({ sourceId: "b", start: 2, end: 5, trackId: "trk_video" });
    expect(clipsOnTrack(moved, "trk_b")).toHaveLength(0);
  });

  it("consumes available gap space when magnetically placing a clip", () => {
    const track: Clip[] = [
      { id: "gap", sourceId: "__gap__", start: 0, end: 8, trackId: "trk_b" },
      { id: "after", sourceId: "a", start: 0, end: 2, trackId: "trk_b" },
    ];
    const placed = insertClipAtTimeline(track, { id: "new", sourceId: "b", start: 0, end: 2 }, 3, "trk_b");
    expect(placed.map((item) => item.id)).toEqual([expect.stringMatching(/^g/), "new", expect.stringMatching(/^g/), "after"]);
    expect(placed.reduce((sum, item) => sum + (item.end - item.start), 0)).toBe(10);
  });

  it("does not merge adjacent source ranges with different opacity or volume", () => {
    const { tracks } = createVideoTrack(defaultTracks(), "B");
    const clips: Clip[] = [
      { id: "a", sourceId: "src", start: 0, end: 1, trackId: "trk_video", opacity: 1, volume: 1 },
      { id: "b", sourceId: "src", start: 1, end: 2, trackId: "trk_video", opacity: 0.4, volume: 0.5 },
    ];
    const flat = flattenVideoTracks(clips, tracks);
    expect(flat).toHaveLength(2);
    expect(flat.map((item) => [item.opacity, item.volume])).toEqual([[1, 1], [0.4, 0.5]]);
  });

  it("preserves color and audio fades while flattening cutaway tracks", () => {
    const { tracks } = createVideoTrack(defaultTracks(), "B");
    const styled: Clip[] = [
      { id: "a", sourceId: "src", start: 0, end: 2, trackId: "trk_video", contrast: 1.3, saturation: 0.4, fadeIn: 0.5, fadeOut: 0.75, visualFadeIn: 0.25, visualFadeOut: 0.4, flipX: true, flipY: true },
    ];
    const flat = flattenVideoTracks(styled, tracks);
    expect(flat[0]).toMatchObject({ contrast: 1.3, saturation: 0.4, fadeIn: 0.5, fadeOut: 0.75, visualFadeIn: 0.25, visualFadeOut: 0.4, flipX: true, flipY: true });
  });

  it("normalizes adjacent gaps into a single contiguous gap", () => {
    const clips: Clip[] = [
      { id: "g1", sourceId: "__gap__", start: 0, end: 3, trackId: "trk_b" },
      { id: "g2", sourceId: "__gap__", start: 0, end: 4, trackId: "trk_b" },
      { id: "c", sourceId: "src", start: 0, end: 5, trackId: "trk_b" },
    ];
    const normalized = normalizeTrackGaps(clips);
    expect(normalized).toHaveLength(2);
    expect(normalized[0]).toMatchObject({ sourceId: "__gap__", end: 7 });
    expect(normalized[1].id).toBe("c");
  });

  it("preserves subsequent clip timestamps on secondary track when moving an earlier clip", () => {
    const clips: Clip[] = [
      { id: "base", sourceId: "a", start: 0, end: 30, trackId: "trk_video" },
      { id: "g1", sourceId: "__gap__", start: 0, end: 5, trackId: "trk_b" },
      { id: "logo", sourceId: "b", start: 0, end: 5, trackId: "trk_b" },
      { id: "g2", sourceId: "__gap__", start: 0, end: 5, trackId: "trk_b" },
      { id: "banner", sourceId: "c", start: 0, end: 5, trackId: "trk_b" },
    ];
    // banner is at 5 + 5 + 5 = 15s. Moving logo to 25s should keep banner at 15s!
    const moved = moveClipAtTimeline(clips, "logo", "trk_b", 25, "trk_video");
    const bClips = clipsOnTrack(moved, "trk_b");
    const bannerClip = bClips.find((c) => c.id === "banner");
    expect(bannerClip).toBeTruthy();
    // Verify banner starts at 15s in assembled timeline
    let acc = 0;
    for (const c of bClips) {
      if (c.id === "banner") break;
      acc += c.end - c.start;
    }
    expect(acc).toBeCloseTo(15, 2);
  });
});
