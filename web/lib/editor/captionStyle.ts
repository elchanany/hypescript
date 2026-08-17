// Project-level caption look — preview + optional burn-in on export.

import type { CSSProperties } from "react";

export type CaptionPosition = "bottom" | "center" | "top";
export type CaptionBg = "none" | "soft" | "box";

export interface CaptionStyle {
  fontFamily?: string; // e.g. "Heebo", "Assistant", "Rubik"
  fontSize: number; // percent of canvas short-side, typically 3–8
  color: string; // #rrggbb
  bold: boolean;
  position: CaptionPosition;
  bg: CaptionBg;
}

export const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  fontSize: 4.5,
  color: "#ffffff",
  bold: true,
  position: "bottom",
  bg: "soft",
};

export function normalizeCaptionStyle(input: unknown): CaptionStyle {
  const d = DEFAULT_CAPTION_STYLE;
  if (!input || typeof input !== "object") return { ...d };
  const raw = input as Record<string, unknown>;
  const fontSize = Number(raw.fontSize);
  const color = typeof raw.color === "string" && /^#[0-9a-fA-F]{6}$/.test(raw.color)
    ? raw.color
    : d.color;
  const position: CaptionPosition =
    raw.position === "top" || raw.position === "center" || raw.position === "bottom"
      ? raw.position
      : d.position;
  const bg: CaptionBg =
    raw.bg === "none" || raw.bg === "soft" || raw.bg === "box" ? raw.bg : d.bg;
  const fontFamily = typeof raw.fontFamily === "string" && raw.fontFamily.trim()
    ? raw.fontFamily.trim()
    : undefined;
  return {
    ...(fontFamily ? { fontFamily } : {}),
    fontSize: Number.isFinite(fontSize) ? Math.max(2, Math.min(12, fontSize)) : d.fontSize,
    color,
    bold: raw.bold !== undefined ? !!raw.bold : d.bold,
    position,
    bg,
  };
}

/** CSS properties for the on-canvas caption overlay. */
export function captionStyleToCss(style: CaptionStyle): CSSProperties {
  const pos: CSSProperties =
    style.position === "top" ? { top: "6%", bottom: "auto" }
      : style.position === "center" ? { top: "50%", bottom: "auto", transform: "translateY(-50%)" }
        : { bottom: "6%", top: "auto" };
  const bg =
    style.bg === "box" ? "rgba(0,0,0,.72)"
      : style.bg === "soft" ? "rgba(0,0,0,.35)"
        : "transparent";
  return {
    ...pos,
    fontFamily: style.fontFamily ? `"${style.fontFamily}", system-ui, sans-serif` : undefined,
    color: style.color,
    fontWeight: style.bold ? 700 : 500,
    fontSize: `clamp(12px, ${style.fontSize}cqw, 42px)`,
    background: bg,
    borderRadius: style.bg === "none" ? 0 : 8,
    padding: style.bg === "none" ? "0 6%" : "6px 4%",
    textShadow: style.bg === "box" ? "none" : "0 2px 5px #000, 0 0 10px rgba(0,0,0,.8)",
  };
}
