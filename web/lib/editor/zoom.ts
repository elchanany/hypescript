// זום טיימליין — חישוב גורם מגלגלת + עגינה לשמאל (התחלה נשארת בהתחלה).
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
  const lo = pinch ? 0.72 : 0.8;
  const hi = pinch ? 1.4 : 1.28;
  return Math.min(hi, Math.max(lo, raw));
}

export function nextZoom(current: number, deltaY: number, pinch = false): number {
  return clampZoom(current * zoomFactorFromWheel(deltaY, pinch));
}

/**
 * אחרי זום: שומרים את הזמן בקצה השמאלי של ה-lane (ליד הכותרות).
 * כש-scrollLeft=0 — נשאר 0: קו ההתחלה לא נדחף שמאלה מתחת לנעילה.
 * לא מעגנים למיקום העכבר (זה גרם לדילוג אחורה ולצורך לגלול ימינה).
 */
export function scrollLeftAfterZoom(opts: {
  oldZoom: number;
  newZoom: number;
  scrollLeft: number;
  portWidth: number;
  gutter?: number;
}): number {
  const {
    oldZoom, newZoom, scrollLeft, portWidth,
    gutter = TIMELINE_GUTTER,
  } = opts;
  if (!(oldZoom > 0) || !(newZoom > 0) || !(portWidth > 0)) return scrollLeft;

  const oldContentW = Math.max(portWidth, portWidth * oldZoom);
  const newContentW = Math.max(portWidth, portWidth * newZoom);
  const oldLaneW = Math.max(1, oldContentW - gutter);
  const newLaneW = Math.max(1, newContentW - gutter);

  // השבר שמוצג בקצה השמאלי של ה-lane (viewport אחרי gutter)
  // רעש קטן ליד 0 → נשארים בהתחלה (לא דוחפים את קו 0 שמאלה)
  if (scrollLeft < 1) return 0;
  const frac = Math.min(1, Math.max(0, scrollLeft / oldLaneW));
  const next = frac * newLaneW;
  const maxScroll = Math.max(0, newContentW - portWidth);
  return Math.max(0, Math.min(maxScroll, next));
}
