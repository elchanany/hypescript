// Timeline edit semantics beyond dense concat: gaps, ripple vs leave-gap delete.
// Gaps are real Clip rows with sourceId === GAP_SOURCE (black + silence in preview/export).

import { Clip, clipDur, uid } from "./model";

export const GAP_SOURCE = "__gap__";
export const isGapClip = (c: Clip): boolean => c.sourceId === GAP_SOURCE;

export function makeGap(duration: number, id?: string): Clip {
  const d = Math.max(0.05, duration);
  return { id: id || uid("gap"), sourceId: GAP_SOURCE, start: 0, end: d };
}

/** Ripple delete — remove clip and close the hole (default CapCut-like delete). */
export function removeClipRipple(clips: Clip[], id: string): Clip[] {
  return clips.filter((c) => c.id !== id);
}

/** Leave gap — replace the clip with a black/silence gap of the same timeline duration. */
export function removeClipLeaveGap(clips: Clip[], id: string): Clip[] {
  const i = clips.findIndex((c) => c.id === id);
  if (i < 0) return clips;
  const d = clipDur(clips[i]);
  if (d < 0.05) return clips.filter((c) => c.id !== id);
  const arr = [...clips];
  arr[i] = makeGap(d);
  return arr;
}

/** Close a gap (ripple the rest left). No-op if not a gap. */
export function closeGap(clips: Clip[], id: string): Clip[] {
  const c = clips.find((x) => x.id === id);
  if (!c || !isGapClip(c)) return clips;
  return clips.filter((x) => x.id !== id);
}

/** Trim a gap's duration (start always 0; end = duration). */
export function trimGap(clips: Clip[], id: string, duration: number): Clip[] {
  return clips.map((c) => {
    if (c.id !== id || !isGapClip(c)) return c;
    return { ...c, start: 0, end: Math.max(0.05, duration) };
  });
}
