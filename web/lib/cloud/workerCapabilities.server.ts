import "server-only";

// קריאת היכולות מהעובד עצמו. הטיפוסים והפענוח הטהור יושבים ב-workerCapabilities.ts
// כדי שאפשר יהיה לבדוק אותם ב-vitest (מודול עם "server-only" אינו נטען שם).

import { getRendererConfig } from "./config";
import { NO_CAPABILITIES, parseWorkerCapabilities, type WorkerCapabilities } from "./workerCapabilities";

const CACHE_TTL_MS = 5 * 60 * 1000;
let cached: { at: number; value: WorkerCapabilities } | null = null;

/** מנקה את ה-cache. לבדיקות בלבד. */
export function resetWorkerCapabilitiesCache() {
  cached = null;
}

/**
 * שואל את `/health` של העובד, עם cache קצר כדי לא להוסיף round-trip לכל ייצוא.
 * כשל מכל סוג (עובד כבוי, timeout, JSON שבור) מחזיר "אין יכולות" — הצד הבטוח.
 */
export async function getWorkerCapabilities(now = Date.now()): Promise<WorkerCapabilities> {
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.value;
  const renderer = getRendererConfig();
  if (!renderer) return NO_CAPABILITIES;
  try {
    const response = await fetch(`${renderer.url}/health`, {
      headers: { authorization: `Bearer ${renderer.token}` },
      signal: AbortSignal.timeout(4_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`health_${response.status}`);
    const data = await response.json();
    const value = parseWorkerCapabilities(data?.capabilities);
    cached = { at: now, value };
    return value;
  } catch {
    // לא שומרים כשל ב-cache: העובד עשוי לחזור תוך שניות, ואין סיבה להשבית
    // ייצוא בענן לחמש דקות בגלל בקשה אחת שנפלה.
    return NO_CAPABILITIES;
  }
}
