// Resolve caption layout on the project canvas from Sub overrides + CaptionStyle.

import type { CSSProperties } from "react";
import { CanvasSize } from "./canvasCoords";
import { CaptionStyle, DEFAULT_CAPTION_STYLE } from "./captionStyle";
import { Sub } from "./subtitlesEdl";

export interface CaptionLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  scale: number;
}

export function defaultCaptionLayout(canvas: CanvasSize, style: CaptionStyle = DEFAULT_CAPTION_STYLE): CaptionLayout {
  const short = Math.min(canvas.width, canvas.height);
  const fontPx = (style.fontSize / 100) * short;
  const w = Math.round(canvas.width * 0.84);
  const h = Math.round(fontPx * 2.2);
  const x = canvas.width / 2;
  const y =
    style.position === "top" ? canvas.height * 0.12
      : style.position === "center" ? canvas.height * 0.5
        : canvas.height * 0.88;
  return { x, y, w, h, rotation: 0, scale: 1 };
}

export function resolveCaptionLayout(
  sub: Sub,
  canvas: CanvasSize,
  style: CaptionStyle = DEFAULT_CAPTION_STYLE,
): CaptionLayout {
  const d = defaultCaptionLayout(canvas, style);
  const scale = Number.isFinite(sub.scale) ? Math.max(0.2, Math.min(4, sub.scale!)) : d.scale;
  return {
    x: Number.isFinite(sub.x) ? sub.x! : d.x,
    y: Number.isFinite(sub.y) ? sub.y! : d.y,
    w: Number.isFinite(sub.w) ? Math.max(40, sub.w!) : d.w,
    h: d.h * scale,
    rotation: Number.isFinite(sub.rotation) ? sub.rotation! : d.rotation,
    scale,
  };
}

export function captionLayoutToCss(layout: CaptionLayout, canvas: CanvasSize, style: CaptionStyle): CSSProperties {
  const left = ((layout.x - layout.w / 2) / canvas.width) * 100;
  const top = ((layout.y - layout.h / 2) / canvas.height) * 100;
  const width = (layout.w / canvas.width) * 100;
  const bg =
    style.bg === "box" ? "rgba(0,0,0,.72)"
      : style.bg === "soft" ? "rgba(0,0,0,.35)"
        : "transparent";
  return {
    position: "absolute",
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    minHeight: `${(layout.h / canvas.height) * 100}%`,
    transform: layout.rotation ? `rotate(${layout.rotation}deg)` : undefined,
    color: style.color,
    fontWeight: style.bold ? 700 : 500,
    fontSize: `clamp(12px, ${style.fontSize * layout.scale}cqw, 64px)`,
    background: bg,
    borderRadius: style.bg === "none" ? 0 : 8,
    padding: style.bg === "none" ? "2px 0" : "6px 4%",
    textAlign: "center",
    direction: "rtl",
    whiteSpace: "pre-line",
    lineHeight: 1.35,
    textShadow: style.bg === "box" ? "none" : "0 2px 5px #000, 0 0 10px rgba(0,0,0,.8)",
    boxSizing: "border-box",
  };
}
