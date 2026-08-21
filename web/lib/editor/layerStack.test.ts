import { describe, expect, it } from "vitest";
import { Overlay } from "./overlay";
import {
  cycleLayerSelection, hitTestOverlayStack, isAtZOrderBoundary, orderedOverlays,
  layerDepth, reorderOverlayZ, zOrderPosition,
} from "./layerStack";

// שלוש שכבות חופפות באותה נקודה (960,540 = מרכז קנבס 1920x1080), zIndex 0/1/2 —
// 2 היא העליונה ביותר לפי המוסכמה (zIndex גבוה = קרוב לצופה).
function mk(id: string, zIndex: number, overrides: Partial<Overlay> = {}): Overlay {
  return {
    id, kind: "image", start: 0, end: 10, zIndex,
    transform: { x: 960, y: 540, w: 200, h: 200, rotation: 0, opacity: 1 },
    ...overrides,
  };
}

describe("hitTestOverlayStack", () => {
  it("returns all overlapping layers at a point, ordered topmost-first", () => {
    const overlays = [mk("bottom", 0), mk("mid", 1), mk("top", 2)];
    const hit = hitTestOverlayStack(overlays, 960, 540);
    expect(hit.map((o) => o.id)).toEqual(["top", "mid", "bottom"]);
  });

  it("excludes layers whose rect does not contain the point", () => {
    const far = mk("far", 5, { transform: { x: 10, y: 10, w: 20, h: 20, rotation: 0, opacity: 1 } });
    const overlays = [mk("bottom", 0), far];
    const hit = hitTestOverlayStack(overlays, 960, 540);
    expect(hit.map((o) => o.id)).toEqual(["bottom"]);
  });

  it("respects rotation when hit-testing", () => {
    // מלבן צר וגבוה, מסובב 90° — הנקודה (1040,540) בתוך התיבה המסובבת בלבד.
    const rotated = mk("r", 0, { transform: { x: 960, y: 540, w: 40, h: 300, rotation: 90, opacity: 1 } });
    expect(hitTestOverlayStack([rotated], 1040, 540).map((o) => o.id)).toEqual(["r"]);
    expect(hitTestOverlayStack([rotated], 960, 700).map((o) => o.id)).toEqual([]);
  });

  it("excludes hidden layers unconditionally", () => {
    const overlays = [mk("bottom", 0), mk("hidden-top", 2, { hidden: true })];
    const hit = hitTestOverlayStack(overlays, 960, 540, { includeLocked: true });
    expect(hit.map((o) => o.id)).toEqual(["bottom"]);
  });

  it("excludes locked layers by default but includes them on request", () => {
    const overlays = [mk("bottom", 0), mk("locked-top", 2, { locked: true })];
    expect(hitTestOverlayStack(overlays, 960, 540).map((o) => o.id)).toEqual(["bottom"]);
    expect(hitTestOverlayStack(overlays, 960, 540, { includeLocked: true }).map((o) => o.id))
      .toEqual(["locked-top", "bottom"]);
  });

  it("filters by the timeline-visible range when a time is given", () => {
    const early = mk("early", 1, { start: 0, end: 2 });
    const late = mk("late", 0, { start: 5, end: 8 });
    expect(hitTestOverlayStack([early, late], 960, 540, { time: 1 }).map((o) => o.id)).toEqual(["early"]);
    expect(hitTestOverlayStack([early, late], 960, 540, { time: 6 }).map((o) => o.id)).toEqual(["late"]);
    expect(hitTestOverlayStack([early, late], 960, 540, { time: 3.5 })).toEqual([]);
  });
});

describe("cycleLayerSelection", () => {
  const stack = [mk("top", 2), mk("mid", 1), mk("bottom", 0)]; // already topmost-first, as hitTestOverlayStack returns

  it("starts from the topmost layer when nothing is selected", () => {
    expect(cycleLayerSelection(stack, null)).toBe("top");
  });

  it("walks down the stack one Alt+Click at a time", () => {
    expect(cycleLayerSelection(stack, "top")).toBe("mid");
    expect(cycleLayerSelection(stack, "mid")).toBe("bottom");
  });

  it("wraps back to the top after the bottom layer", () => {
    expect(cycleLayerSelection(stack, "bottom")).toBe("top");
  });

  it("restarts from the top if the current selection is not part of this stack", () => {
    expect(cycleLayerSelection(stack, "unrelated-id")).toBe("top");
  });

  it("returns null for an empty stack", () => {
    expect(cycleLayerSelection([], "top")).toBeNull();
  });
});

describe("z-order: orderedOverlays / zOrderPosition / isAtZOrderBoundary", () => {
  it("orders ascending by zIndex (bottom-most first)", () => {
    const overlays = [mk("top", 2), mk("bottom", 0), mk("mid", 1)];
    expect(orderedOverlays(overlays).map((o) => o.id)).toEqual(["bottom", "mid", "top"]);
  });

  it("reports 1-based position from the back, and total layer count", () => {
    const overlays = [mk("top", 2), mk("bottom", 0), mk("mid", 1)];
    expect(zOrderPosition(overlays, "bottom")).toEqual({ position: 1, total: 3 });
    expect(zOrderPosition(overlays, "mid")).toEqual({ position: 2, total: 3 });
    expect(zOrderPosition(overlays, "top")).toEqual({ position: 3, total: 3 });
    expect(zOrderPosition(overlays, "missing")).toBeNull();
  });

  it("flags front/back boundaries correctly", () => {
    const overlays = [mk("top", 2), mk("bottom", 0), mk("mid", 1)];
    expect(isAtZOrderBoundary(overlays, "top", "front")).toBe(true);
    expect(isAtZOrderBoundary(overlays, "top", "forward")).toBe(true);
    expect(isAtZOrderBoundary(overlays, "top", "back")).toBe(false);
    expect(isAtZOrderBoundary(overlays, "bottom", "back")).toBe(true);
    expect(isAtZOrderBoundary(overlays, "bottom", "backward")).toBe(true);
    expect(isAtZOrderBoundary(overlays, "bottom", "front")).toBe(false);
    expect(isAtZOrderBoundary(overlays, "mid", "front")).toBe(false);
    expect(isAtZOrderBoundary(overlays, "mid", "back")).toBe(false);
  });
});

