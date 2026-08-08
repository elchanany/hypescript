// Visual overlay elements (image / logo / text) that sit ABOVE the main video on
// the project canvas. Non-destructive: an overlay references an asset (image) or
// carries its own text; it never mutates source media. Position/size are stored
// in PROJECT coordinates (independent of the preview/browser size), with the
// element CENTER as the single anchor (documented source of truth).

import { uid } from "./model";

export type OverlayKind = "image" | "text";

// Single transform source of truth. position = element CENTER, in project px.
export interface VisualTransform {
  x: number;        // center X, project px
  y: number;        // center Y, project px
  w: number;        // width, project px
  h: number;        // height, project px
  rotation: number; // degrees, clockwise
  opacity: number;  // 0..1
}

export interface Overlay {
  id: string;
  kind: OverlayKind;
  assetId?: string;      // image overlays
  text?: string;         // text overlays
  color?: string;        // text color
  fontSize?: number;     // text size, project px
  bold?: boolean;
  align?: "start" | "center" | "end";
  background?: string;
  borderRadius?: number;
  borderColor?: string;
  borderWidth?: number;
  fadeIn?: number;
  fadeOut?: number;
  start: number;         // timeline (assembled) seconds
  end: number;
  transform: VisualTransform;
  locked?: boolean;
  hidden?: boolean;
  zIndex: number;
}

export const overlayVisibleAt = (o: Overlay, t: number): boolean =>
  !o.hidden && t >= o.start - 1e-3 && t <= o.end + 1e-3;

export const nextZ = (overlays: Overlay[]): number =>
  overlays.reduce((m, o) => Math.max(m, o.zIndex), 0) + 1;

export function makeImageOverlay(
  assetId: string, canvasW: number, canvasH: number, overlays: Overlay[],
  start = 0, end = 4, intrinsic?: { width: number; height: number },
): Overlay {
  // Fit image into ~40% of canvas width, preserving intrinsic aspect (fallback 1:1).
  const ar = (intrinsic && intrinsic.width > 0 && intrinsic.height > 0)
    ? intrinsic.width / intrinsic.height
    : 1;
  const w = Math.round(canvasW * 0.4);
  const h = Math.round(w / ar);
  return {
    id: uid("ov"), kind: "image", assetId, start, end, zIndex: nextZ(overlays),
    transform: { x: canvasW / 2, y: canvasH / 2, w, h, rotation: 0, opacity: 1 },
  };
}

export function makeTextOverlay(canvasW: number, canvasH: number, overlays: Overlay[], text = "טקסט חדש", start = 0, end = 4): Overlay {
  const fontSize = Math.round(canvasH * 0.06);
  const w = Math.round(canvasW * 0.7);
  const h = Math.round(fontSize * 1.6);
  return {
    id: uid("ov"), kind: "text", text, color: "#ffffff", fontSize, bold: true, align: "center",
    start, end, zIndex: nextZ(overlays),
    transform: { x: canvasW / 2, y: Math.round(canvasH * 0.8), w, h, rotation: 0, opacity: 1 },
  };
}

export type TitlePopupPreset = "source_popup" | "speaker_card" | "dedication_card";
export function makeTitlePopup(canvasW: number, canvasH: number, overlays: Overlay[], text: string, start = 0, end = 4, preset: TitlePopupPreset = "source_popup"): Overlay {
  const base = makeTextOverlay(canvasW, canvasH, overlays, text, start, end);
  const speaker = preset === "speaker_card";
  const dedication = preset === "dedication_card";
  return {
    ...base,
    fontSize: Math.round(canvasH * (dedication ? 0.045 : 0.052)),
    background: dedication ? "rgba(13,25,48,0.94)" : speaker ? "rgba(4,20,35,0.90)" : "rgba(8,12,20,0.82)",
    borderRadius: Math.round(canvasH * 0.025),
    borderColor: dedication ? "#d6ad55" : speaker ? "#16d9e3" : "rgba(255,255,255,0.20)",
    borderWidth: Math.max(2, Math.round(canvasH * 0.003)),
    fadeIn: 0.22,
    fadeOut: 0.22,
    transform: {
      ...base.transform,
      x: speaker ? Math.round(canvasW * 0.67) : canvasW / 2,
      y: dedication ? Math.round(canvasH * 0.3) : Math.round(canvasH * 0.78),
      w: Math.round(canvasW * (speaker ? 0.54 : 0.78)),
      h: Math.round(canvasH * (dedication ? 0.19 : speaker ? 0.16 : 0.13)),
    },
  };
}

// pure helpers used by manipulation + tests
export const clampOpacity = (v: number) => Math.max(0, Math.min(1, v));
export function moveOverlay(o: Overlay, dxProj: number, dyProj: number): Overlay {
  return { ...o, transform: { ...o.transform, x: o.transform.x + dxProj, y: o.transform.y + dyProj } };
}
export function resizeOverlayTo(o: Overlay, w: number, h: number): Overlay {
  return { ...o, transform: { ...o.transform, w: Math.max(8, w), h: Math.max(8, h) } };
}
