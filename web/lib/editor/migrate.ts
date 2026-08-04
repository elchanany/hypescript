// מיגרציה בטוחה של מצב-פרויקט שמור לפורמט העדכני. לעולם לא למחוק נתוני משתמש:
// clips/subs/tracks/overlays קיימים נשמרים תמיד; שדות חדשים מקבלים ברירת מחדל.

import { Clip } from "./model";
import { Sub } from "./subtitlesEdl";
import { Overlay } from "./overlay";
import {
  normalizeCanvas, normalizeCaptionStyle, normalizeTracks, primaryVideoTrackId,
  ProjectState, SCHEMA_VERSION,
} from "./project";

function migrateClips(old: any, primaryId: string): Clip[] | null {
  if (!old || !Array.isArray(old.clips)) return null;
  return (old.clips as Clip[]).map((c) => {
    if (!c || typeof c !== "object") return c;
    if (c.trackId) return c;
    return { ...c, trackId: primaryId };
  });
}

export function migrateState(old: any): ProjectState {
  const tracks = normalizeTracks(old?.tracks);
  const primaryId = primaryVideoTrackId(tracks);
  const clips = migrateClips(old, primaryId);
  const subs = old && Array.isArray(old.subs) ? (old.subs as Sub[]) : null;
  const overlays = old && Array.isArray(old.overlays) ? (old.overlays as Overlay[]) : [];
  const canvas = normalizeCanvas(old?.canvas);
  const captionStyle = normalizeCaptionStyle(old?.captionStyle);
  return { schemaVersion: SCHEMA_VERSION, clips, subs, tracks, overlays, canvas, captionStyle };
}
