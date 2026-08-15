// עזרי רצועות וידאו מרובות: סינון קליפים, משך פרויקט, ושטיחה ל-EDL יחיד (cutaway).

import {
  Clip, clipAudioFades, clipContrast, clipDur, clipEnabled, clipFlipX, clipFlipY, clipOpacity, clipSaturation, clipVisualFades, clipVolume, splitClip, totalDur, uid,
} from "./model";
import { TrackMeta, primaryVideoTrackId, sortedTracks, videoTracks } from "./project";
import { isGapClip } from "./timelineOps";

export function clipTrackId(c: Clip, primaryId = "trk_video"): string {
  return c.trackId || primaryId;
}

export function clipsOnTrack(clips: Clip[], trackId: string, primaryId = "trk_video"): Clip[] {
  return clips.filter((c) => clipTrackId(c, primaryId) === trackId);
}

/** מחליף את קליפי הרצועה ב־next (שומר trackId), משאיר קליפים מרצועות אחרות. */
export function replaceTrackClips(
  all: Clip[],
  trackId: string,
  next: Clip[],
  primaryId = "trk_video",
): Clip[] {
  const others = all.filter((c) => clipTrackId(c, primaryId) !== trackId);
  const tagged = next.map((c) => (c.trackId === trackId ? c : { ...c, trackId }));
  return [...others, ...tagged];
}

export function moveClipOnTrack(
  all: Clip[],
  id: string,
  toIndex: number,
  primaryId = "trk_video",
): Clip[] {
  const c = all.find((x) => x.id === id);
  if (!c) return all;
  const tid = clipTrackId(c, primaryId);
  const trackClips = clipsOnTrack(all, tid, primaryId);
  const i = trackClips.findIndex((x) => x.id === id);
  if (i < 0) return all;
  const arr = [...trackClips];
  const [moved] = arr.splice(i, 1);
  arr.splice(Math.max(0, Math.min(arr.length, toIndex)), 0, moved);
  return replaceTrackClips(all, tid, arr, primaryId);
}

/**
 * Insert a clip at an exact assembled-time position on one track.
 * A gap is consumed before later clips are pushed; real media is split when the
 * requested position is inside it. This gives drag/drop one deterministic model
 * for magnetic placement instead of converting the pointer back to a guessed index.
 */
export function insertClipAtTimeline(trackClips: Clip[], rawClip: Clip, timelineStart: number, trackId: string): Clip[] {
  const clip = { ...rawClip, trackId };
  const wanted = Math.max(0, timelineStart);
  const next: Clip[] = [];
  let cursor = 0;

  for (const current of trackClips) {
    const duration = clipDur(current);
    if (wanted > cursor + duration + 1e-4) {
      next.push(current);
      cursor += duration;
      continue;
    }

    const local = Math.max(0, Math.min(duration, wanted - cursor));
    if (local <= 0.001) return [...next, clip, current, ...trackClips.slice(next.length + 1)];
    if (local >= duration - 0.001) return [...next, current, clip, ...trackClips.slice(next.length + 1)];

    if (isGapClip(current)) {
      const before = local;
      const after = duration - local - clipDur(clip);
      if (before > 0.001) next.push({ id: uid("g"), sourceId: "__gap__", start: 0, end: before, trackId });
      next.push(clip);
      if (after > 0.001) next.push({ id: uid("g"), sourceId: "__gap__", start: 0, end: after, trackId });
      return [...next, ...trackClips.slice(next.length ? trackClips.indexOf(current) + 1 : 0)];
    }

    const halves = splitClip([current], current.id, current.start + local);
    if (halves.length === 2) return [...next, halves[0], clip, halves[1], ...trackClips.slice(trackClips.indexOf(current) + 1)];
    return [...next, current, clip, ...trackClips.slice(trackClips.indexOf(current) + 1)];
  }

  if (wanted > cursor + 0.001) next.push({ id: uid("g"), sourceId: "__gap__", start: 0, end: wanted - cursor, trackId });
  next.push(clip);
  return next;
}

/** Move a clip across or within tracks while preserving its exact source range. */
export function moveClipAtTimeline(
  clips: Clip[], id: string, targetTrackId: string, timelineStart: number, primaryId = "trk_video",
): Clip[] {
  const clip = clips.find((item) => item.id === id);
  if (!clip) return clips;
  const sourceTrackId = clipTrackId(clip, primaryId);
  const sourceTrack = clipsOnTrack(clips, sourceTrackId, primaryId);
  const sourceNext = sourceTrack.filter((item) => item.id !== id);
  let without = replaceTrackClips(
    clips,
    sourceTrackId,
    sourceNext,
    primaryId,
  );
  const target = clipsOnTrack(without, targetTrackId, primaryId);
  const placed = insertClipAtTimeline(target, clip, timelineStart, targetTrackId);
  without = replaceTrackClips(without, targetTrackId, placed, primaryId);
  return without;
}

export function projectDuration(clips: Clip[], tracks: TrackMeta[]): number {
  const primary = primaryVideoTrackId(tracks);
  const vids = videoTracks(tracks);
  if (!vids.length) return totalDur(clips);
  return Math.max(0, ...vids.map((t) => totalDur(clipsOnTrack(clips, t.id, primary))));
}

