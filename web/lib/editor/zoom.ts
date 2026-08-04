// זום טיימליין — חישוב גורם מגלגלת + שמירת נקודה תחת הסמן.

import { clampZoom } from "./time";

/** גורם זום מ-deltaY. ב-pinch (ctrl+wheel) מדכאים קפיצות גדולות. */
export function zoomFactorFromWheel(deltaY: number, pinch = false): number {
  const k = pinch ? 0.0022 : 0.0018;
  const raw = Math.exp(-deltaY * k);
  // לא יותר מ-~12% לאירוע — מונע פיצוץ זום ב-pinch
  return Math.min(1.12, Math.max(0.89, raw));
}

export function nextZoom(current: number, deltaY: number, pinch = false): number {
  return clampZoom(current * zoomFactorFromWheel(deltaY, pinch));
}

/**
 * אחרי שינוי זום (רוחב פרופורציונלי ל-zoom), מחזיר scrollLeft חדש
 * כך שהזמן שמתחת ל-pointer נשאר במקום.
 */
export function scrollLeftAfterZoom(opts: {
  oldZoom: number;
  newZoom: number;
  scrollLeft: number;
  clientX: number;
  containerLeft: number;
  scrollWidth: number;
}): number {
  const { oldZoom, newZoom, scrollLeft, clientX, containerLeft, scrollWidth } = opts;
  if (!(oldZoom > 0) || !(newZoom > 0)) return scrollLeft;
  const offsetInContent = scrollLeft + (clientX - containerLeft);
  const ratio = offsetInContent / Math.max(1, scrollWidth);
  const newWidth = scrollWidth * (newZoom / oldZoom);
  return Math.max(0, ratio * newWidth - (clientX - containerLeft));
}
