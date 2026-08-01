// הסרת שתיקות/נשימות + מהססים — פורט של editing.py.

import { KeepInterval, Word, intervalDuration } from "./models";
import { normalizeHebrew } from "./align";

export const DEFAULT_FILLERS = new Set(
  ["אה", "אהה", "אא", "אמ", "אממ", "אהם", "המ", "המם", "אהמ", "עם", "מממ", "ננ"].map(normalizeHebrew),
);

export function parseFillers(spec?: string): Set<string> {
  if (!spec || !spec.trim()) return new Set(DEFAULT_FILLERS);
  return new Set(spec.split(",").map(normalizeHebrew).filter(Boolean));
}

export function fillerMask(words: Word[], fillers: Set<string>): boolean[] {
  return words.map((w) => fillers.has(normalizeHebrew(w.text)));
}

function mergeOverlaps(intervals: KeepInterval[]): KeepInterval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: KeepInterval[] = [sorted[0]];
  for (const iv of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (iv.start <= last.end + 1e-6) last.end = Math.max(last.end, iv.end);
    else merged.push({ ...iv });
  }
  return merged.filter((iv) => intervalDuration(iv) > 1e-3);
}

// בונה קטעי keep. מילה שסומנה False (בסקריפט/מהסס) מכריחה חיתוך גם בפאוזה קצרה.
export function buildKeepIntervals(
  words: Word[],
  duration: number,
  threshold: number,
  padding: number,
  keepMask?: boolean[],
): KeepInterval[] {
  if (words.length === 0) return [];
  const mask = keepMask ?? new Array(words.length).fill(true);
  const pairs = words
    .map((w, i) => ({ w, keep: mask[i] }))
    .sort((a, b) => a.w.start - b.w.start);

  const intervals: KeepInterval[] = [];
  let curStart: number | null = null;
  let curEnd = 0;
  let removedSince = false;

  for (const { w, keep } of pairs) {
    if (!keep) {
      removedSince = true;
      continue;
    }
    if (curStart === null) {
      curStart = Math.max(0, w.start - padding);
      curEnd = w.end;
      removedSince = false;
      continue;
    }
    const gap = w.start - curEnd;
    if (removedSince || gap > threshold) {
      intervals.push({ start: curStart, end: Math.min(duration, curEnd + padding) });
      curStart = Math.max(0, w.start - padding);
      curEnd = w.end;
    } else {
      curEnd = Math.max(curEnd, w.end);
    }
    removedSince = false;
  }
  if (curStart !== null) {
    intervals.push({ start: curStart, end: Math.min(duration, curEnd + padding) });
  }
  return mergeOverlaps(intervals);
}

export function wholeVideo(duration: number): KeepInterval[] {
  return [{ start: 0, end: duration }];
}

export function removedIntervals(keeps: KeepInterval[], duration: number): Array<[number, number]> {
  const removed: Array<[number, number]> = [];
  let prev = 0;
  for (const iv of [...keeps].sort((a, b) => a.start - b.start)) {
    if (iv.start - prev > 1e-3) removed.push([prev, iv.start]);
    prev = Math.max(prev, iv.end);
  }
  if (duration - prev > 1e-3) removed.push([prev, duration]);
  return removed;
}
