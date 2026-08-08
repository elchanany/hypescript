import { describe, it, expect } from "vitest";
import { buildConcatGraph } from "./graph";
import { appendOverlayBurns, projectOverlayToTarget } from "./overlayBurn";
import { Clip, MediaAsset } from "@/lib/editor/model";
import { Overlay } from "@/lib/editor/overlay";

const vid = (id: string): MediaAsset => ({ id, name: `${id}.mp4`, kind: "video", duration: 10, file: new File([], `${id}.mp4`), url: "" });
const clip = (sourceId: string, start: number, end: number): Clip => ({ id: `c_${sourceId}_${start}`, sourceId, start, end });

describe("overlay burn-in (post-concat)", () => {
  const media = [vid("a")];
  const clips = [clip("a", 0, 2)];
  const base = buildConcatGraph(clips, media, { w: 1280, h: 720, fps: 30 });

  it("identity: empty specs returns the same graph object", () => {
    const g = appendOverlayBurns(base, []);
    expect(g).toBe(base);
    expect(g.filterComplex).toBe(base.filterComplex);
  });

  it("keeps the original concat substring intact when overlays are added", () => {
    const g = appendOverlayBurns(base, [{
      filename: "ov0.png", start: 0.5, end: 1.5, x: 640, y: 360, w: 200, h: 100, rotation: 0, opacity: 1,
    }], 2);
    expect(g.filterComplex).toContain("concat=n=1:v=1:a=1[outv][outa]");
    // overlay chain is AFTER concat
    const concatAt = g.filterComplex.indexOf("concat=n=1");
    const overlayAt = g.filterComplex.indexOf("overlay=");
    expect(overlayAt).toBeGreaterThan(concatAt);
    expect(g.filterComplex).toContain("[vout]");
    expect(g.encodeArgs).toContain("[vout]");
    expect(g.encodeArgs).not.toContain("[outv]");
    expect(g.inputArgs.filter((a) => a === "-i").length).toBe(base.inputArgs.filter((a) => a === "-i").length + 1);
  });

  it("enable window + center-anchored overlay expressions", () => {
    const g = appendOverlayBurns(base, [{
      filename: "logo.png", start: 1, end: 3, x: 100, y: 200, w: 80, h: 40, rotation: 15, opacity: 0.5,
    }], 4);
    expect(g.inputArgs.join(" ")).toContain("-loop 1 -t 4.000 -i logo.png");
    expect(g.filterComplex).toContain("enable='between(t\\,1.000\\,3.000)'");
    expect(g.filterComplex).toContain("x='100.00-w/2'");
    expect(g.filterComplex).toContain("y='200.00-h/2'");
    expect(g.filterComplex).toContain("colorchannelmixer=aa=0.500");
    expect(g.filterComplex).toContain("rotate=");
  });

  it("burns overlay fade-in and fade-out into the exported alpha channel", () => {
    const g = appendOverlayBurns(base, [{
      filename: "card.png", start: 0.5, end: 3, x: 300, y: 200, w: 500, h: 180,
      rotation: 0, opacity: 1, fadeIn: 0.25, fadeOut: 0.4,
    }], 4);
    expect(g.filterComplex).toContain("fade=t=in:st=0.500:d=0.250:alpha=1");
    expect(g.filterComplex).toContain("fade=t=out:st=2.600:d=0.400:alpha=1");
  });

  it("projectOverlayToTarget scales canvas → target and skips hidden", () => {
    const o: Overlay = {
      id: "ov1", kind: "image", assetId: "img", start: 0, end: 4, zIndex: 1,
      transform: { x: 960, y: 540, w: 384, h: 216, rotation: 0, opacity: 1 },
    };
    const s = projectOverlayToTarget(o, { width: 1920, height: 1080 }, { w: 1280, h: 720, fps: 30 })!;
    expect(s.x).toBeCloseTo(640, 5);
    expect(s.y).toBeCloseTo(360, 5);
    expect(s.w).toBeCloseTo(256, 5);
    expect(s.h).toBeCloseTo(144, 5);
    expect(projectOverlayToTarget({ ...o, hidden: true }, { width: 1920, height: 1080 }, { w: 1280, h: 720, fps: 30 })).toBeNull();
  });
});
