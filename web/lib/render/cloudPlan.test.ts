import { describe, expect, it } from "vitest";
import type { Clip, MediaAsset } from "@/lib/editor/model";
import { buildConcatGraph } from "./graph";
import { cloudClipFromEditor, cloudOverlayFromMaterialized, parseCloudClips } from "./cloudPlan";

const asset: MediaAsset = {
  id: "local", name: "lesson.mp4", kind: "video",
  file: { name: "lesson.mp4" } as File, duration: 10, url: "blob:lesson",
};

describe("cloud render clip parity", () => {
  it("preserves every active clip render property and resolves the same look", () => {
    const clip: Clip = {
      id: "c1", sourceId: "local", start: 1, end: 5,
      volume: 1.6, fadeIn: 0.4, fadeOut: 0.7,
      visualFadeIn: 0.5, visualFadeOut: 0.8,
      flipX: true, flipY: true, opacity: 0.45,
      effectId: "vivid", effectAmount: 0.5, contrast: 1.2, saturation: 0.7,
    };
    const request = cloudClipFromEditor(clip, "cloud-asset");
    const [worker] = parseCloudClips([request])!;
    expect(worker).toMatchObject({
      assetId: "cloud-asset", start: 1, end: 5, volume: 1.6,
      fadeIn: 0.4, fadeOut: 0.7, visualFadeIn: 0.5, visualFadeOut: 0.8,
      flipX: true, flipY: true, opacity: 0.45,
    });
    expect(worker.look).toContain("saturation=1.175");
    expect(worker.look).toContain("eq=contrast=1.200:saturation=0.700");
    expect(buildConcatGraph([clip], [asset]).filterComplex).toContain(worker.look);
  });

  it("clamps values and never forwards a filter string supplied as an effect ID", () => {
    const [worker] = parseCloudClips([{
      assetId: "a", start: 0, end: 2, volume: 99, opacity: -4,
      contrast: 9, saturation: -3, effectId: "movie=secret.txt;[x]",
      fadeIn: 9, fadeOut: 9, visualFadeIn: 9, visualFadeOut: 9,
    }])!;
    expect(worker).toMatchObject({ volume: 2, opacity: 0, contrast: 2, saturation: 0 });
    expect(worker.fadeIn + worker.fadeOut).toBeCloseTo(2, 6);
    expect(worker.visualFadeIn + worker.visualFadeOut).toBeCloseTo(2, 6);
    expect(worker.look).toBe("eq=contrast=2.000:saturation=0.000");
  });

  it("serializes explicit gaps without requiring an asset", () => {
    const gap: Clip = { id: "g", sourceId: "__gap__", start: 4, end: 6 };
    expect(parseCloudClips([cloudClipFromEditor(gap)])?.[0]).toMatchObject({ gap: true, start: 0, end: 2, look: "" });
  });

  it("sends browser-rasterized text/rounded overlays inline", () => {
    const overlay = cloudOverlayFromMaterialized({
      spec: { filename: "ov0.png", start: 1, end: 3, x: 100, y: 80, w: 240, h: 90, rotation: 5, opacity: 0.8 },
      bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]),
      assetId: null,
    });
    expect(overlay.inlinePngBase64).toBe("iVBORwECAwQ=");
    expect(overlay).toMatchObject({ start: 1, end: 3, width: 240, height: 90, rotation: 5, opacity: 0.8 });
  });
});
