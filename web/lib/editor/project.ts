// מודל הפרויקט: רצועות (Tracks) + קליפים + כתוביות. מקור אמת יחיד לעריכה.
// המנוע הנוכחי הוא רצף-וידאו יחיד (concat), ולכן המודל מייצג נאמנה: רצועת וידאו,
// רצועת אודיו (מקושרת — האודיו מוטבע בקליפי הווידאו), ורצועת כתוביות. בקרות
// שאינן משפיעות באמת (Solo / Visibility ברצועה יחידה) פשוט אינן מוצגות.

import { Clip } from "./model";
import { Sub } from "./subtitlesEdl";
import { Overlay } from "./overlay";
import { CanvasSize } from "./canvasCoords";
import { CaptionStyle, DEFAULT_CAPTION_STYLE, normalizeCaptionStyle } from "./captionStyle";

// v3: canvas + overlays. v4: captionStyle (project-level look for preview).
export const SCHEMA_VERSION = 4;

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
  clips: Clip[] | null; // רצף רצועת הווידאו (EDL)
  subs: Sub[] | null; // רצועת הכתוביות
  tracks: TrackMeta[];
  overlays: Overlay[]; // שכבות ויזואליות (תמונה/לוגו/טקסט) מעל הווידאו
  canvas: CanvasSize; // מידות הפרויקט (קואורדינטות פרויקט, בלתי תלויות במסך)
  captionStyle: CaptionStyle;
}

export { DEFAULT_CAPTION_STYLE, normalizeCaptionStyle };
export type { CaptionStyle };

export function defaultTracks(): TrackMeta[] {
  return [
    { id: "trk_video", name: "וידאו", type: "video", order: 0, height: 58, locked: false, muted: false },
    { id: "trk_audio", name: "אודיו", type: "audio", order: 1, height: 46, locked: false, muted: false },
    { id: "trk_caption", name: "כתוביות", type: "caption", order: 2, height: 34, locked: false, muted: false },
  ];
}

export const videoTrack = (t: TrackMeta[]) => t.find((x) => x.type === "video");
export const audioTrack = (t: TrackMeta[]) => t.find((x) => x.type === "audio");
export const captionTrack = (t: TrackMeta[]) => t.find((x) => x.type === "caption");
export const audioMuted = (t: TrackMeta[]) => !!audioTrack(t)?.muted;
export const videoLocked = (t: TrackMeta[]) => !!videoTrack(t)?.locked;
export const captionLocked = (t: TrackMeta[]) => !!captionTrack(t)?.locked;

export function sortedTracks(t: TrackMeta[]): TrackMeta[] {
  return [...t].sort((a, b) => a.order - b.order);
}

// מוודא שקיימות שלוש הרצועות הסטנדרטיות (משלים חסרות), ומשמר קיימות.
export function normalizeTracks(input: any): TrackMeta[] {
  const base = defaultTracks();
  if (!Array.isArray(input)) return base;
  const byType: Record<TrackType, TrackMeta | undefined> = { video: undefined, audio: undefined, caption: undefined };
  for (const t of input) {
    if (t && (t.type === "video" || t.type === "audio" || t.type === "caption") && !byType[t.type as TrackType]) {
      const d = base.find((b) => b.type === t.type)!;
      byType[t.type as TrackType] = {
        id: t.id || d.id, name: t.name || d.name, type: t.type, order: t.order ?? d.order,
        height: typeof t.height === "number" ? t.height : d.height,
        locked: !!t.locked, muted: !!t.muted,
      };
    }
  }
  return (["video", "audio", "caption"] as TrackType[]).map((tp) => byType[tp] || base.find((b) => b.type === tp)!);
}
