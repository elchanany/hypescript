// מודל EDL רב-מקורי. ספריית מדיה (media) + רשימת קליפים מסודרת.
// כל קליפ מצביע על מקור (sourceId) ועל טווח בתוכו — כך אפשר להרכיב סרטון אחד
// מכמה סרטונים/מקורות, לסדר-מחדש ולחזור על קטעים (כמו CapCut).

export type MediaKind = "video" | "image" | "audio";

export interface MediaAsset {
  id: string;
  name: string;
  kind: MediaKind;
  file: File;
  duration: number; // לתמונות: משך תצוגה שנבחר
  url: string; // object URL לתצוגה מקדימה
}

export interface Clip {
  id: string;
  sourceId: string; // מזהה MediaAsset
  start: number; // in-point במקור (שניות)
  end: number; // out-point במקור
  /** רצועת וידאו (ברירת מחדל: הרצועה הראשית). אודיו מקושר לראשי. */
  trackId?: string;
  volume?: number; // 0..2 (ברירת מחדל 1) — משפיע על הרינדור
  enabled?: boolean; // false = מדולג ברינדור/נגן (ברירת מחדל true)
  opacity?: number; // 0..1 שקיפות ויזואלית (ברירת מחדל 1)
}

export const clipEnabled = (c: Clip): boolean => c.enabled !== false;
export const clipVolume = (c: Clip): number => (c.volume == null ? 1 : c.volume);
export const clipOpacity = (c: Clip): number => {
  const o = c.opacity;
  if (o == null || !Number.isFinite(o)) return 1;
  return Math.max(0, Math.min(1, o));
};

export function uid(prefix = "c"): string {
  return prefix + Math.random().toString(36).slice(2, 9);
}

export const clipDur = (c: Clip): number => Math.max(0, c.end - c.start);
export const totalDur = (clips: Clip[]): number => clips.reduce((s, c) => s + clipDur(c), 0);

export function mediaById(media: MediaAsset[], id: string): MediaAsset | undefined {
  return media.find((m) => m.id === id);
}
export function firstVideo(media: MediaAsset[]): MediaAsset | undefined {
  return media.find((m) => m.kind === "video");
}

export function assembledStart(clips: Clip[], i: number): number {
  let s = 0;
  for (let k = 0; k < i && k < clips.length; k++) s += clipDur(clips[k]);
  return s;
}

export function assembledToSource(clips: Clip[], at: number): { index: number; source: number } {
  let acc = 0;
  for (let i = 0; i < clips.length; i++) {
    const d = clipDur(clips[i]);
    if (at <= acc + d) return { index: i, source: clips[i].start + (at - acc) };
    acc += d;
  }
  const last = clips.length - 1;
  return last >= 0 ? { index: last, source: clips[last].end } : { index: -1, source: 0 };
}

// --- פעולות (טהורות) ---
export function removeClip(clips: Clip[], id: string): Clip[] {
  return clips.filter((c) => c.id !== id);
}
export function moveClip(clips: Clip[], id: string, toIndex: number): Clip[] {
  const i = clips.findIndex((c) => c.id === id);
  if (i < 0) return clips;
  const arr = [...clips];
  const [c] = arr.splice(i, 1);
  arr.splice(Math.max(0, Math.min(arr.length, toIndex)), 0, c);
  return arr;
}
export function trimClip(clips: Clip[], id: string, start: number, end: number, maxDuration: number): Clip[] {
  return clips.map((c) => {
    if (c.id !== id) return c;
    // ברירות מחדל מגבולות הקליפ — מונע NaN כשחסר start/end מהסוכן.
    let s = Number.isFinite(start) ? start : c.start;
    let e = Number.isFinite(end) ? end : c.end;
    if (!Number.isFinite(s) || !Number.isFinite(e)) return c;
    if (e < s) { const t = s; s = e; e = t; }
    const max = Number.isFinite(maxDuration) && maxDuration > 0
      ? maxDuration
      : Math.max(c.end, e, 0.1);
    s = Math.max(0, Math.min(s, e - 0.05));
    e = Math.min(max, Math.max(e, s + 0.05));
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return c;
    return { ...c, start: s, end: e };
  });
}
export function splitClip(clips: Clip[], id: string, atSource: number): Clip[] {
  const i = clips.findIndex((c) => c.id === id);
  if (i < 0) return clips;
  const c = clips[i];
  if (atSource <= c.start + 0.05 || atSource >= c.end - 0.05) return clips;
  const arr = [...clips];
  // Second half inherits linked A/V props (volume/enabled/trackId) — CapCut-style linked cut.
  const right: Clip = { id: uid(), sourceId: c.sourceId, start: atSource, end: c.end };
  if (c.trackId != null) right.trackId = c.trackId;
  if (c.volume != null) right.volume = c.volume;
  if (c.enabled != null) right.enabled = c.enabled;
  if (c.opacity != null) right.opacity = c.opacity;
  arr.splice(i, 1, { ...c, end: atSource }, right);
  return arr;
}
export function addClip(clips: Clip[], clip: Clip, atIndex?: number): Clip[] {
  const arr = [...clips];
  arr.splice(atIndex ?? arr.length, 0, clip);
  return arr;
}
