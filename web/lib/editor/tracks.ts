// עזרי רצועות וידאו מרובות: סינון קליפים, משך פרויקט, ושטיחה ל-EDL יחיד (cutaway).

import {
  Clip, clipAudioFades, clipContrast, clipDur, clipEnabled, clipFlipX, clipFlipY, clipOpacity, clipSaturation, clipVisualFades, clipVolume, totalDur, uid,
} from "./model";
import { TrackMeta, primaryVideoTrackId, sortedTracks, videoTracks } from "./project";

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
          chosen = { clip: c, localStart: acc };
          break;
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
