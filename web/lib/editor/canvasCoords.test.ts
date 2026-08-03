import { describe, it, expect } from "vitest";
import {
  displayRect, getViewportScale, projectToViewport, viewportToProject, viewportDeltaToProject, hitTestRect, defaultCanvasFor,
} from "./canvasCoords";

const canvas = { width: 1920, height: 1080 };

describe("canvasCoords", () => {
  it("letterboxes a 16:9 canvas inside a wider stage (pillarbox)", () => {
    const r = displayRect(1000, 400, canvas); // stage 2.5:1, canvas 1.78:1 -> limited by height
    expect(r.height).toBeCloseTo(400, 5);
    expect(r.width).toBeCloseTo(400 * 16 / 9, 3);
    expect(r.x).toBeGreaterThan(0); // centered horizontally
    expect(r.y).toBeCloseTo(0, 5);
  });

  it("letterboxes inside a taller stage (letterbox top/bottom)", () => {
    const r = displayRect(800, 800, canvas); // limited by width
    expect(r.width).toBeCloseTo(800, 5);
    expect(r.height).toBeCloseTo(800 * 9 / 16, 3);
    expect(r.y).toBeGreaterThan(0);
  });

  it("maps project center to viewport center and back (round trip)", () => {
    const r = displayRect(960, 540, canvas); // exact half -> scale 0.5, no letterbox
    expect(getViewportScale(canvas, r)).toBeCloseTo(0.5, 6);
    const v = projectToViewport(960, 540, canvas, r); // canvas center
    expect(v.x).toBeCloseTo(480, 3);
    expect(v.y).toBeCloseTo(270, 3);
    const back = viewportToProject(v.x, v.y, canvas, r);
    expect(back.x).toBeCloseTo(960, 3);
    expect(back.y).toBeCloseTo(540, 3);
  });

  it("scales deltas by the viewport scale", () => {
    const r = displayRect(960, 540, canvas); // scale 0.5
    const d = viewportDeltaToProject(50, 20, canvas, r);
    expect(d.x).toBeCloseTo(100, 3);
    expect(d.y).toBeCloseTo(40, 3);
  });

  it("hit-tests an axis-aligned rectangle", () => {
    expect(hitTestRect(500, 300, 500, 300, 200, 100, 0)).toBe(true);
    expect(hitTestRect(610, 300, 500, 300, 200, 100, 0)).toBe(false); // outside width/2=100
    expect(hitTestRect(599, 300, 500, 300, 200, 100, 0)).toBe(true);
  });

  it("hit-tests a rotated rectangle (90°)", () => {
    // a 200×100 rect rotated 90° occupies 100 wide × 200 tall in world space
    expect(hitTestRect(500, 380, 500, 300, 200, 100, 90)).toBe(true);  // within tall extent
    expect(hitTestRect(560, 300, 500, 300, 200, 100, 90)).toBe(false); // outside narrow extent
  });

  it("defaultCanvasFor uses video size or falls back to 1920×1080", () => {
    expect(defaultCanvasFor(1280, 720)).toEqual({ width: 1280, height: 720 });
    expect(defaultCanvasFor()).toEqual({ width: 1920, height: 1080 });
    expect(defaultCanvasFor(0, 0)).toEqual({ width: 1920, height: 1080 });
  });
});
