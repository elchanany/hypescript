import { Sub } from "@/lib/editor/subtitlesEdl";
import { CaptionStyle, DEFAULT_CAPTION_STYLE, normalizeCaptionStyle } from "@/lib/editor/captionStyle";
import { CanvasSize } from "@/lib/editor/canvasCoords";
import { RenderTarget } from "./graph";
import { OverlayBurnSpec } from "./overlayBurn";
import { MaterializedOverlay } from "./materializeOverlays";

export interface CaptionLayout {
  /** Center X/Y in target pixels */
  x: number;
  y: number;
  w: number;
  h: number;
  fontPx: number;
  padX: number;
  padY: number;
}

/** Where the caption band sits (center Y as fraction of frame height). */
export function captionYFraction(position: CaptionStyle["position"]): number {
  if (position === "top") return 0.08;
  if (position === "center") return 0.5;
  return 0.92;
}

export function captionLayoutForTarget(
  style: CaptionStyle,
  canvas: CanvasSize,
  target: RenderTarget,
  lineCount = 1,
): CaptionLayout {
  const st = normalizeCaptionStyle(style);
  const short = Math.min(canvas.width, canvas.height);
  const fontPx = Math.max(14, Math.round((st.fontSize / 100) * short * (target.h / Math.max(1, canvas.height))));
  const padX = Math.round(target.w * 0.04);
  const padY = Math.round(fontPx * 0.35);
  const w = Math.max(32, Math.round(target.w * 0.88));
  const lines = Math.max(1, lineCount);
  const h = Math.max(24, Math.round(fontPx * 1.35 * lines + padY * 2));
  const x = target.w / 2;
  const y = target.h * captionYFraction(st.position);
  return { x, y, w, h, fontPx, padX, padY };
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const clean = text.replace(/\u200F/g, "").trim();
  if (!clean) return [""];
  const paragraphs = clean.split(/\n+/);
  const out: string[] = [];
  for (const p of paragraphs) {
    const words = p.split(/\s+/).filter(Boolean);
    let line = "";
    for (const w of words) {
      const trial = line ? `${line} ${w}` : w;
      if (ctx.measureText(trial).width <= maxWidth || !line) line = trial;
      else { out.push(line); line = w; }
    }
    if (line) out.push(line);
  }
  return out.length ? out : [""];
}

async function renderCaptionPng(
  text: string,
  style: CaptionStyle,
  layout: CaptionLayout,
): Promise<{ bytes: Uint8Array; w: number; h: number }> {
  const st = normalizeCaptionStyle(style);
  const c = document.createElement("canvas");
  // measure first
  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) throw new Error("Canvas 2D לא זמין לצריבת כתוביות");
  probe.font = `${st.bold ? 700 : 500} ${layout.fontPx}px "Assistant", "Segoe UI", Arial, sans-serif`;
  const lines = wrapLines(probe, text, layout.w - layout.padX * 2);
  const layout2 = { ...layout, h: Math.max(24, Math.round(layout.fontPx * 1.35 * lines.length + layout.padY * 2)) };

  c.width = layout2.w;
  c.height = layout2.h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D לא זמין לצריבת כתוביות");

  if (st.bg === "box") {
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    roundRect(ctx, 0, 0, c.width, c.height, 10);
    ctx.fill();
  } else if (st.bg === "soft") {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    roundRect(ctx, 0, 0, c.width, c.height, 10);
    ctx.fill();
  }

  ctx.font = `${st.bold ? 700 : 500} ${layout2.fontPx}px "Assistant", "Segoe UI", Arial, sans-serif`;
  ctx.fillStyle = st.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "rtl";
  if (st.bg !== "box") {
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
  }
  const midY = c.height / 2;
  const lineH = layout2.fontPx * 1.35;
  const startY = midY - ((lines.length - 1) * lineH) / 2;
  lines.forEach((ln, i) => ctx.fillText(ln, c.width / 2, startY + i * lineH, c.width - layout2.padX * 2));

  const blob = await new Promise<Blob>((res, rej) =>
    c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png"),
  );
  return { bytes: new Uint8Array(await blob.arrayBuffer()), w: c.width, h: c.height };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Materialize caption cues for burn-in. Caps at 80 cues to keep the filter graph
 * tractable in ffmpeg.wasm (long lessons can produce many short cues).
 */
export async function materializeCaptions(
  subs: Sub[] | null | undefined,
  style: CaptionStyle | null | undefined,
  canvas: CanvasSize,
  target: RenderTarget,
  maxCues = 80,
): Promise<MaterializedOverlay[]> {
  if (!subs?.length) return [];
  const st = normalizeCaptionStyle(style || DEFAULT_CAPTION_STYLE);
  const baseLayout = captionLayoutForTarget(st, canvas, target, 1);
  const list = subs.filter((s) => s.end > s.start && (s.text || "").trim()).slice(0, maxCues);
  const out: MaterializedOverlay[] = [];
  // Deduplicate identical text → shared PNG bytes
  const pngCache = new Map<string, { bytes: Uint8Array; w: number; h: number }>();

  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    const key = `${st.fontSize}|${st.color}|${st.bold}|${st.bg}|${s.text}`;
    let png = pngCache.get(key);
    if (!png) {
      png = await renderCaptionPng(s.text, st, baseLayout);
      pngCache.set(key, png);
    }
    const filename = `cap${i}.png`;
    // When cached from another cue, still write unique filename (ffmpeg inputs)
    // but reuse bytes.
    const spec: OverlayBurnSpec = {
      filename,
      start: s.start,
      end: s.end,
      x: baseLayout.x,
      y: baseLayout.y,
      w: png.w,
      h: png.h,
      rotation: 0,
      opacity: 1,
    };
    out.push({ spec, bytes: png.bytes, assetId: null });
  }
  return out;
}