/**
 * שטיחת רצועות וידאו ל-EDL ליניארי בסגנון cutaway:
 * ברגע נתון הרצועה העליונה (order גבוה יותר) עם תוכן פעיל מנצחת.
 * רצועה בודדת → זהות (אותם קליפים).
 */
export function flattenVideoTracks(clips: Clip[], tracks: TrackMeta[]): Clip[] {
  const vTracks = sortedTracks(tracks).filter((t) => t.type === "video");
  const primaryId = vTracks[0]?.id || "trk_video";
  if (vTracks.length <= 1) {
    const only = clipsOnTrack(clips, primaryId, primaryId);
    return only;
  }

  const trackEds = vTracks.map((t) => ({
    track: t,
    clips: clipsOnTrack(clips, t.id, primaryId).filter(clipEnabled),
  }));
  const duration = Math.max(0, ...trackEds.map((t) => totalDur(t.clips)));
  if (duration <= 0) return [];

  const bounds = new Set<number>([0, duration]);
  for (const { clips: tc } of trackEds) {
    let acc = 0;
    for (const c of tc) {
      bounds.add(+acc.toFixed(4));
      acc += clipDur(c);
      bounds.add(+acc.toFixed(4));
    }
  }
  const times = [...bounds].sort((a, b) => a - b);
  const out: Clip[] = [];

  for (let i = 0; i < times.length - 1; i++) {
    const t0 = times[i];
    const t1 = times[i + 1];
    if (t1 - t0 < 0.001) continue;
    const mid = (t0 + t1) / 2;
    let chosen: { clip: Clip; localStart: number } | null = null;
    // מהעליון (סוף המערך אחרי sort לפי order) לתחתון
    for (let ti = trackEds.length - 1; ti >= 0; ti--) {
      const tc = trackEds[ti].clips;
      let acc = 0;
      for (const c of tc) {
        const d = clipDur(c);
        if (mid >= acc && mid < acc + d - 1e-9) {
          if (c.sourceId && c.sourceId !== "__gap__") {
            chosen = { clip: c, localStart: acc };
            break;
          }
        }
        acc += d;
      }
      if (chosen) break;
    }
    if (!chosen) {
      out.push({ id: uid("g"), sourceId: "__gap__", start: 0, end: t1 - t0, trackId: primaryId });
      continue;
    }
    const srcOffset = chosen.clip.start + (t0 - chosen.localStart);
    const srcEnd = srcOffset + (t1 - t0);
    const prev = out[out.length - 1];
    const tid = clipTrackId(chosen.clip, primaryId);
    if (
      prev
      && prev.sourceId === chosen.clip.sourceId
      && Math.abs(prev.end - srcOffset) < 0.001
      && clipTrackId(prev, primaryId) === tid
      && prev.enabled === chosen.clip.enabled
      && clipVolume(prev) === clipVolume(chosen.clip)
      && clipOpacity(prev) === clipOpacity(chosen.clip)
      && clipContrast(prev) === clipContrast(chosen.clip)
      && clipSaturation(prev) === clipSaturation(chosen.clip)
      && clipAudioFades(prev).fadeIn === clipAudioFades(chosen.clip).fadeIn
      && clipAudioFades(prev).fadeOut === clipAudioFades(chosen.clip).fadeOut
      && clipVisualFades(prev).fadeIn === clipVisualFades(chosen.clip).fadeIn
      && clipVisualFades(prev).fadeOut === clipVisualFades(chosen.clip).fadeOut
      && clipFlipX(prev) === clipFlipX(chosen.clip)
      && clipFlipY(prev) === clipFlipY(chosen.clip)
    ) {
      prev.end = srcEnd;
    } else {
      const n: Clip = {
        id: uid(),
        sourceId: chosen.clip.sourceId,
        start: srcOffset,
        end: srcEnd,
        trackId: tid,
      };
      if (chosen.clip.volume != null) n.volume = chosen.clip.volume;
      if (chosen.clip.fadeIn != null) n.fadeIn = chosen.clip.fadeIn;
      if (chosen.clip.fadeOut != null) n.fadeOut = chosen.clip.fadeOut;
      if (chosen.clip.visualFadeIn != null) n.visualFadeIn = chosen.clip.visualFadeIn;
      if (chosen.clip.visualFadeOut != null) n.visualFadeOut = chosen.clip.visualFadeOut;
      if (chosen.clip.flipX != null) n.flipX = chosen.clip.flipX;
      if (chosen.clip.flipY != null) n.flipY = chosen.clip.flipY;
      if (chosen.clip.enabled != null) n.enabled = chosen.clip.enabled;
      if (chosen.clip.opacity != null) n.opacity = chosen.clip.opacity;
      if (chosen.clip.contrast != null) n.contrast = chosen.clip.contrast;
      if (chosen.clip.saturation != null) n.saturation = chosen.clip.saturation;
      out.push(n);
    }
  }
  return out;
}
