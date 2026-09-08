/**
 * Ducking מוזיקה מתחת לדיבור — חישוב טהור (בלי I/O).
 * מפצל קליפ מוזיקה למקטעים: רגיל / מונמך כשיש חפיפה עם דיבור.
 */

export interface TimedSpan {
  start: number;
  end: number;
}

export interface DuckSegment {
  /** התחלה על ציר הזמן (יחסית לתחילת קליפ המוזיקה) */
  offset: number;
  /** משך המקטע */
  duration: number;
  /** עוצמה 0..2 */
  volume: number;
  ducked: boolean;
}

export interface DuckPlanOpts {
  musicStart: number;
  musicDuration: number;
  speechSpans: TimedSpan[];
  /** עוצמה כשאין דיבור */
  fullVolume?: number;
  /** עוצמה תחת דיבור */
  duckedVolume?: number;
  /** מרווח לפני/אחרי דיבור (שניות) */
  padSec?: number;
  /** מינימום משך מקטע — קצרים יותר מתמזגים */
  minSegSec?: number;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** מאחד חפיפות דיבור ומחיל pad. */
export function mergeSpeechWindows(
  spans: TimedSpan[],
  musicStart: number,
  musicEnd: number,
  padSec: number,
): TimedSpan[] {
  const raw = spans
    .map((s) => ({
      start: clamp(s.start - padSec, musicStart, musicEnd),
      end: clamp(s.end + padSec, musicStart, musicEnd),
    }))
    .filter((s) => s.end > s.start)
    .sort((a, b) => a.start - b.start);
  if (!raw.length) return [];
  const out: TimedSpan[] = [{ ...raw[0] }];
  for (let i = 1; i < raw.length; i++) {
    const last = out[out.length - 1];
    if (raw[i].start <= last.end + 0.02) last.end = Math.max(last.end, raw[i].end);
    else out.push({ ...raw[i] });
  }
  return out;
}

/**
 * בונה מקטעי עוצמה לקליפ מוזיקה יחיד.
 * הזמנים ב-offset הם יחסית לתחילת הקליפ על הציר (0 = תחילת המוזיקה).
 */
export function planMusicDuck(opts: DuckPlanOpts): DuckSegment[] {
  const full = opts.fullVolume ?? 0.55;
  const ducked = opts.duckedVolume ?? 0.12;
  const pad = opts.padSec ?? 0.15;
  const minSeg = opts.minSegSec ?? 0.08;
  const musicStart = opts.musicStart;
  const musicEnd = musicStart + Math.max(0, opts.musicDuration);
  if (musicEnd <= musicStart) return [];

  const windows = mergeSpeechWindows(opts.speechSpans, musicStart, musicEnd, pad);
  if (!windows.length) {
    return [{ offset: 0, duration: musicEnd - musicStart, volume: full, ducked: false }];
  }

  const cuts: { t: number; ducked: boolean }[] = [{ t: musicStart, ducked: false }];
  for (const w of windows) {
    cuts.push({ t: w.start, ducked: true });
    cuts.push({ t: w.end, ducked: false });
  }
  cuts.push({ t: musicEnd, ducked: false });

  // נרמול: כל נקודה מגדירה מצב עד הבאה
  const segs: DuckSegment[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i].t;
    const b = cuts[i + 1].t;
    if (b - a < minSeg) continue;
    const isDucked = cuts[i].ducked;
    segs.push({
      offset: a - musicStart,
      duration: b - a,
      volume: isDucked ? ducked : full,
      ducked: isDucked,
    });
  }

  // מיזוג מקטעים סמוכים באותה עוצמה
  const merged: DuckSegment[] = [];
  for (const s of segs) {
    const last = merged[merged.length - 1];
    if (last && Math.abs(last.volume - s.volume) < 1e-6 && Math.abs((last.offset + last.duration) - s.offset) < 1e-6) {
      last.duration += s.duration;
    } else {
      merged.push({ ...s });
    }
  }
  return merged.length ? merged : [{ offset: 0, duration: musicEnd - musicStart, volume: full, ducked: false }];
}
