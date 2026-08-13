// מודל זמן מרכזי — מקור אמת יחיד לכל חישובי הזמן/פיקסלים בעורך.
// היחידה הקנונית: שניות, אך *מעוגלות למילישנייה* בכל commit כדי למנוע float-drift.
// אין לפזר חישובי זמן ברכיבים — להשתמש רק בפונקציות כאן.

export const MS = 1000;

export const secToMs = (s: number): number => Math.round(s * MS);
export const msToSec = (ms: number): number => ms / MS;
/** עיגול לדיוק מילישנייה — מונע הצטברות שגיאות float. */
export const roundToMs = (s: number): number => Math.round(s * MS) / MS;

export const clampTime = (s: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, s));

export const timeToPixels = (s: number, pxPerSec: number): number => s * pxPerSec;
export const pixelsToTime = (px: number, pxPerSec: number): number =>
  pxPerSec > 0 ? px / pxPerSec : 0;

/** HH:MM:SS;FF (frame-accurate). שעה מוצגת רק אם > 0. */
export function formatTimecode(s: number, fps = 30): string {
  if (!isFinite(s) || s < 0) s = 0;
  const whole = Math.floor(s);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const sec = whole % 60;
  const f = Math.min(fps - 1, Math.floor((s - whole) * fps));
  const p = (n: number) => String(n).padStart(2, "0");
  return (h > 0 ? `${p(h)}:` : "") + `${p(m)}:${p(sec)};${p(f)}`;
}

/** תצוגה קריאה לציטוט מקום בצ'אט: M:SS.d */
export function formatQuoteTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toFixed(1).padStart(4, "0")}`;
}

/** טקסט קצר להדבקה בתיבת ההודעה של הצ'אט. */
export function quotePlaceText(s: number): string {
  const t = roundToMs(s);
  return `[ציטוט ${formatQuoteTime(t)}]`;
}

/** גבולות זום טיימליין — טווח לוגריתמי עמוק, בלי להיתקע סביב Fit. */
export const ZOOM_MIN = 0.001;
export const ZOOM_MAX = 2000;
export const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

export type SnapResult = { time: number; snapped: boolean; target: number | null };
export type MagneticTarget = {
  time: number;
  label: string;
  kind: "clip" | "overlay" | "caption" | "playhead" | "timeline";
  priority?: number;
};
export type MagneticSnapResult = SnapResult & { match: MagneticTarget | null; distance: number };

/** מגנטיות: אם s קרוב לאחד ה-targets בטולרנס — מחזיר את היעד (מעוגל ל-ms). */
export function snapTimeTo(s: number, targets: number[], toleranceSec: number): SnapResult {
  let best = s;
  let bestD = toleranceSec;
  let hit: number | null = null;
  for (const t of targets) {
    const d = Math.abs(t - s);
    if (d < bestD) { bestD = d; best = t; hit = t; }
  }
  const snapped = hit != null;
  return { time: roundToMs(best), snapped, target: snapped ? roundToMs(hit!) : null };
}

export function snapTime(s: number, targets: number[], toleranceSec: number): number {
  return snapTimeTo(s, targets, toleranceSec).time;
}

/** Metadata-aware snap used by the timeline to explain what the magnet found. */
export function snapToMagneticTarget(s: number, targets: MagneticTarget[], toleranceSec: number): MagneticSnapResult {
  let match: MagneticTarget | null = null;
  let bestDistance = toleranceSec;
  for (const target of targets) {
    const distance = Math.abs(target.time - s);
    if (
      distance < bestDistance - 1e-9
      || (Math.abs(distance - bestDistance) <= 1e-9 && (target.priority || 0) > (match?.priority || 0))
    ) {
      match = target;
      bestDistance = distance;
    }
  }
  return match
    ? { time: roundToMs(match.time), snapped: true, target: roundToMs(match.time), match, distance: bestDistance }
    : { time: roundToMs(s), snapped: false, target: null, match: null, distance: Infinity };
}

/** Snap whichever edge of a moving range is closest, preserving its duration. */
export function snapRangeStart(
  rawStart: number, duration: number, targets: MagneticTarget[], toleranceSec: number,
): MagneticSnapResult & { start: number; edge: "start" | "end" | null } {
  const startHit = snapToMagneticTarget(rawStart, targets, toleranceSec);
  const endHit = snapToMagneticTarget(rawStart + duration, targets, toleranceSec);
  if (!startHit.snapped && !endHit.snapped) return { ...startHit, start: roundToMs(rawStart), edge: null };
  const useStart = startHit.snapped && (!endHit.snapped || startHit.distance <= endHit.distance);
  const hit = useStart ? startHit : endHit;
  return {
    ...hit,
    start: roundToMs(useStart ? hit.time : hit.time - duration),
    edge: useStart ? "start" : "end",
  };
}
