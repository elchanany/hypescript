import { describe, expect, it } from "vitest";
import { buildConcatGraph } from "./graph";
import { appendMainVideoTransform, isIdentityVideoTransform } from "./mainVideoTransform";
import { defaultVideoTransformFor, normalizeVideoTransform } from "@/lib/editor/videoTransform";
import { Clip, MediaAsset } from "@/lib/editor/model";

const clip = (id: string, start: number, end: number): Clip => ({ id, sourceId: "m", start, end });
const vid = (id: string): MediaAsset => ({
  id, name: "a.mp4", kind: "video", duration: 10,
  file: new File([], "a.mp4"), url: "",
});

describe("appendMainVideoTransform", () => {
  const canvas = { width: 1920, height: 1080 };
  const target = { w: 1280, h: 720, fps: 30 };
  const media = [vid("m")];
  const clips = [clip("a", 0, 1)];

  it("is identity for default fit on matching canvas", () => {
    const vt = defaultVideoTransformFor(canvas);
    expect(isIdentityVideoTransform(vt, canvas, 1920, 1080)).toBe(true);
  });

  it("leaves graph unchanged for identity transform", () => {
    const base = buildConcatGraph(clips, media, target);
    const vt = defaultVideoTransformFor(canvas);
    const g = appendMainVideoTransform(base, vt, canvas, target, 1920, 1080);
    expect(g.filterComplex).toBe(base.filterComplex);
  });

  it("pads scaled video onto black canvas for custom shrink", () => {
    const base = buildConcatGraph(clips, media, target);
    const vt = normalizeVideoTransform({
      fitMode: "custom", x: 960, y: 540, w: 960, h: 540, rotation: 0, opacity: 1,
    }, canvas);
    const g = appendMainVideoTransform(base, vt, canvas, target, 1920, 1080);
    expect(g.filterComplex).toContain("[rawv]");
    expect(g.filterComplex).toContain("pad=");
    expect(g.filterComplex).toContain("[outv]");
    expect(g.filterComplex).toContain("[outa]");
  });
});
