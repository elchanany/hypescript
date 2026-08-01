// מיגרציה בטוחה של מצב-פרויקט שמור לפורמט העדכני (עם רצועות + schemaVersion).
// לעולם לא למחוק נתוני משתמש: קלט לא-תקין נופל חזרה למצב ריק, אך clips/subs קיימים
// תמיד נשמרים.

import { Clip } from "./model";
import { Sub } from "./subtitlesEdl";
import { normalizeTracks, ProjectState, SCHEMA_VERSION } from "./project";

export function migrateState(old: any): ProjectState {
  // פורמט עדכני עם רצועות — רק מנרמל רצועות ליתר ביטחון.
  if (old && old.schemaVersion >= SCHEMA_VERSION) {
    return {
      schemaVersion: SCHEMA_VERSION,
      clips: Array.isArray(old.clips) ? (old.clips as Clip[]) : null,
      subs: Array.isArray(old.subs) ? (old.subs as Sub[]) : null,
      tracks: normalizeTracks(old.tracks),
    };
  }
  // פורמט ישן { clips, subs } ללא רצועות, או null — יוצר רצועות ברירת מחדל.
  const clips = old && Array.isArray(old.clips) ? (old.clips as Clip[]) : null;
  const subs = old && Array.isArray(old.subs) ? (old.subs as Sub[]) : null;
  return { schemaVersion: SCHEMA_VERSION, clips, subs, tracks: normalizeTracks(null) };
}
