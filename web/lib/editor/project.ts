// מודל הפרויקט: רצועות (Tracks) + קליפים + כתוביות. מקור אמת יחיד לעריכה.
// תומך בכמה רצועות וידאו (מונטאז'/cutaway). רצועת אודיו מקושרת לראשי,
// ורצועת כתוביות אחת. Solo/Visibility ברצועה יחידה אינם מוצגים.

import { Clip } from "./model";
import { Sub } from "./subtitlesEdl";
import { Overlay } from "./overlay";
import { CanvasSize } from "./canvasCoords";
import { CaptionStyle, DEFAULT_CAPTION_STYLE, normalizeCaptionStyle } from "./captionStyle";

// v3: canvas + overlays. v4: captionStyle. v5: multi video tracks + clip.trackId.
export const SCHEMA_VERSION = 5;

export const DEFAULT_CANVAS: CanvasSize = { width: 1920, height: 1080 };
export function normalizeCanvas(input: any): CanvasSize {
  const w = Number(input?.width), h = Number(input?.height);
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) return { width: Math.round(w), height: Math.round(h) };
  return { ...DEFAULT_CANVAS };
}

export type TrackType = "video" | "audio" | "caption";

export interface TrackMeta {
  id: string;
  name: string;
  type: TrackType;
  order: number;
  height: number;
  locked: boolean;
  muted: boolean; // רלוונטי לאודיו — משפיע על נגן ורינדור
}

export interface ProjectState {
  schemaVersion: number;
  clips: Clip[] | null;
  subs: Sub[] | null;
  tracks: TrackMeta[];
  overlays: Overlay[];
  canvas: CanvasSize;
  captionStyle: CaptionStyle;
}

export { DEFAULT_CAPTION_STYLE, normalizeCaptionStyle };
export type { CaptionStyle };

export function defaultTracks(): TrackMeta[] {
  return [
    { id: "trk_video", name: "וידאו", type: "video", order: 0, height: 64, locked: false, muted: false },
    { id: "trk_audio", name: "אודיו", type: "audio", order: 1, height: 56, locked: false, muted: false },
    { id: "trk_caption", name: "כתוביות", type: "caption", order: 2, height: 32, locked: false, muted: false },
  ];
}

export const videoTracks = (t: TrackMeta[]) => sortedTracks(t).filter((x) => x.type === "video");
export const videoTrack = (t: TrackMeta[]) => videoTracks(t)[0];
export const primaryVideoTrackId = (t: TrackMeta[]) => videoTrack(t)?.id || "trk_video";
export const audioTrack = (t: TrackMeta[]) => t.find((x) => x.type === "audio");
export const captionTrack = (t: TrackMeta[]) => t.find((x) => x.type === "caption");
export const audioMuted = (t: TrackMeta[]) => !!audioTrack(t)?.muted;
export const videoLocked = (t: TrackMeta[], trackId?: string) => {
  if (trackId) return !!t.find((x) => x.id === trackId)?.locked;
  return !!videoTrack(t)?.locked;
};
export const captionLocked = (t: TrackMeta[]) => !!captionTrack(t)?.locked;

export function sortedTracks(t: TrackMeta[]): TrackMeta[] {
  return [...t].sort((a, b) => a.order - b.order);
}

function clampHeight(type: TrackType, height: number | undefined, fallback: number): number {
  if (typeof height !== "number" || !Number.isFinite(height)) return fallback;
  const min = type === "caption" ? 30 : 48;
  return Math.max(min, Math.min(140, height));
}

function normalizeOne(t: any, fallback: TrackMeta): TrackMeta {
  return {
    id: typeof t?.id === "string" && t.id ? t.id : fallback.id,
    name: typeof t?.name === "string" && t.name ? t.name : fallback.name,
    type: fallback.type,
    order: typeof t?.order === "number" ? t.order : fallback.order,
    height: clampHeight(fallback.type, t?.height, fallback.height),
    locked: !!t?.locked,
    muted: !!t?.muted,
  };
}

/** משלים audio/caption חסרים, ושומר *כל* רצועות הווידאו. */
export function normalizeTracks(input: any): TrackMeta[] {
  const base = defaultTracks();
  if (!Array.isArray(input)) return base;

  const videos: TrackMeta[] = [];
  let audio: TrackMeta | undefined;
  let caption: TrackMeta | undefined;
  const seenVideoIds = new Set<string>();

  for (const t of input) {
    if (!t || typeof t !== "object") continue;
    if (t.type === "video") {
      const d = base.find((b) => b.type === "video")!;
      const id = typeof t.id === "string" && t.id ? t.id : `trk_video_${videos.length}`;
      if (seenVideoIds.has(id)) continue;
      seenVideoIds.add(id);
      videos.push(normalizeOne({ ...t, id }, { ...d, id, name: t.name || (videos.length ? `וידאו ${videos.length + 1}` : d.name) }));
    } else if (t.type === "audio" && !audio) {
      audio = normalizeOne(t, base.find((b) => b.type === "audio")!);
    } else if (t.type === "caption" && !caption) {
      caption = normalizeOne(t, base.find((b) => b.type === "caption")!);
    }
  }

  if (!videos.length) videos.push(base.find((b) => b.type === "video")!);
  if (!audio) audio = base.find((b) => b.type === "audio")!;
  if (!caption) caption = base.find((b) => b.type === "caption")!;

  // סדר: וידאו (לפי order) → אודיו → כתוביות; מנרמל order רציף
  videos.sort((a, b) => a.order - b.order);
  const out: TrackMeta[] = [];
  videos.forEach((v, i) => out.push({ ...v, order: i }));
  out.push({ ...audio, order: videos.length });
  out.push({ ...caption, order: videos.length + 1 });
  return out;
}

/** יוצר רצועת וידאו חדשה מעל הרצועות הקיימות (order גבוה יותר = עליון במונטאז'). */
export function createVideoTrack(tracks: TrackMeta[], name?: string): { tracks: TrackMeta[]; track: TrackMeta } {
  const cur = normalizeTracks(tracks);
  const vids = videoTracks(cur);
  const n = vids.length + 1;
  const id = `trk_video_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const track: TrackMeta = {
    id,
    name: name?.trim() || `וידאו ${n}`,
    type: "video",
    order: vids.length, // לפני נרמול — יושם מעל
    height: 64,
    locked: false,
    muted: false,
  };
  return { tracks: normalizeTracks([...cur, track]), track };
}

/** מוחק רצועת וידאו (לא את האחרונה/יחידה). מחזיר גם את ה-id שנמחק. */
export function removeVideoTrackMeta(tracks: TrackMeta[], trackId: string): TrackMeta[] | null {
  const cur = normalizeTracks(tracks);
  const vids = videoTracks(cur);
  if (vids.length <= 1) return null;
  if (!vids.some((v) => v.id === trackId)) return null;
  return normalizeTracks(cur.filter((t) => t.id !== trackId));
}
