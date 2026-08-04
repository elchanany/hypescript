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

/**
 * Free-drop Move: lift the clip (leave a gap at the old spot) and place it so its
 * timeline start equals `targetStart`. Gaps before/after are allowed; destination
 * span is overwritten (CapCut-style Overwrite default).
 */
export function moveClipToTime(clips: Clip[], id: string, targetStart: number): Clip[] {
  const i = clips.findIndex((c) => c.id === id);
  if (i < 0) return clips;
  const moving = clips[i];
  if (isGapClip(moving)) return clips;
  const dur = clipDur(moving);
  if (dur < 0.05) return clips;
  const t0 = Math.max(0, Number.isFinite(targetStart) ? targetStart : 0);

  const lifted = removeClipLeaveGap(clips, id);
  return mergeAdjacentGaps(overwriteRange(lifted, t0, t0 + dur, moving));
}

/** Replace [start,end) on the assembled timeline with `clip`. */
export function overwriteRange(clips: Clip[], start: number, end: number, clip: Clip): Clip[] {
  const span = Math.max(0.05, end - start);
  const placed: Clip = isGapClip(clip)
    ? makeGap(span, clip.id)
    : { ...clip, id: clip.id || uid(), end: clip.start + span };
  return insertAtAssembledTime(removeSpan(clips, start, end), start, placed);
}

/** Remove [start,end) from timeline, leaving a single gap of that duration. */
function removeSpan(clips: Clip[], start: number, end: number): Clip[] {
  const span = Math.max(0, end - start);
  if (span < 1e-6) return clips;
  const out: Clip[] = [];
  let acc = 0;
  let gapInserted = false;
  for (const c of clips) {
    const d = clipDur(c);
    const c0 = acc;
    const c1 = acc + d;
    acc = c1;
    if (c1 <= start + 1e-6 || c0 >= end - 1e-6) {
      out.push(c);
      continue;
    }
    if (c0 < start - 1e-6) {
      const leftDur = start - c0;
      if (isGapClip(c)) out.push(makeGap(leftDur));
      else out.push({ ...c, id: uid(), end: c.start + leftDur });
    }
    if (!gapInserted) {
      out.push(makeGap(span));
      gapInserted = true;
    }
    if (c1 > end + 1e-6) {
      const rightDur = c1 - end;
      if (isGapClip(c)) out.push(makeGap(rightDur));
      else out.push({ ...c, id: uid(), start: c.end - rightDur });
    }
  }
  if (!gapInserted) {
    const total = clips.reduce((s, c) => s + clipDur(c), 0);
    if (start > total + 1e-6) out.push(makeGap(start - total));
    out.push(makeGap(span));
  }
  return mergeAdjacentGaps(out);
}

/** Replace the gap that covers `at` with `clip`, preserving surrounding media. */
function insertAtAssembledTime(clips: Clip[], at: number, clip: Clip): Clip[] {
  const dur = clipDur(clip);
  let acc = 0;
  for (let i = 0; i < clips.length; i++) {
    const c = clips[i];
    const d = clipDur(c);
    const c0 = acc;
    const c1 = acc + d;
    if (at >= c0 - 1e-6 && at <= c1 + 1e-6 && isGapClip(c)) {
      const before = at - c0;
      const after = c1 - (at + dur);
      const next = [...clips];
      if (dur > d + 1e-6) {
        next.splice(i, 1, isGapClip(clip) ? makeGap(d, clip.id) : { ...clip, end: clip.start + d });
      } else {
        const insert: Clip[] = [];
        if (before > 0.05) insert.push(makeGap(before));
        insert.push(clip);
        if (after > 0.05) insert.push(makeGap(after));
        next.splice(i, 1, ...insert);
      }
      return mergeAdjacentGaps(next);
    }
    acc = c1;
  }
  const total = acc;
  const out = [...clips];
  if (at > total + 0.05) out.push(makeGap(at - total));
  out.push(clip);
  return mergeAdjacentGaps(out);
}

export function mergeAdjacentGaps(clips: Clip[]): Clip[] {
  const out: Clip[] = [];
  for (const c of clips) {
    if (isGapClip(c) && out.length && isGapClip(out[out.length - 1])) {
      const prev = out[out.length - 1];
      out[out.length - 1] = makeGap(clipDur(prev) + clipDur(c), prev.id);
    } else if (!(isGapClip(c) && clipDur(c) < 0.05)) {
      out.push(c);
    }
  }
  return out;
}

/** Deep-clone EDL for detached audio (new ids; timing/source preserved). */
export function cloneEdlAsAudio(clips: Clip[]): Clip[] {
  return clips.map((c) => ({
    ...c,
    id: uid("a"),
  }));
}
