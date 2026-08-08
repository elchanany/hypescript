// Pure planner for a single composited timeline frame (agent capture_frame, timeline=true).
// Maps an assembled-timeline second onto the flat EDL exactly like preview/export see it
// (flattenVideoTracks cutaway selection), picks a micro window around the requested instant,
// and shifts the overlays / caption cues active at that instant into the micro window so the
// shared export burn-in path (renderEDL) renders them identically to export.
//
// No FFmpeg / Canvas I/O here — that stays in lib/ffmpeg.ts (renderTimelineFrame).
// Pure and unit-testable.

import { Clip, clipDur, clipOpacity, clipVisualFades, totalDur } from "@/lib/editor/model";
import { TrackMeta } from "@/lib/editor/project";
import { flattenVideoTracks } from "@/lib/editor/tracks";
import { makeGap, isGapClip } from "@/lib/editor/timelineOps";
import { Overlay, overlayVisibleAt } from "@/lib/editor/overlay";
import { Sub } from "@/lib/editor/subtitlesEdl";
import { edgeFadeFactor } from "@/lib/editor/previewAudio";

/** Default micro-window duration (seconds) rendered around the requested instant. */
export const MICRO_WINDOW_SEC = 0.25;
/**
 * Minimum *requested* micro-window. The actual micro clip is additionally clamped to
 * the covering source clip's remaining duration (see `buildMicroEdl`), so a source
 * clip shorter than this yields an even shorter — but still strictly positive — render.
 */
export const MIN_WINDOW_SEC = 0.05;

export interface TimelineSegment {
  index: number;          // index inside the flattened clip list
  clip: Clip;
  localSeconds: number;   // requested offset inside the clip (timeline space)
  sourceSeconds: number;  // the matching source second
  timelineStart: number;  // assembled start of the clip
}

/** A one-clip (or one-gap) EDL + the overlays/captions shifted into its window. */
export interface MicroEdl {
  segments: Clip[];     // exactly one clip (or gap), already at start=0
  overlays: Overlay[];  // overlays active at the instant, shifted to [0, microDuration]
  subs: Sub[];          // caption cues active at the instant, shifted to [0, microDuration]
  microDuration: number;
  captureAt: number;    // micro-timeline second to extract (the requested instant)
  sourceTime: number;   // source second of the captured frame (for reporting)
  gap: boolean;         // true when the instant lands on a gap (renders black)
}

/** Clamp a requested second into [0, total] so an exact end-boundary pick stays safe. */
export function clampTimelineAt(atSeconds: number, totalDuration: number): number {
  if (!Number.isFinite(totalDuration) || totalDuration <= 0) return 0;
  return Math.max(0, Math.min(atSeconds, totalDuration));
}

/**
 * Map an assembled second onto a FLATTENED clip list — the same list preview/export
 * consume after cutaway flattening. Boundary times belong to the clip that covers them
 * (matches assembledToSource). Returns null when nothing covers `at`.
 */
export function pickTimelineClip(flattened: Clip[], atSeconds: number): TimelineSegment | null {
  let acc = 0;
  for (let i = 0; i < flattened.length; i++) {
    const d = clipDur(flattened[i]);
    if (d <= 0) continue;
    if (atSeconds <= acc + d) {
      const local = Math.max(0, Math.min(d, atSeconds - acc));
      return {
        index: i,
        clip: flattened[i],
        localSeconds: local,
        sourceSeconds: flattened[i].start + local,
        timelineStart: acc,
      };
    }
    acc += d;
  }
  return null;
}

/**
 * Visual fade level (0..1) at a local timeline second — the SAME factor the preview
 * multiplies into clip opacity, so the micro-render matches both preview and export.
 */
export function fadeLevelAt(clip: Clip, localSeconds: number): number {
  const { fadeIn, fadeOut } = clipVisualFades(clip);
  return edgeFadeFactor(localSeconds, clipDur(clip), fadeIn, fadeOut);
}

