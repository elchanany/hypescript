import { describe, expect, it } from "vitest";
import {
  applyFitMode,
  computeFitRect,
  normalizeVideoTransform,
  resolveVideoRect,
} from "./videoTransform";
import {
  clearSelection,
  inspectorFocusFor,
  selectCaption,
  selectClip,
  selectOverlay,
} from "./selection";

describe("selection model", () => {
  it("maps clip track to inspector focus", () => {
    expect(inspectorFocusFor(selectClip("a", "video"))).toBe("video");
    expect(inspectorFocusFor(selectClip("a", "audio"))).toBe("audio");
    expect(inspectorFocusFor(selectCaption("s1"))).toBe("caption");
    expect(inspectorFocusFor(selectOverlay("o1"), { overlayKind: "text" })).toBe("text");
    expect(inspectorFocusFor(selectOverlay("o1"), { overlayKind: "image" })).toBe("image");
    expect(inspectorFocusFor(clearSelection())).toBe("project");
  });
});

describe("videoTransform", () => {
  const canvas = { width: 1920, height: 1080 };

  it("fit letterboxes wide source", () => {
    const r = computeFitRect(canvas, 1920, 800, "fit");
    expect(r.w).toBe(1920);
    expect(r.h).toBeCloseTo(800);
    expect(r.x).toBe(960);
  });

  it("fill covers tall source", () => {
    const r = computeFitRect(canvas, 1080, 1920, "fill");
    // portrait on landscape → width fills canvas, height overflows (crop)
    expect(r.w).toBe(1920);
    expect(r.h).toBeCloseTo(1920 / (1080 / 1920));
  });

  it("custom resolves stored rect", () => {
    const vt = normalizeVideoTransform({
      fitMode: "custom",
      x: 100,
      y: 200,
      w: 400,
      h: 300,
      opacity: 0.5,
      rotation: 0,
    }, canvas);
    expect(vt.opacity).toBe(0.5);
    const r = resolveVideoRect(vt, canvas, 1920, 1080);
    expect(r.w).toBe(400);
    expect(r.h).toBe(300);
    expect(r.opacity).toBe(0.5);
  });

  it("applyFitMode switches from custom to fit", () => {
    const custom = normalizeVideoTransform({ fitMode: "custom", x: 10, y: 10, w: 100, h: 100 }, canvas);
    const next = applyFitMode(custom, "fit", canvas, 1920, 1080);
    expect(next.fitMode).toBe("fit");
    expect(next.w).toBe(1920);
    expect(next.h).toBe(1080);
  });
});
