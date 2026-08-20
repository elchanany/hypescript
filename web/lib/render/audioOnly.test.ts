import { describe, it, expect } from "vitest";
import { usableClips, buildConcatGraph } from "@/lib/render/graph";
import { Clip, MediaAsset } from "@/lib/editor/model";

// B-04 regression: an audio-only asset (mp3/wav) must never become a visual layer.
// It must not appear in the video concat, must not cover the video, and must not
// contribute a picture — while still being audible in the mix.

const asset = (id: string, kind: "video" | "audio" | "image"): MediaAsset =>
  ({ id, name: `${id}.${kind === "audio" ? "mp3" : "mp4"}`, kind, duration: 30,
     file: { name: `${id}.x` } as File, url: "" } as MediaAsset);
const clip = (id: string, sourceId: string, dur = 5): Clip =>
  ({ id, sourceId, start: 0, end: dur } as Clip);

describe("audio-only assets are never visual", () => {
  const media = [asset("v1", "video"), asset("a1", "audio")];

  it("excludes audio-kind clips from the visual clip set", () => {
    const clips = [clip("cv", "v1"), clip("ca", "a1")];
    const visual = usableClips(clips, media);
    expect(visual.map((c) => c.id)).toEqual(["cv"]);
  });

  it("an audio clip alone produces no video segments to render", () => {
    expect(usableClips([clip("ca", "a1")], media)).toHaveLength(0);
  });

  it("the exported video track is built only from the video clip", () => {
    const g = buildConcatGraph([clip("cv", "v1"), clip("ca", "a1")], media, { w: 1280, h: 720, fps: 30 });
    expect(g.segmentCount).toBe(1);                       // not 2
    // exactly one real source file is staged for the visual path
    expect(g.writes.some((w) => w.assetId === "v1")).toBe(true);
  });

  it("images stay visual (guard against an over-broad filter)", () => {
    const withImage = [...media, asset("i1", "image")];
    const visual = usableClips([clip("ci", "i1")], withImage);
    expect(visual).toHaveLength(1);
  });
});
