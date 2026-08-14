// זום טיימליין — חישוב גורם מגלגלת + עגינה לנקודה שהמשתמש מצביע עליה.
// כותרות הרצועות (sticky) ברוחב קבוע — רק אזור ה-lane משתנה עם הזום.
// zoom < 1 changes the time scale while the canvas still fills the viewport.

import { clampZoom, ZOOM_MAX, ZOOM_MIN } from "./time";

/** רוחב כותרת רצועה / פינת הסרגל — חייב להתאים ל-CSS (.tl-head2 / .tl-corner2). */
export const TIMELINE_GUTTER = 136;

/** פיקסל יחיד משאיר יעד אינטראקטיבי גם במזעור הקיצוני ביותר. */
export const MIN_LANE_PX = 1;

/**
 * גורם זום מ-deltaY (אפשר מצטבר על פני כמה אירועי wheel באותו frame).
 * Pinch רגיש יותר מגלגלת רגילה.
 */
export function zoomFactorFromWheel(deltaY: number, pinch = false): number {
  const k = pinch ? 0.0045 : 0.0032;
  const raw = Math.exp(-deltaY * k);
  const lo = pinch ? 0.7 : 0.78;
  const hi = pinch ? 1.45 : 1.32;
  return Math.min(hi, Math.max(lo, raw));
}

/** זום מינימלי אפקטיבי לרוחב viewport — מתחתיו ה-lane קטן מדי. */
export function effectiveZoomMin(portWidth: number, gutter = TIMELINE_GUTTER): number {
  if (!(portWidth > 0)) return ZOOM_MIN;
  const laneAtFit = Math.max(1, portWidth - gutter);
  return Math.max(ZOOM_MIN, MIN_LANE_PX / laneAtFit);
}

export function clampZoomForPort(z: number, portWidth: number, gutter = TIMELINE_GUTTER): number {
  const lo = effectiveZoomMin(portWidth, gutter);
  return Math.min(ZOOM_MAX, Math.max(lo, z));
}

export function nextZoom(current: number, deltaY: number, pinch = false, portWidth = 0): number {
  const next = current * zoomFactorFromWheel(deltaY, pinch);
  return portWidth > 0 ? clampZoomForPort(next, portWidth) : clampZoom(next);
}

/** רוחב תוכן הטיימליין בפיקסלים לפי זום — גם מתחת ל-100% (הקטנה אמיתית). */
export function timelineContentWidth(portWidth: number, zoom: number, gutter = TIMELINE_GUTTER): number {
  if (!(portWidth > 0)) return 0;
  const z = clampZoomForPort(zoom, portWidth, gutter);
  const laneAtFit = Math.max(1, portWidth - gutter);
  return gutter + Math.max(MIN_LANE_PX, laneAtFit * z);
}

/**
 * אחרי זום: שומרים את הזמן שמתחת לסמן באותה נקודה במסך.
 * anchorViewportX הוא מיקום אופקי בתוך אזור הגלילה. כשהוא חסר משתמשים
 * במרכז ה-lane — התנהגות נכונה גם לכפתורי +/- ולמחוות נגישות.
 */
export function scrollLeftAfterZoom(opts: {
  oldZoom: number;
  newZoom: number;
  scrollLeft: number;
  portWidth: number;
  gutter?: number;
  anchorViewportX?: number;
}): number {
  const {
    oldZoom, newZoom, scrollLeft, portWidth,
    gutter = TIMELINE_GUTTER, anchorViewportX,
  } = opts;
  if (!(oldZoom > 0) || !(newZoom > 0) || !(portWidth > 0)) return scrollLeft;

  const oldContentW = timelineContentWidth(portWidth, oldZoom, gutter);
  const newContentW = timelineContentWidth(portWidth, newZoom, gutter);
  const oldLaneW = Math.max(1, oldContentW - gutter);
  const newLaneW = Math.max(1, newContentW - gutter);

  const laneViewportW = Math.max(1, portWidth - gutter);
  const anchor = Math.max(gutter, Math.min(portWidth, anchorViewportX ?? (gutter + laneViewportW / 2)));
  const anchorInLane = anchor - gutter;
  const oldTimePx = Math.max(0, scrollLeft + anchorInLane);
  const frac = Math.min(1, Math.max(0, oldTimePx / oldLaneW));
  const next = frac * newLaneW - anchorInLane;
  const maxScroll = Math.max(0, newContentW - portWidth);
  return Math.max(0, Math.min(maxScroll, next));
}
