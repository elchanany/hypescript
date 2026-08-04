// Post-concat main-video transform for export (Element Scale on the project canvas).
// Identity when the resolved rect fills the canvas with no rotation/opacity change —
// keeps existing concat graphs byte-identical for the default Fit case.

import { RenderGraph, RenderTarget } from "./graph";
import { CanvasSize } from "@/lib/editor/canvasCoords";
import { VideoTransform, resolveVideoRect } from "@/lib/editor/videoTransform";

export function isIdentityVideoTransform(
  vt: VideoTransform,
  canvas: CanvasSize,
  sourceW: number,
  sourceH: number,
): boolean {
  const r = resolveVideoRect(vt, canvas, sourceW || canvas.width, sourceH || canvas.height);
  return (
    Math.abs(r.rotation) < 0.05
    && r.opacity >= 0.999
    && Math.abs(r.w - canvas.width) < 2
    && Math.abs(r.h - canvas.height) < 2
    && Math.abs(r.x - canvas.width / 2) < 2
    && Math.abs(r.y - canvas.height / 2) < 2
  );
}

/**
 * Place the concatenated [outv] onto a black target canvas according to VideoTransform.
 * Remaps concat output to [rawv], emits a new [outv] so overlay/caption burns stay chained.
 */
export function appendMainVideoTransform(
  graph: RenderGraph,
  vt: VideoTransform,
  canvas: CanvasSize,
  target: RenderTarget,
  sourceW: number,
  sourceH: number,
): RenderGraph {
  if (!graph.filterComplex.includes("[outv][outa]")) {
    throw new Error("appendMainVideoTransform: expected concat output [outv][outa]");
  }
  if (isIdentityVideoTransform(vt, canvas, sourceW, sourceH)) return graph;

  const rect = resolveVideoRect(vt, canvas, sourceW || canvas.width, sourceH || canvas.height);
  const sx = target.w / Math.max(1, canvas.width);
  const sy = target.h / Math.max(1, canvas.height);
  const tw = Math.max(2, Math.round(rect.w * sx));
  const th = Math.max(2, Math.round(rect.h * sy));
  const cx = rect.x * sx;
  const cy = rect.y * sy;
  const op = Math.max(0, Math.min(1, rect.opacity));
  const TW = target.w;
  const TH = target.h;

  // Count existing -i so we can append a black plate when rotation is needed.
  let ic = 0;
  for (let i = 0; i < graph.inputArgs.length; i++) if (graph.inputArgs[i] === "-i") ic++;

  const base = graph.filterComplex.replace("[outv][outa]", "[rawv][outa]");
  const inputArgs = [...graph.inputArgs];
  let extra: string;

  if (Math.abs(rect.rotation) > 0.05) {
    const blackIdx = ic;
    inputArgs.push("-f", "lavfi", "-i", `color=c=black:s=${TW}x${TH}:r=${target.fps}`);
    const rad = (rect.rotation * Math.PI) / 180;
    extra =
      `[rawv]scale=${tw}:${th}:flags=bicubic,format=rgba,colorchannelmixer=aa=${op.toFixed(3)},`
      + `rotate=${rad.toFixed(6)}:c=none:ow=rotw(iw):oh=roth(ih)[main];`
      + `[${blackIdx}:v]format=yuv420p[bg];`
      + `[bg][main]overlay=x='${cx.toFixed(2)}-w/2':y='${cy.toFixed(2)}-h/2':shortest=1,format=yuv420p[outv]`;
  } else {
    // pad is enough — no extra input
    const x = Math.round(cx - tw / 2);
    const y = Math.round(cy - th / 2);
    if (op >= 0.999) {
      extra =
        `[rawv]scale=${tw}:${th}:flags=bicubic,pad=${TW}:${TH}:${x}:${y}:black,setsar=1,format=yuv420p[outv]`;
    } else {
      const blackIdx = ic;
      inputArgs.push("-f", "lavfi", "-i", `color=c=black:s=${TW}x${TH}:r=${target.fps}`);
      extra =
        `[rawv]scale=${tw}:${th}:flags=bicubic,format=rgba,colorchannelmixer=aa=${op.toFixed(3)}[main];`
        + `[${blackIdx}:v]format=yuv420p[bg];`
        + `[bg][main]overlay=x=${x}:y=${y}:shortest=1,format=yuv420p[outv]`;
    }
  }

  return {
    ...graph,
    inputArgs,
    filterComplex: `${base};${extra}`,
  };
}
