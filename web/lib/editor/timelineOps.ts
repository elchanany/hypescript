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

/**
 * Roll edit between clips[leftIndex] and clips[leftIndex+1].
 * Positive delta moves the cut to the right: left grows, right shrinks.
 * Total duration of the pair is preserved. Gaps are not rolled.
 */
export function rollAtBoundary(
  clips: Clip[],
  leftIndex: number,
  delta: number,
  maxDurBySource: (sourceId: string) => number,
): Clip[] {
  if (!Number.isFinite(delta) || delta === 0) return clips;
  if (leftIndex < 0 || leftIndex >= clips.length - 1) return clips;
  const left = clips[leftIndex];
  const right = clips[leftIndex + 1];
  if (isGapClip(left) || isGapClip(right)) return clips;

  const maxL = Math.max(left.end, maxDurBySource(left.sourceId) || left.end);
  const maxR = Math.max(right.end, maxDurBySource(right.sourceId) || right.end);

  const minLeftDur = 0.05;
  const minRightDur = 0.05;
  const leftRoomGrow = Math.max(0, maxL - left.end);
  const leftRoomShrink = Math.max(0, clipDur(left) - minLeftDur);
  const rightRoomGrow = Math.max(0, right.start); // can move start earlier
  const rightRoomShrink = Math.max(0, clipDur(right) - minRightDur);

  let d = delta;
  if (d > 0) {
    // left grows (end++), right shrinks (start++)
    d = Math.min(d, leftRoomGrow, rightRoomShrink);
  } else {
    // left shrinks (end--), right grows (start--)
    d = -Math.min(-d, leftRoomShrink, rightRoomGrow);
  }
  if (d === 0) return clips;

  const arr = [...clips];
  arr[leftIndex] = { ...left, end: left.end + d };
  arr[leftIndex + 1] = { ...right, start: right.start + d };
  return arr;
}

/**
 * Slip: slide the source window of a clip without changing its timeline duration.
 * Positive delta reveals later source material.
 */
export function slipClip(
  clips: Clip[],
  id: string,
  delta: number,
  maxDuration: number,
): Clip[] {
  if (!Number.isFinite(delta) || delta === 0) return clips;
  return clips.map((c) => {
    if (c.id !== id || isGapClip(c)) return c;
    const dur = clipDur(c);
    if (dur < 0.05) return c;
    const max = Number.isFinite(maxDuration) && maxDuration > 0 ? maxDuration : c.end;
    let s = c.start + delta;
    let e = s + dur;
    if (s < 0) { s = 0; e = dur; }
    if (e > max) { e = max; s = Math.max(0, e - dur); }
    if (e - s < 0.05) return c;
    return { ...c, start: s, end: e };
  });
}
