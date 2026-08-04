// Main-video transform on the project canvas (Element Scale ≠ Viewer Zoom).
// Fit/Fill/Original compute a display rect; Custom stores free transform.
// Coordinates: CENTER anchor in project pixels (same convention as overlays).

import type { CSSProperties } from "react";
import { CanvasSize } from "./canvasCoords";

export type FitMode = "fit" | "fill" | "original" | "custom";

export interface VideoTransform {
  fitMode: FitMode;
  /** Center X in project px (used when fitMode === "custom", else derived). */
  x: number;
  /** Center Y in project px. */
  y: number;
  /** Display width in project px (custom). */
  w: number;
  /** Display height in project px (custom). */
  h: number;
  rotation: number;
  opacity: number;
  /** Lock aspect when resizing via handles / inspector. */
  uniformScale: boolean;
}

export const DEFAULT_VIDEO_TRANSFORM: VideoTransform = {
  fitMode: "fit",
  x: 960,
  y: 540,
  w: 1920,
  h: 1080,
  rotation: 0,
  opacity: 1,
  uniformScale: true,
};

export function defaultVideoTransformFor(canvas: CanvasSize): VideoTransform {
  return {
    ...DEFAULT_VIDEO_TRANSFORM,
    x: canvas.width / 2,
    y: canvas.height / 2,
    w: canvas.width,
    h: canvas.height,
  };
}

export function normalizeVideoTransform(input: unknown, canvas?: CanvasSize): VideoTransform {
  const d = defaultVideoTransformFor(canvas || { width: 1920, height: 1080 });
  if (!input || typeof input !== "object") return d;
  const raw = input as Record<string, unknown>;
  const fitMode: FitMode =
    raw.fitMode === "fit" || raw.fitMode === "fill" || raw.fitMode === "original" || raw.fitMode === "custom"
      ? raw.fitMode
      : d.fitMode;
  const num = (v: unknown, fallback: number) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
  return {
    fitMode,
    x: num(raw.x, d.x),
    y: num(raw.y, d.y),
    w: Math.max(8, num(raw.w, d.w)),
    h: Math.max(8, num(raw.h, d.h)),
    rotation: num(raw.rotation, d.rotation),
    opacity: Math.max(0, Math.min(1, num(raw.opacity, d.opacity))),
    uniformScale: raw.uniformScale === undefined ? d.uniformScale : !!raw.uniformScale,
  };
}

/** Intrinsic source size mapped into a display rect for fit/fill/original. */
export function computeFitRect(
  canvas: CanvasSize,
  sourceW: number,
  sourceH: number,
  mode: Exclude<FitMode, "custom">,
): { x: number; y: number; w: number; h: number } {
  const sw = Math.max(1, sourceW);
  const sh = Math.max(1, sourceH);
  const cw = canvas.width;
  const ch = canvas.height;
  const sar = sw / sh;
  const car = cw / ch;

  if (mode === "original") {
    const w = Math.min(sw, cw * 2);
    const h = w / sar;
    return { x: cw / 2, y: ch / 2, w, h };
  }
  if (mode === "fill") {
    let w: number, h: number;
    if (sar > car) {
      h = ch;
      w = h * sar;
    } else {
      w = cw;
      h = w / sar;
    }
    return { x: cw / 2, y: ch / 2, w, h };
  }
  // fit — contain, letterbox
  let w: number, h: number;
  if (sar > car) {
    w = cw;
    h = w / sar;
  } else {
    h = ch;
    w = h * sar;
  }
  return { x: cw / 2, y: ch / 2, w, h };
}

/** Resolve the on-canvas display rect for the main video (project px, center anchor). */
export function resolveVideoRect(
  vt: VideoTransform,
  canvas: CanvasSize,
  sourceW: number,
  sourceH: number,
): { x: number; y: number; w: number; h: number; rotation: number; opacity: number } {
  if (vt.fitMode === "custom") {
    return {
      x: vt.x,
      y: vt.y,
      w: Math.max(8, vt.w),
      h: Math.max(8, vt.h),
      rotation: vt.rotation,
      opacity: vt.opacity,
    };
  }
  const r = computeFitRect(canvas, sourceW, sourceH, vt.fitMode);
  return { ...r, rotation: vt.rotation, opacity: vt.opacity };
}

/** Apply fit preset — updates stored rect to match. */
export function applyFitMode(
  vt: VideoTransform,
  mode: FitMode,
  canvas: CanvasSize,
  sourceW: number,
  sourceH: number,
): VideoTransform {
  if (mode === "custom") return { ...vt, fitMode: "custom" };
  const r = computeFitRect(canvas, sourceW, sourceH, mode);
  return { ...vt, fitMode: mode, ...r };
}

/** CSS for the main <video> element inside .pv-canvas (percent of canvas). */
export function videoTransformCss(
  rect: { x: number; y: number; w: number; h: number; rotation: number; opacity: number },
  canvas: CanvasSize,
): CSSProperties {
  const left = ((rect.x - rect.w / 2) / canvas.width) * 100;
  const top = ((rect.y - rect.h / 2) / canvas.height) * 100;
  const width = (rect.w / canvas.width) * 100;
  const height = (rect.h / canvas.height) * 100;
  return {
    position: "absolute",
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    height: `${height}%`,
    objectFit: "fill",
    transform: rect.rotation ? `rotate(${rect.rotation}deg)` : undefined,
    opacity: rect.opacity,
    background: "transparent",
  };
}
