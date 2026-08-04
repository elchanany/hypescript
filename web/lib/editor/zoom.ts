// זום טיימליין — חישוב גורם מגלגלת + שמירת נקודה תחת הסמן.
// כותרות הרצועות (sticky) ברוחב קבוע — רק אזור ה-lane משתנה עם הזום.

import { clampZoom } from "./time";

/** רוחב כותרת רצועה / פינת הסרגל — חייב להתאים ל-CSS (.tl-head2 / .tl-corner2). */
export const TIMELINE_GUTTER = 136;

/**
 * גורם זום מ-deltaY (אפשר מצטבר על פני כמה אירועי wheel באותו frame).
 * Pinch רגיש יותר מגלגלת רגילה.
 */
export function zoomFactorFromWheel(deltaY: number, pinch = false): number {
  const k = pinch ? 0.004 : 0.0028;
  const raw = Math.exp(-deltaY * k);
  // גבול רך — מונע קפיצות מטורפות, מאפשר תחושה מהירה ב-pinch מצטבר
  const lo = pinch ? 0.72 : 0.8;
  const hi = pinch ? 1.4 : 1.28;
  return Math.min(hi, Math.max(lo, raw));
}

export function nextZoom(current: number, deltaY: number, pinch = false): number {
  return clampZoom(current * zoomFactorFromWheel(deltaY, pinch));
}

/**
 * אחרי שינוי זום: scrollLeft חדש כך שהזמן תחת ה-pointer נשאר במקום.
 * מחשבים ביחס ל-lane (אחרי ה-gutter הקבוע) — לא יחס אחיד על כל הרוחב.
 */
export function scrollLeftAfterZoom(opts: {
  oldZoom: number;
  newZoom: number;
  scrollLeft: number;
  clientX: number;
  containerLeft: number;
  /** רוחב ה-viewport של אזור הגלילה (clientWidth), לא scrollWidth */
  portWidth: number;
  gutter?: number;
}): number {
  const {
    oldZoom, newZoom, scrollLeft, clientX, containerLeft, portWidth,
    gutter = TIMELINE_GUTTER,
  } = opts;
  if (!(oldZoom > 0) || !(newZoom > 0) || !(portWidth > 0)) return scrollLeft;

  const pointerInPort = clientX - containerLeft;
  const oldContentW = Math.max(portWidth, portWidth * oldZoom);
  const newContentW = Math.max(portWidth, portWidth * newZoom);
  const oldLaneW = Math.max(1, oldContentW - gutter);
  const newLaneW = Math.max(1, newContentW - gutter);

  // נקודה בתוכן תחת הסמן → שבר לאורך ה-lane (0..1)
  const contentX = scrollLeft + pointerInPort;
  const laneX = Math.max(0, contentX - gutter);
  const frac = Math.min(1, laneX / oldLaneW);
  const newContentX = gutter + frac * newLaneW;
  const maxScroll = Math.max(0, newContentW - portWidth);
  return Math.max(0, Math.min(maxScroll, newContentX - pointerInPort));
}
