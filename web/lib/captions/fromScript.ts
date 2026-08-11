// בניית טוקנים לכתוביות: תזמון מהתמלול, איות מהסקריפט של המשתמש.
//
// התמלול יודע *מתי* נאמרה כל מילה, ולא יודע *איך* היא נכתבת ("טיפרת" במקום
// "תפארת"). הסקריפט של המשתמש יודע איך היא נכתבת, ולא יודע מתי. כאן מחברים:
// היישור הגלובלי מצמיד כל מילת סקריפט לחלון הזמן שלה, ומילות סקריפט שלא
// נמצאו בתמלול מקבלות חלון מוערך מתוך הפער — ולא נעלמות.

import { makeToken, tokenizeHebrew } from "@/lib/align/hebrew";
import { alignTokens, summarizeAlignment } from "@/lib/align/globalAlign";
import type { CaptionToken } from "./segment";

export interface TimedWord {
  text: string;
  start: number;
  end: number;
}

export interface ScriptCaptionResult {
  tokens: CaptionToken[];
  /** מילות סקריפט שלא נמצאו בתמלול וקיבלו תזמון מוערך. */
  interpolated: number[];
  /** מילות תמלול שנזרקו כי אינן בסקריפט. */
  dropped: number;
  coverage: number;
}

const MIN_TOKEN_SEC = 0.08;

/**
 * ממזג תמלול מתוזמן עם סקריפט נקי.
 * התוצאה מכילה *בדיוק* את מילות הסקריפט, בסדר הסקריפט, עם התזמון הטוב ביותר
 * שאפשר להסיק. אף מילת סקריפט אינה נשמטת.
 */
export function captionTokensFromScript(words: TimedWord[], scriptText: string): ScriptCaptionResult {
  const timed = words
    .filter((w) => w.text?.trim() && Number.isFinite(w.start) && Number.isFinite(w.end))
    .sort((a, b) => a.start - b.start);
  const scriptTokens = tokenizeHebrew(scriptText);
  if (!timed.length || !scriptTokens.length) {
    return {
      tokens: timed.map((w) => ({ text: w.text, start: w.start, end: w.end })),
      interpolated: [],
      dropped: 0,
      coverage: scriptTokens.length ? 0 : 1,
    };
  }

  const asrTokens = timed.map((w) => makeToken(w.text));
  const pairs = alignTokens(asrTokens, scriptTokens);
  const report = summarizeAlignment(pairs, scriptTokens.length);

  // זמן לכל מילת סקריפט; null = לא הותאמה
  const starts: Array<number | null> = new Array(scriptTokens.length).fill(null);
  const ends: Array<number | null> = new Array(scriptTokens.length).fill(null);
  for (const pair of pairs) {
    if (pair.asrIndex == null || pair.scriptIndex == null) continue;
    starts[pair.scriptIndex] = timed[pair.asrIndex].start;
    ends[pair.scriptIndex] = timed[pair.asrIndex].end;
  }

  // השלמת רצפים לא-מותאמים: פורסים אותם באופן אחיד בין השכנים המותאמים
  const interpolated: number[] = [];
  let index = 0;
  while (index < scriptTokens.length) {
    if (starts[index] != null) { index++; continue; }
    let runEnd = index;
    while (runEnd < scriptTokens.length && starts[runEnd] == null) runEnd++;
    const before = index > 0 ? ends[index - 1] : null;
    const after = runEnd < scriptTokens.length ? starts[runEnd] : null;
    const count = runEnd - index;
    const from = before ?? (after != null ? Math.max(0, after - count * 0.28) : timed[0].start);
    const to = after ?? (before != null ? before + count * 0.28 : timed[timed.length - 1].end);
    const step = Math.max(MIN_TOKEN_SEC, (to - from) / Math.max(1, count));
    for (let k = 0; k < count; k++) {
      starts[index + k] = from + step * k;
      ends[index + k] = from + step * (k + 1);
      interpolated.push(index + k);
    }
    index = runEnd;
  }

  // אכיפת מונוטוניות — פערים בזמן לא אמורים ליצור סדר הפוך
  const tokens: CaptionToken[] = [];
  let previousEnd = -Infinity;
  for (let i = 0; i < scriptTokens.length; i++) {
    let start = starts[i] ?? previousEnd;
    let end = ends[i] ?? start + MIN_TOKEN_SEC;
    if (start < previousEnd) start = previousEnd;
    if (end < start + MIN_TOKEN_SEC) end = start + MIN_TOKEN_SEC;
    tokens.push({ text: scriptTokens[i].raw, start, end });
    previousEnd = end;
  }

  return {
    tokens,
    interpolated,
    dropped: report.droppedAsr.length,
    coverage: report.coverage,
  };
}

/** בלי סקריפט — הטוקנים הם התמלול עצמו. */
export function captionTokensFromTranscript(words: TimedWord[]): CaptionToken[] {
  return words
    .filter((w) => w.text?.trim() && Number.isFinite(w.start) && Number.isFinite(w.end) && w.end > w.start)
    .sort((a, b) => a.start - b.start)
    .map((w) => ({ text: w.text.trim(), start: w.start, end: w.end }));
}
