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
  if (o.background && o.background !== "transparent") {
    ctx.save();
    ctx.fillStyle = o.background;
    const radius = Math.max(0, Math.min(Math.min(tw, th) / 2, o.borderRadius || 0));
    ctx.beginPath();
    ctx.roundRect(0, 0, tw, th, radius);
    ctx.fill();
    ctx.restore();
  }
  if ((o.borderWidth || 0) > 0 && o.borderColor) {
    ctx.save();
    ctx.strokeStyle = o.borderColor;
    ctx.lineWidth = Math.max(1, o.borderWidth || 0);
    const inset = ctx.lineWidth / 2;
    const radius = Math.max(0, Math.min(Math.min(tw, th) / 2, o.borderRadius || 0));
    ctx.beginPath(); ctx.roundRect(inset, inset, tw - ctx.lineWidth, th - ctx.lineWidth, Math.max(0, radius - inset)); ctx.stroke(); ctx.restore();
  }
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
  const pad = Math.max(8, fs * 0.2);
  const x = o.align === "start" ? tw - pad : o.align === "end" ? pad : tw / 2;
  const lines = (o.text || "").split(/\r?\n/).filter((line) => line.trim() || line === "");
  const lineHeight = fs * 1.18;
  const firstY = th / 2 - ((Math.max(1, lines.length) - 1) * lineHeight) / 2;
  (lines.length ? lines : [""]).forEach((line, index) => ctx.fillText(line, x, firstY + index * lineHeight, tw - pad * 2));
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}

async function renderRoundedImagePng(o: Overlay, assetUrl: string): Promise<Uint8Array> {
  const ratio = Math.max(0.05, o.transform.w / Math.max(1, o.transform.h));
  const tw = Math.max(16, Math.min(1400, Math.round(ratio >= 1 ? 1200 : 1200 * ratio)));
  const th = Math.max(16, Math.min(1400, Math.round(ratio >= 1 ? 1200 / ratio : 1200)));
  const img = new Image();
  img.src = assetUrl;
  await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("טעינת תמונת שכבה נכשלה")); });
  const c = document.createElement("canvas"); c.width = tw; c.height = th;
  const ctx = c.getContext("2d"); if (!ctx) throw new Error("Canvas 2D לא זמין לרינדור תמונה");
  const radiusRatio = Math.max(0, Math.min(0.5, (o.borderRadius || 0) / Math.max(1, Math.min(o.transform.w, o.transform.h))));
  const radius = radiusRatio * Math.min(tw, th);
  ctx.beginPath(); ctx.roundRect(0, 0, tw, th, radius); ctx.clip();
  const imageRatio = img.naturalWidth / Math.max(1, img.naturalHeight);
  let dw = tw, dh = th, dx = 0, dy = 0;
  if (imageRatio > ratio) { dh = tw / imageRatio; dy = (th - dh) / 2; }
  else { dw = th * imageRatio; dx = (tw - dw) / 2; }
  ctx.drawImage(img, dx, dy, dw, dh);
  const blob = await new Promise<Blob>((resolve, reject) => c.toBlob((value) => value ? resolve(value) : reject(new Error("toBlob failed")), "image/png"));
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
      const rounded = (o.borderRadius || 0) > 0;
      const filename = rounded ? `ov${i}.png` : `ov${i}.${extOf(asset.name)}`;
      const bytes = rounded ? await renderRoundedImagePng(o, asset.url) : null;
      out.push({ spec: { ...base, filename }, bytes, assetId: rounded ? null : asset.id });
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
