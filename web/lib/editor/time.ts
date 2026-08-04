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

/** גבולות זום טיימליין — כמעט ללא מגבלה מעשית. */
export const ZOOM_MIN = 0.15;
export const ZOOM_MAX = 128;
export const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

export type SnapResult = { time: number; snapped: boolean; target: number | null };

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
