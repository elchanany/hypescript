// Turn project overlays into still files for FFmpeg burn-in.
// Image overlays → source asset file. Text overlays → PNG via Canvas (browser).
// Pure-ish: returns specs + blobs to write; does not touch FFmpeg.

import { MediaAsset, mediaById } from "@/lib/editor/model";
import { Overlay } from "@/lib/editor/overlay";
import { CanvasSize } from "@/lib/editor/canvasCoords";
import { RenderTarget } from "./graph";
import { OverlayBurnSpec, projectOverlayToTarget } from "./overlayBurn";

export interface MaterializedOverlay {
  spec: OverlayBurnSpec;
  /** When set, caller writes these bytes to spec.filename. When null, copy from media assetId. */
  bytes: Uint8Array | null;
  assetId: string | null;
}

function extOf(name?: string) {
  return ((name || "").toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "png");
}

async function renderTextPng(o: Overlay, canvas: CanvasSize): Promise<Uint8Array> {
  const tw = Math.max(8, Math.round(o.transform.w));
  const th = Math.max(8, Math.round(o.transform.h));
  const c = document.createElement("canvas");
  c.width = tw; c.height = th;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D לא זמין לרינדור טקסט");
  ctx.clearRect(0, 0, tw, th);
  const fs = Math.max(8, o.fontSize || Math.round(canvas.height * 0.06));
  ctx.font = `${o.bold ? 700 : 500} ${fs}px "Assistant", "Segoe UI", Arial, sans-serif`;
  ctx.fillStyle = o.color || "#ffffff";
  ctx.textAlign = o.align === "start" ? "right" : o.align === "end" ? "left" : "center";
  ctx.textBaseline = "middle";
  ctx.direction = "rtl";
  // soft shadow matching preview
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  const x = o.align === "start" ? tw - 4 : o.align === "end" ? 4 : tw / 2;
  ctx.fillText(o.text || "", x, th / 2, tw - 8);
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}

export async function materializeOverlays(
  overlays: Overlay[],
  media: MediaAsset[],
  canvas: CanvasSize,
  target: RenderTarget,
): Promise<MaterializedOverlay[]> {
  const sorted = [...overlays].filter((o) => !o.hidden).sort((a, b) => a.zIndex - b.zIndex);
  const out: MaterializedOverlay[] = [];
  let i = 0;
  for (const o of sorted) {
    const base = projectOverlayToTarget(o, canvas, target);
    if (!base) continue;
    if (o.kind === "image") {
      const asset = o.assetId ? mediaById(media, o.assetId) : undefined;
      if (!asset || asset.kind !== "image") continue;
      const filename = `ov${i}.${extOf(asset.name)}`;
      out.push({ spec: { ...base, filename }, bytes: null, assetId: asset.id });
      i++;
    } else if (o.kind === "text") {
      const bytes = await renderTextPng(o, canvas);
      const filename = `ov${i}.png`;
      out.push({ spec: { ...base, filename }, bytes, assetId: null });
      i++;
    }
  }
  return out;
}
