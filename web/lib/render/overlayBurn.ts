// Post-concat overlay burn-in for export. Keeps buildConcatGraph untouched:
// when specs are empty the graph is returned unchanged (byte-identical filter).
// Overlay specs are already in TARGET pixel space (center-anchored), with
// start/end in assembled timeline seconds. Image/text both arrive as still files.

import { RenderGraph, RenderTarget } from "./graph";
import { Overlay } from "@/lib/editor/overlay";
import { CanvasSize } from "@/lib/editor/canvasCoords";

export interface OverlayBurnSpec {
  filename: string; // file already listed in writes / to be written by caller
  start: number;
  end: number;
  x: number; // center X in target px
  y: number; // center Y in target px
  w: number; // width in target px
  h: number; // height in target px
  rotation: number; // degrees clockwise
  opacity: number; // 0..1
}

/** Scale a project-space overlay into export-target pixel space. */
export function projectOverlayToTarget(o: Overlay, canvas: CanvasSize, target: RenderTarget): OverlayBurnSpec | null {
  if (o.hidden || o.end <= o.start) return null;
  const sx = target.w / Math.max(1, canvas.width);
  const sy = target.h / Math.max(1, canvas.height);
  const t = o.transform;
  return {
    filename: "", // filled by caller
    start: o.start,
    end: o.end,
    x: t.x * sx,
    y: t.y * sy,
    w: Math.max(2, t.w * sx),
    h: Math.max(2, t.h * sy),
    rotation: t.rotation || 0,
    opacity: Math.max(0, Math.min(1, t.opacity ?? 1)),
  };
}

/**
 * Append overlay filter chain AFTER the verified concat `[outv][outa]`.
 * Returns the original graph object when specs is empty (identity).
 * `totalDuration` bounds looped still inputs so FFmpeg cannot run forever.
 */
export function appendOverlayBurns(graph: RenderGraph, specs: OverlayBurnSpec[], totalDuration = 0): RenderGraph {
  if (!specs.length) return graph;
  if (!graph.filterComplex.includes("[outv][outa]")) {
    throw new Error("appendOverlayBurns: expected concat output [outv][outa]");
  }
  // still inputs must be finite — -loop 1 without -t hangs the encode
  const loopT = Math.max(0.1, totalDuration || Math.max(...specs.map((s) => s.end), 0.1));

  const inputArgs = [...graph.inputArgs];
  const writes = [...graph.writes];
  // count existing inputs (-i occurrences)
  let ic = 0;
  for (let i = 0; i < inputArgs.length; i++) if (inputArgs[i] === "-i") ic++;

  const parts: string[] = [];
  let vlabel = "outv";

  specs.forEach((o, i) => {
    const fn = o.filename;
    if (!writes.some((w) => w.filename === fn)) {
      writes.push({ assetId: `__ov_${i}`, filename: fn });
    }
    const idx = ic++;
    inputArgs.push("-loop", "1", "-t", loopT.toFixed(3), "-i", fn);

    const w = Math.max(2, Math.round(o.w));
    const h = Math.max(2, Math.round(o.h));
    const op = o.opacity.toFixed(3);
    const cx = o.x.toFixed(2);
    const cy = o.y.toFixed(2);
    const s = o.start.toFixed(3);
    const e = o.end.toFixed(3);

    let prep = `[${idx}:v]scale=${w}:${h}:flags=bicubic,format=rgba,colorchannelmixer=aa=${op}`;
    if (Math.abs(o.rotation) > 0.01) {
      const rad = (o.rotation * Math.PI) / 180;
      prep += `,rotate=${rad.toFixed(6)}:c=none:ow=rotw(iw):oh=roth(ih)`;
    }
    prep += `[ov${i}]`;
    parts.push(prep);

    const next = i === specs.length - 1 ? "vout" : `tmpv${i}`;
    // center-anchored: overlay x/y expressions use overlay frame size (w/h)
    parts.push(
      `[${vlabel}][ov${i}]overlay=x='${cx}-w/2':y='${cy}-h/2':enable='between(t\\,${s}\\,${e})'[${next}]`,
    );
    vlabel = next;
  });

  const filterComplex = graph.filterComplex + ";" + parts.join(";");
  const encodeArgs = graph.encodeArgs.map((a) => (a === "[outv]" ? "[vout]" : a));

  return { ...graph, writes, inputArgs, filterComplex, encodeArgs };
}
