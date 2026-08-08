import { describe, it, expect } from "vitest";
import { Clip } from "./model";
import { defaultTracks, createVideoTrack } from "./project";
import {
  clipTrackId, clipsOnTrack, flattenVideoTracks, moveClipOnTrack, projectDuration, replaceTrackClips,
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
      { id: "a", sourceId: "src", start: 0, end: 2, trackId: "trk_video", contrast: 1.3, saturation: 0.4, fadeIn: 0.5, fadeOut: 0.75, visualFadeIn: 0.25, visualFadeOut: 0.4 },
    ];
    const flat = flattenVideoTracks(styled, tracks);
    expect(flat[0]).toMatchObject({ contrast: 1.3, saturation: 0.4, fadeIn: 0.5, fadeOut: 0.75, visualFadeIn: 0.25, visualFadeOut: 0.4 });
  });
});
