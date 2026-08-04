// זום טיימליין — חישוב גורם מגלגלת + שמירת נקודה תחת הסמן.

import { clampZoom } from "./time";

/** גורם זום מ-deltaY של wheel (חלק גם ב-trackpad). */
export function zoomFactorFromWheel(deltaY: number): number {
  return Math.exp(-deltaY * 0.0018);
}

export function nextZoom(current: number, deltaY: number): number {
  return clampZoom(current * zoomFactorFromWheel(deltaY));
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