describe("reorderOverlayZ", () => {
  it("bring-to-front moves a layer above every other layer", () => {
    const overlays = [mk("a", 0), mk("b", 1), mk("c", 2)];
    const next = reorderOverlayZ(overlays, "a", "front");
    expect(orderedOverlays(next).map((o) => o.id)).toEqual(["b", "c", "a"]);
    // renumbered to a clean, gap-free sequence
    expect(orderedOverlays(next).map((o) => o.zIndex)).toEqual([0, 1, 2]);
  });

  it("send-to-back moves a layer below every other layer", () => {
    const overlays = [mk("a", 0), mk("b", 1), mk("c", 2)];
    const next = reorderOverlayZ(overlays, "c", "back");
    expect(orderedOverlays(next).map((o) => o.id)).toEqual(["c", "a", "b"]);
  });

  it("bring-forward swaps with the layer directly above", () => {
    const overlays = [mk("a", 0), mk("b", 1), mk("c", 2)];
    const next = reorderOverlayZ(overlays, "a", "forward");
    expect(orderedOverlays(next).map((o) => o.id)).toEqual(["b", "a", "c"]);
  });

  it("send-backward swaps with the layer directly below", () => {
    const overlays = [mk("a", 0), mk("b", 1), mk("c", 2)];
    const next = reorderOverlayZ(overlays, "c", "backward");
    expect(orderedOverlays(next).map((o) => o.id)).toEqual(["a", "c", "b"]);
  });

  it("is a no-op (same array reference) when already at the front boundary", () => {
    const overlays = [mk("a", 0), mk("b", 1), mk("c", 2)];
    expect(reorderOverlayZ(overlays, "c", "front")).toBe(overlays);
    expect(reorderOverlayZ(overlays, "c", "forward")).toBe(overlays);
  });

  it("is a no-op (same array reference) when already at the back boundary", () => {
    const overlays = [mk("a", 0), mk("b", 1), mk("c", 2)];
    expect(reorderOverlayZ(overlays, "a", "back")).toBe(overlays);
    expect(reorderOverlayZ(overlays, "a", "backward")).toBe(overlays);
  });

  it("is a no-op when the id does not exist", () => {
    const overlays = [mk("a", 0), mk("b", 1)];
    expect(reorderOverlayZ(overlays, "ghost", "front")).toBe(overlays);
  });

  it("self-heals colliding/gapped zIndex values instead of just swapping raw numbers", () => {
    // שני overlays עם אותו zIndex (למשל תוצאה של הבאג הישן ב-Inspector: ±1 בלי
    // תיאום עם שכנים) — התוצאה עדיין חייבת להיות סדר עקבי, בלי כפילויות.
    const overlays = [mk("a", 5), mk("b", 5), mk("c", 5)];
    const next = reorderOverlayZ(overlays, "a", "front");
    const zs = orderedOverlays(next).map((o) => o.zIndex);
    expect(new Set(zs).size).toBe(3);
    expect(orderedOverlays(next).at(-1)!.id).toBe("a");
  });
});

describe("layerDepth (user-facing numbering: 1 = topmost)", () => {
  it("numbers the topmost layer 1 and counts down toward the back", () => {
    const overlays = [mk("top", 2), mk("bottom", 0), mk("mid", 1)];
    expect(layerDepth(overlays, "top")).toEqual({ depth: 1, total: 3 });
    expect(layerDepth(overlays, "mid")).toEqual({ depth: 2, total: 3 });
    expect(layerDepth(overlays, "bottom")).toEqual({ depth: 3, total: 3 });
  });

  it("is the exact inverse of the internal zOrderPosition", () => {
    const overlays = [mk("a", 0), mk("b", 1), mk("c", 2), mk("d", 3)];
    for (const id of ["a", "b", "c", "d"]) {
      const pos = zOrderPosition(overlays, id)!;
      const depth = layerDepth(overlays, id)!;
      expect(depth.depth + pos.position).toBe(pos.total + 1);
      expect(depth.total).toBe(pos.total);
    }
  });

  it("returns null for an unknown id", () => {
    expect(layerDepth([mk("a", 0)], "ghost")).toBeNull();
  });

  it("stays consistent after a reorder (the badge can never disagree with the stack)", () => {
    const overlays = [mk("a", 0), mk("b", 1), mk("c", 2)];
    const next = reorderOverlayZ(overlays, "a", "front");
    expect(layerDepth(next, "a")).toEqual({ depth: 1, total: 3 });
    // topmost-first hit order and depth numbering must agree
    const stack = hitTestOverlayStack(next, 960, 540);
    expect(stack.map((o) => layerDepth(next, o.id)!.depth)).toEqual([1, 2, 3]);
  });
});
