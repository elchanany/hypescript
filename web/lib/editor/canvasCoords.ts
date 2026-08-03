// Project ↔ viewport coordinate math. The project canvas has a fixed size (e.g.
// 1920×1080) that is INDEPENDENT of the preview/browser size. The preview shows
// the canvas letterboxed ("contain") inside the stage. All overlay transforms
// are stored in project px; these helpers convert to/from CSS px for rendering
// and hit-testing. Pure + unit-tested.

export interface CanvasSize { width: number; height: number; }
export interface Rect { x: number; y: number; width: number; height: number; }
export interface Point { x: number; y: number; }

// The rectangle (CSS px, relative to stage top-left) where the canvas is drawn,
// letterboxed to preserve aspect ratio inside the stage.
export function displayRect(stageW: number, stageH: number, canvas: CanvasSize): Rect {
  if (stageW <= 0 || stageH <= 0 || canvas.width <= 0 || canvas.height <= 0) return { x: 0, y: 0, width: 0, height: 0 };
  const scale = Math.min(stageW / canvas.width, stageH / canvas.height);
  const width = canvas.width * scale;
  const height = canvas.height * scale;
  return { x: (stageW - width) / 2, y: (stageH - height) / 2, width, height };
}

// project px per 1 CSS px would be 1/scale; this returns CSS px per project px.
export function getViewportScale(canvas: CanvasSize, rect: Rect): number {
  return canvas.width > 0 ? rect.width / canvas.width : 1;
}

export function projectToViewport(px: number, py: number, canvas: CanvasSize, rect: Rect): Point {
  const s = getViewportScale(canvas, rect);
  return { x: rect.x + px * s, y: rect.y + py * s };
}

export function viewportToProject(vx: number, vy: number, canvas: CanvasSize, rect: Rect): Point {
  const s = getViewportScale(canvas, rect) || 1;
  return { x: (vx - rect.x) / s, y: (vy - rect.y) / s };
}

// convert a delta in CSS px to a delta in project px (scale only, no origin)
export function viewportDeltaToProject(dx: number, dy: number, canvas: CanvasSize, rect: Rect): Point {
  const s = getViewportScale(canvas, rect) || 1;
  return { x: dx / s, y: dy / s };
}

// rotate a point (px,py) around center (cx,cy) by -deg (used for hit-testing in
// the element's local, un-rotated frame).
export function rotatePoint(px: number, py: number, cx: number, cy: number, deg: number): Point {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r), sin = Math.sin(r);
  const dx = px - cx, dy = py - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

// hit test a center-anchored, rotated rectangle (all in the same coordinate
// space). Returns true if (px,py) is inside.
export function hitTestRect(px: number, py: number, cx: number, cy: number, w: number, h: number, rotationDeg: number): boolean {
  const local = rotatePoint(px, py, cx, cy, -rotationDeg);
  return Math.abs(local.x - cx) <= w / 2 && Math.abs(local.y - cy) <= h / 2;
}

export function defaultCanvasFor(vw?: number, vh?: number): CanvasSize {
  if (vw && vh && vw > 0 && vh > 0) return { width: Math.round(vw), height: Math.round(vh) };
  return { width: 1920, height: 1080 };
}
