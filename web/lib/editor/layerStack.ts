// שכבות חופפות בקנבס (B-06/B-07): hit-testing טהור, בלי DOM, כדי שיהיה
// ניתן לבדוק ב-unit test רגיל — ו-פעולות סדר-Z שמניבות תוצאה עקבית בין
// התצוגה המקדימה, ה-Inspector וה-ייצוא.
//
// מוסכמת zIndex — יחידה בכל הקוד, אין מקבילה הפוכה באף מסך:
//   ערך zIndex גבוה יותר => קרוב יותר לצופה (מצויר אחרון = מעל השאר).
//   מיון הוא תמיד עולה (a.zIndex - b.zIndex); ה"עליון" הוא האחרון במערך הממוין.
//   ראו PreviewOverlays.tsx (רינדור התצוגה) ו-materializeOverlays.ts (רינדור
//   הייצוא) — שניהם ממיינים באותו כיוון בדיוק כדי שהתצוגה לא תוכל לסטות מהקובץ
//   הסופי. כל פונקציה כאן ממשיכה את אותה מוסכמה.

import { hitTestRect } from "./canvasCoords";
import { Overlay, overlayVisibleAt } from "./overlay";

export interface LayerHitOptions {
  /** זמן נוכחי בציר (שניות). כשמוגדר, רק שכבות הגלויות בזמן הזה נבדקות. */
  time?: number;
  /**
   * לכלול שכבות נעולות בבדיקה. ברירת מחדל false: שכבה נעולה לא "נתפסת" מהקנבס
   * (כמו ברוב כלי העיצוב — Figma/Photoshop) ויש לבחור אותה מרשימת שכבות מפורשת.
   * שכבה מוסתרת (hidden) תמיד מוחרגת, ללא תלות באפשרות הזו.
   */
  includeLocked?: boolean;
}

/**
 * כל השכבות שנקודה נתונה (בקואורדינטות פרויקט, כמו transform.x/y) נופלת
 * בתוכן — מהעליונה לתחתונה (topmost-first). זו אותה פונקציית hit-test
 * המשמשת גם קליק רגיל (topmost בלבד) וגם Alt+Click (כל המחסנית).
 */
export function hitTestOverlayStack(overlays: Overlay[], px: number, py: number, opts: LayerHitOptions = {}): Overlay[] {
  const { time, includeLocked = false } = opts;
  return overlays
    .filter((o) => !o.hidden && (time == null || overlayVisibleAt(o, time)) && (includeLocked || !o.locked))
    .filter((o) => hitTestRect(px, py, o.transform.x, o.transform.y, o.transform.w, o.transform.h, o.transform.rotation))
    .sort((a, b) => b.zIndex - a.zIndex);
}

/**
 * Alt+Click cycling: השכבה הבאה במחסנית *מתחת* לנוכחית שנבחרה, עם עטיפה
 * חזרה לראש. currentId=null (או לא נמצא במחסנית בנקודה הזו) מתחיל מהעליונה —
 * זהה למה שקליק רגיל היה עושה, כך שהקלקה ראשונה תמיד "נכונה".
 */
export function cycleLayerSelection(stack: Overlay[], currentId: string | null): string | null {
  if (!stack.length) return null;
  const idx = currentId == null ? -1 : stack.findIndex((o) => o.id === currentId);
  return stack[(idx + 1) % stack.length].id;
}

/** כל השכבות ממוינות לפי zIndex עולה (התחתונה קודם) — סדר "האמת" היחיד. */
export function orderedOverlays(overlays: Overlay[]): Overlay[] {
  return [...overlays].sort((a, b) => a.zIndex - b.zIndex);
}

export type ZOrderOp = "front" | "forward" | "backward" | "back";

/** מיקום 1-מבוסס של שכבה בסדר-Z (1 = הכי אחורית) + הסך-הכול, לתצוגה עקבית. */
export function zOrderPosition(overlays: Overlay[], id: string): { position: number; total: number } | null {
  const ordered = orderedOverlays(overlays);
  const idx = ordered.findIndex((o) => o.id === id);
  if (idx < 0) return null;
  return { position: idx + 1, total: ordered.length };
}

/** True אם הפעולה לא תזיז כלום (השכבה כבר בקצה המבוקש, או שלא נמצאה). */
export function isAtZOrderBoundary(overlays: Overlay[], id: string, op: ZOrderOp): boolean {
  const ordered = orderedOverlays(overlays);
  const idx = ordered.findIndex((o) => o.id === id);
  if (idx < 0) return true;
  if (op === "front" || op === "forward") return idx === ordered.length - 1;
  return idx === 0;
}

/**
 * מזיז שכבה אחת בסדר-Z ומחזיר מערך *חדש* עם zIndex מנורמל ברצף 0..n-1 לפי
 * הסדר החדש — כך שאין התנגשויות/פערים גם אחרי כמה הזזות רצופות (ריבוד קודם
 * ב-Inspector עדכן zIndex±1 ישירות, מה שיכול היה ליצור התנגשות עם שכבה שכנה).
 * בגבול (כבר הכי קדמית/אחורית, או id לא נמצא) מחזיר את אותו מערך (זהות
 * reference) כדי שהקורא יוכל לדלג על dispatch/Undo מיותר.
 */
export function reorderOverlayZ(overlays: Overlay[], id: string, op: ZOrderOp): Overlay[] {
  const ordered = orderedOverlays(overlays);
  const idx = ordered.findIndex((o) => o.id === id);
  if (idx < 0) return overlays;
  let target = idx;
  if (op === "front") target = ordered.length - 1;
  else if (op === "back") target = 0;
  else if (op === "forward") target = Math.min(ordered.length - 1, idx + 1);
  else target = Math.max(0, idx - 1);
  if (target === idx) return overlays;
  const [moved] = ordered.splice(idx, 1);
  ordered.splice(target, 0, moved);
  return ordered.map((o, i) => (o.zIndex === i ? o : { ...o, zIndex: i }));
}

/**
 * מספר השכבה כפי שהמשתמש רואה אותו: 1 = העליונה ביותר, ויורד כלפי מטה
 * (זו הבקשה המפורשת — "1 עליון ויורד"). זהו ההפך מ-zOrderPosition, שהוא
 * מדד פנימי מהתחתית. כל מסך שמציג מספר שכבה למשתמש חייב להשתמש בפונקציה
 * הזו ורק בה — התג על הקנבס וה-Inspector חייבים להראות את אותו מספר.
 */
export function layerDepth(overlays: Overlay[], id: string): { depth: number; total: number } | null {
  const pos = zOrderPosition(overlays, id);
  if (!pos) return null;
  return { depth: pos.total - pos.position + 1, total: pos.total };
}
