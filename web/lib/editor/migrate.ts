// מיגרציה בטוחה של מצב-פרויקט שמור לפורמט העדכני. לעולם לא למחוק נתוני משתמש:
// clips/subs/tracks/overlays קיימים נשמרים תמיד; שדות חדשים (overlays/canvas)
// מקבלים ברירת מחדל כאשר חסרים (schema v2 -> v3).

import { Clip } from "./model";
import { Sub } from "./subtitlesEdl";
import { Overlay } from "./overlay";
import { normalizeCanvas, normalizeTracks, ProjectState, SCHEMA_VERSION } from "./project";

export function migrateState(old: any): ProjectState {
  const clips = old && Array.isArray(old.clips) ? (old.clips as Clip[]) : null;
  const subs = old && Array.isArray(old.subs) ? (old.subs as Sub[]) : null;
  const tracks = normalizeTracks(old?.tracks); // בטוח ל-null/פגום, משלים חסרות
  const overlays = old && Array.isArray(old.overlays) ? (old.overlays as Overlay[]) : [];
  const canvas = normalizeCanvas(old?.canvas);
  return { schemaVersion: SCHEMA_VERSION, clips, subs, tracks, overlays, canvas };
}
