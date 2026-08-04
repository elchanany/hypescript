// המרת סקריפט -> קליפים בסדר של הטקסט (כולל חזרות).
//
// תיקון הבאג: הגרסה הישנה (מסכה על ציר-הזמן המקורי) שמרה תמיד לפי סדר הסרטון,
// אז לא ידעה לחזור על קטע או לשנות סדר. כאן, לכל קטע רציף בסקריפט מחפשים היכן
// הוא נאמר (חיפוש גלובלי בתמלול), ומוסיפים קליפ — בסדר שבו הטקסט נכתב. אם הטקסט
// חוזר על קטע, הוא ייווצר שוב כקליפ נוסף שמצביע על אותו זמן במקור.

import { speechWords, Word } from "@/lib/models";
import { normalizeHebrew } from "@/lib/align";
import { Clip, uid } from "./model";

export function scriptToClips(words: Word[], scriptText: string, sourceId: string, gapTol = 3): Clip[] {
  // מתעלמים מאירועי שמע/רווחים של Scribe — יישור רק מול מילות דיבור.
  const speech = speechWords(words);
  const tNorm = speech.map((w) => normalizeHebrew(w.text));
  const sTokens = scriptText.split(/\s+/).map(normalizeHebrew).filter(Boolean);
  if (!speech.length || !sTokens.length) return [];

  // אינדקס: טוקן -> כל המיקומים בתמלול (מאפשר חיפוש גלובלי/חזרות).
  const positions = new Map<string, number[]>();
  tNorm.forEach((t, idx) => {
    if (!t) return;
    const arr = positions.get(t);
    if (arr) arr.push(idx);
    else positions.set(t, [idx]);
  });

  const clips: Clip[] = [];
  let si = 0;
  while (si < sTokens.length) {
    const starts = positions.get(sTokens[si]);
    if (!starts || !starts.length) {
      si++;
      continue;
    }
    // בין כל המופעים של הטוקן הנוכחי — בוחרים את זה שנותן את ההתאמה הארוכה ביותר.
    let best = { len: 0, tStart: -1, tEnd: -1 };
    for (const ts of starts) {
      let tj = ts + 1, sj = si + 1, gap = 0, lastMatch = ts;
      while (sj < sTokens.length && tj < tNorm.length && gap <= gapTol) {
        if (tNorm[tj] === sTokens[sj]) { sj++; lastMatch = tj; gap = 0; } else { gap++; }
        tj++;
      }
      const len = sj - si;
      if (len > best.len) best = { len, tStart: ts, tEnd: lastMatch };
    }
    if (best.tStart < 0) { si++; continue; }
    clips.push({ id: uid(), sourceId, start: speech[best.tStart].start, end: speech[best.tEnd].end });
    si += best.len;
  }
  return clips;
}