/** Overlays visible at an assembled second (hidden respected, inclusive bounds). */
export function overlaysActiveAt(overlays: Overlay[], atSeconds: number): Overlay[] {
  return overlays.filter((o) => overlayVisibleAt(o, atSeconds));
}

/** Caption cues active at an assembled second (inclusive bounds, positive duration). */
export function subsActiveAt(subs: Sub[], atSeconds: number): Sub[] {
  return subs.filter((s) => s.end > s.start && atSeconds >= s.start - 1e-3 && atSeconds <= s.end + 1e-3);
}

/** Shift overlays into a fixed window (micro-render: start=0/end=end). */
export function shiftOverlaysToStart(overlays: Overlay[], end: number): Overlay[] {
  return overlays.map((o) => ({ ...o, start: 0, end }));
}

/** Shift caption cues into a fixed window (micro-render: start=0/end=end). */
export function shiftSubsToStart(subs: Sub[], end: number): Sub[] {
  return subs.map((s) => ({ ...s, start: 0, end }));
}

export interface MicroEdlOptions {
  /** Micro-window duration in seconds (default MICRO_WINDOW_SEC). */
  window?: number;
}

/**
 * Build the micro-EDL for a composited timeline capture at `atSeconds`.
 *
 * - Flattens video tracks first so cutaway track selection matches preview/export.
 * - Gaps render black (single gap segment).
 * - The micro clip carries the active clip's opacity/contrast/saturation/flip and bakes
 *   the current visual-fade level into opacity (fades are dropped from the micro clip so
 *   the micro window does not re-apply a fresh fade and drift from export).
 * - Overlays and caption cues active at the instant are shifted into [0, microDuration].
 *
 * Returns null when the (flattened) timeline has no usable content.
 */
export function buildMicroEdl(
  clips: Clip[],
  tracks: TrackMeta[],
  atSeconds: number,
  overlays: Overlay[] = [],
  subs: Sub[] = [],
  opts: MicroEdlOptions = {},
): MicroEdl | null {
  const flattened = flattenVideoTracks(clips, tracks);
  const total = totalDur(flattened);
  if (total <= 0) return null;
  const at = clampTimelineAt(atSeconds, total);
  const seg = pickTimelineClip(flattened, at);
  if (!seg) return null;

  const window = Math.max(MIN_WINDOW_SEC, opts.window ?? MICRO_WINDOW_SEC);
  const activeOv = overlaysActiveAt(overlays, at);
  const activeSubs = subsActiveAt(subs, at);

  // Disabled clips never appear in export (renderSegments drops them) — render black,
  // same as a gap, so we never show video the export would not show.
  if (isGapClip(seg.clip) || seg.clip.enabled === false) {
    return {
      segments: [makeGap(window)],
      overlays: shiftOverlaysToStart(activeOv, window),
      subs: shiftSubsToStart(activeSubs, window),
      microDuration: window,
      captureAt: window / 2,
      sourceTime: seg.sourceSeconds,
      gap: true,
    };
  }

  const d = clipDur(seg.clip);
  const w = Math.min(window, d);
  const localStart = Math.max(0, Math.min(seg.localSeconds - w / 2, d - w));
  const srcStart = seg.clip.start + localStart;
  const micro: Clip = { ...seg.clip, start: srcStart, end: srcStart + w };
  micro.opacity = Math.max(0, Math.min(1, clipOpacity(seg.clip) * fadeLevelAt(seg.clip, seg.localSeconds)));
  micro.visualFadeIn = undefined;
  micro.visualFadeOut = undefined;
  const captureAt = Math.max(0, Math.min(seg.localSeconds - localStart, w));

  return {
    segments: [micro],
    overlays: shiftOverlaysToStart(activeOv, w),
    subs: shiftSubsToStart(activeSubs, w),
    microDuration: w,
    captureAt,
    sourceTime: seg.sourceSeconds,
    gap: false,
  };
}
