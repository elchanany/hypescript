// המרת סקריפט -> קליפים בסדר של הטקסט (כולל חזרות).
//
// חיפוש סדרתי עם סמן (cursor): אחרי כל התאמה ממשיכים קדימה בתמלול.
// מונע קפיצות לזמנים רחוקים (למשל 117s באמצע הקדשה) בגלל התאמה גלובלית ארוכה מדי.

import { speechWords, Word } from "@/lib/models";
import { normalizeHebrew } from "@/lib/align";
import { Clip, uid } from "./model";

export interface ScriptToClipsOpts {
  /** כמה טוקני ASR מותר לפספס בין התאמות (ברירת מחדל 3) */
  gapTol?: number;
  /** כמה שניות מותר לקפוץ אחורה ממקום החיפוש הנוכחי */
  lookbackSec?: number;
  /** מעבר לזה — קפיצה קדימה נדחית (אלא אם ההתאמה ארוכה מאוד) */
  maxJumpSec?: number;
  /** קליפים קצרים מזה נזרקים (שיבושי התאמה) */
  minClipSec?: number;
}

export function scriptToClips(
  words: Word[],
  scriptText: string,
  sourceId: string,
  gapTolOrOpts: number | ScriptToClipsOpts = 3,
): Clip[] {
  const opts: ScriptToClipsOpts = typeof gapTolOrOpts === "number"
    ? { gapTol: gapTolOrOpts }
    : gapTolOrOpts;
  const gapTol = opts.gapTol ?? 3;
  const lookbackSec = opts.lookbackSec ?? 8;
  const maxJumpSec = opts.maxJumpSec ?? 40;
  const minClipSec = opts.minClipSec ?? 0.2;

  const speech = speechWords(words);
  const tNorm = speech.map((w) => normalizeHebrew(w.text));
  const sTokens = scriptText.split(/\s+/).map(normalizeHebrew).filter(Boolean);
  if (!speech.length || !sTokens.length) return [];

  const positions = new Map<string, number[]>();
  tNorm.forEach((t, idx) => {
    if (!t) return;
    const arr = positions.get(t);
    if (arr) arr.push(idx);
    else positions.set(t, [idx]);
  });

  const clips: Clip[] = [];
  let si = 0;
  let cursor = 0; // אינדקס בתמלול — ממשיכים קדימה
  let lastEndTime = 0;

  while (si < sTokens.length) {
    const starts = positions.get(sTokens[si]);
    if (!starts?.length) { si++; continue; }

    const cursorTime = speech[Math.min(cursor, speech.length - 1)]?.start ?? 0;
    const windowStart = Math.max(0, cursorTime - lookbackSec);
    // אחרי התאמה ראשונה — מחפשים בעיקר קדימה מהסמן
    const minTs = clips.length ? Math.max(0, cursor - 3) : 0;

    type Cand = { len: number; tStart: number; tEnd: number; dist: number; startT: number; forward: boolean };
    let bestForward: Cand | null = null;
    let bestLookback: Cand | null = null;

    for (const ts of starts) {
      if (ts < minTs && clips.length) continue;
      let tj = ts + 1, sj = si + 1, gap = 0, lastMatch = ts;
      while (sj < sTokens.length && tj < tNorm.length && gap <= gapTol) {
        if (tNorm[tj] === sTokens[sj]) { sj++; lastMatch = tj; gap = 0; }
        else gap++;
        tj++;
      }
      const len = sj - si;
      if (len <= 0) continue;
      const startT = speech[ts].start;
      // חלון מקומי בלבד — בלי fallback גלובלי לקפיצות רחוקות
      const allowedJump = len >= 8 ? maxJumpSec : len >= 4 ? maxJumpSec * 0.6 : Math.min(18, maxJumpSec * 0.4);
      const inWindow = startT >= windowStart
        && (clips.length === 0 || startT <= lastEndTime + allowedJump);
      if (!inWindow) continue;
      // קפיצה אחורה בזמן (לפני סוף ההתאמה הקודמת) — רק lookback קטן
      if (clips.length && startT + 0.15 < lastEndTime) continue;
      const dist = Math.abs(startT - (clips.length ? lastEndTime : startT));
      const forward = ts >= cursor;
      const cand: Cand = { len, tStart: ts, tEnd: lastMatch, dist, startT, forward };
      const better = (a: Cand | null) =>
        !a || len > a.len || (len === a.len && dist < a.dist);
      if (forward) {
        if (better(bestForward)) bestForward = cand;
      } else if (better(bestLookback)) {
        bestLookback = cand;
      }
    }

    // מעדיפים התאמה קדימה מהסמן; lookback רק אם אין קדימה
    const bestLocal = bestForward || bestLookback;
    if (!bestLocal) { si++; continue; }

    let start = speech[bestLocal.tStart].start;
    const end = speech[bestLocal.tEnd].end;
    if (!Number.isFinite(start) || !Number.isFinite(end) || !(end > start)) { si++; continue; }

    // דוחים קפיצה אחורה גדולה באמצע רצף
    if (clips.length && start + 0.5 < lastEndTime - lookbackSec && bestLocal.len < 5) {
      si++;
      continue;
    }

    // מהדקים חפיפה זעירה שנסבלה (עד ~150ms) לסוף הקליפ הקודם —
    // מונע השמעה כפולה של אותה הברה במעבר בין קליפים.
    if (clips.length && start < lastEndTime) {
      start = lastEndTime;
    }
    // אחרי ההידוק נשאר שבר קצר מדי — ההתאמה כבר מכוסה בידי הקליפ הקודם; דוחים אותה
    if (end - start < minClipSec) {
      si += bestLocal.len;
      cursor = bestLocal.tEnd + 1;
      continue;
    }

    clips.push({ id: uid(), sourceId, start, end });
    si += bestLocal.len;
    cursor = bestLocal.tEnd + 1;
    lastEndTime = end;
  }

  // מסננים שברי קליפים זעירים (שיבושי התאמה כמו 0.3s באמצע)
  return clips.filter((c) => c.end - c.start >= minClipSec);
}
