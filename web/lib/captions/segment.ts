// חלוקת כתוביות לפי מבנה משפט — לא לפי תקציב תווים.
//
// שלוש בעיות אמיתיות שהמנגנון הקודם ייצר:
//   1. מצב progressive היה ברירת המחדל: כתובית 1 "שלום", כתובית 2 "שלום וברכה",
//      כתובית 3 "שלום וברכה השיעור" — מילים חוזרות שוב ושוב על המסך.
//   2. השבירה הייתה חמדנית לפי 28 תווים, ולכן נפלה באמצע צירוף ("בית /
//      אלהינו", "רבי / יוחנן").
//   3. לא הייתה שום מגבלת קצב קריאה או מספר מילים — כתובית יכלה להבזיק
//      ל-0.08 שנייה או להישאר 9 שניות.
//
// כאן: כל מילה מופיעה בכתובית אחת בדיוק (אין חזרות), החלוקה נבחרת בתכנות
// דינמי שממזער עלות משולבת של מספר מילים, קצב קריאה, משך ואיכות נקודת
// השבירה, ונקודות השבירה מדורגות לפי דקדוק עברי.

const RLM = "‏";

export interface CaptionToken {
  text: string;
  start: number;
  end: number;
}

export interface CaptionCue {
  start: number;
  end: number;
  /** שורות מוכנות לתצוגה (בלי סימן RTL). */
  lines: string[];
  /** טקסט מלא עם סימון RTL לכל שורה. */
  text: string;
  tokenFrom: number;
  tokenTo: number;
}

export interface CaptionPolicy {
  /** מספר המילים הרצוי בכתובית — "ארבע חמש מילים בפעימה". */
  targetWords: number;
  minWords: number;
  maxWords: number;
  maxCharsPerLine: number;
  maxLines: number;
  minDurationSec: number;
  maxDurationSec: number;
  /** מרווח מינימלי בין כתוביות, כדי שיהיה הבזק החלפה. */
  minGapSec: number;
  /** תווים לשנייה — מעל זה אי אפשר להספיק לקרוא. */
  maxCps: number;
  /** זנב אחרי המילה האחרונה. */
  tailSec: number;
}

export const CAPTION_POLICY: CaptionPolicy = {
  targetWords: 5,
  minWords: 2,
  maxWords: 8,
  maxCharsPerLine: 24,
  maxLines: 2,
  minDurationSec: 1.0,
  maxDurationSec: 5.0,
  minGapSec: 0.06,
  maxCps: 17,
  tailSec: 0.14,
};

const SENTENCE_END = /[.!?…׃]["'”’)\]]*$/;
const CLAUSE_END = /[,;:–—]["'”’)\]]*$/;
const OPEN_QUOTE = /^["'“‘(\[]/;
const CLOSE_QUOTE = /^["'”’)\]]/;

/** מילים שאסור לשבור *אחריהן* — הן נשענות על המילה שאחריהן. */
const BIND_NEXT = new Set([
  "של", "את", "על", "אל", "עם", "מן", "אצל", "בין", "לפי", "כמו", "לפני", "אחרי",
  "תחת", "מול", "בלי", "בתוך", "מתוך", "בשביל", "בעבור", "כלפי", "לגבי", "אודות",
  "כל", "כמה", "איזה", "אותו", "אותה", "אותם", "שני", "שתי", "שלוש", "ארבע", "חמש",
  // ראשי סמיכות ותארי כבוד — "בית / אלהינו" ו"רבי / יוחנן" הם שבירה גרועה
  "בית", "בן", "בת", "בני", "בנות", "ראש", "אנשי", "בעל", "בעלת", "דברי", "חכמי",
  "תורת", "מסכת", "פרשת", "יום", "ליל", "ערב", "כבוד", "ספר", "סדר", "שם", "לעילוי",
  "רבי", "רב", "הרב", "מרן", "הגאון", "מורנו", "הרבנית", "מרת", "הגר",
]);

/** מילים שכדאי לשבור *לפניהן* — הן פותחות פסוקית חדשה. */
const BREAK_BEFORE = new Set([
  "אבל", "אלא", "אך", "או", "כי", "אז", "אם", "כאשר", "לכן", "ולכן", "מפני", "משום",
  "כדי", "בגלל", "למרות", "אמנם", "ואילו", "שהרי", "הרי", "וכן", "אפילו", "כלומר",
  "ולכן", "ובכן", "נמצא", "לפיכך", "ואז", "ולפיכך", "וכך", "כך", "לכן",
]);

function stripPunctuation(text: string): string {
  return text.replace(/[^א-ת0-9A-Za-z]/g, "");
}

/**
 * ציון איכות לשבירה *אחרי* הטוקן index (כלומר לפני index+1). 0..100.
 * ככל שהציון גבוה יותר — השבירה טבעית יותר לקורא.
 */
export function breakScore(tokens: CaptionToken[], index: number): number {
  const current = tokens[index];
  const next = tokens[index + 1];
  if (!current) return 0;
  if (!next) return 100;

  let score = 10;
  const currentText = current.text.trimEnd();
  if (SENTENCE_END.test(currentText)) score = 100;
  else if (CLAUSE_END.test(currentText)) score = 72;

  const gap = next.start - current.end;
  if (gap >= 0.7) score = Math.max(score, 70);
  else if (gap >= 0.4) score = Math.max(score, 54);
  else if (gap >= 0.25) score = Math.max(score, 38);
  else if (gap >= 0.15) score = Math.max(score, 22);

  const nextBare = stripPunctuation(next.text);
  if (BREAK_BEFORE.has(nextBare)) score = Math.max(score, 44);
  // פסוקית משועבדת: מילה שמתחילה ב-ש/כש
  if (/^(כש|ש)[א-ת]{2,}/.test(nextBare)) score = Math.max(score, 30);

  const currentBare = stripPunctuation(currentText);
  if (BIND_NEXT.has(currentBare)) score -= 70;
  if (currentBare.length <= 1) score -= 45;
  if (/^\d+$/.test(currentBare)) score -= 35;
  if (OPEN_QUOTE.test(currentText.slice(-1))) score -= 60;
  if (CLOSE_QUOTE.test(next.text)) score -= 55;
  // אל תשאיר מילה בודדת תלויה בסוף משפט
  if (SENTENCE_END.test(next.text.trimEnd()) && stripPunctuation(next.text).length <= 3) score -= 25;

  return Math.max(0, Math.min(100, score));
}

function charCount(tokens: CaptionToken[], from: number, to: number): number {
  let total = 0;
  for (let i = from; i < to; i++) total += tokens[i].text.length + (i > from ? 1 : 0);
  return total;
}

/** עלות כתובית יחידה — נמוך יותר = טוב יותר. */
function cueCost(tokens: CaptionToken[], from: number, to: number, policy: CaptionPolicy): number {
  const words = to - from;
  const chars = charCount(tokens, from, to);
  const duration = Math.max(0.001, tokens[to - 1].end + policy.tailSec - tokens[from].start);
  const capacity = policy.maxCharsPerLine * policy.maxLines;
  const isLast = to === tokens.length;

  let cost = Math.pow(words - policy.targetWords, 2) * 1.7;
  if (words < policy.minWords && !isLast) cost += 45;
  if (words < policy.minWords && isLast) cost += 14;
  if (chars > capacity) cost += (chars - capacity) * 5;
  if (duration < policy.minDurationSec) cost += (policy.minDurationSec - duration) * 10;
  if (duration > policy.maxDurationSec) cost += (duration - policy.maxDurationSec) * 22;
  const cps = chars / duration;
  if (cps > policy.maxCps) cost += (cps - policy.maxCps) * 7;
  cost += (100 - breakScore(tokens, to - 1)) * 0.6;
  return cost;
}

/**
 * חלוקה אופטימלית לכתוביות בתכנות דינמי.
 * כל טוקן משתייך לכתובית אחת בדיוק — ולכן אין חזרה על מילים בין כתוביות.
 */
export function segmentTokens(tokens: CaptionToken[], policy: CaptionPolicy = CAPTION_POLICY): Array<[number, number]> {
  const n = tokens.length;
  if (!n) return [];
  const best = new Float64Array(n + 1).fill(Infinity);
  const from = new Int32Array(n + 1).fill(-1);
  best[0] = 0;
  for (let end = 1; end <= n; end++) {
    const lowest = Math.max(0, end - policy.maxWords);
    for (let start = lowest; start < end; start++) {
      if (!Number.isFinite(best[start])) continue;
      const candidate = best[start] + cueCost(tokens, start, end, policy);
      if (candidate < best[end]) { best[end] = candidate; from[end] = start; }
    }
  }
  const spans: Array<[number, number]> = [];
  let cursor = n;
  while (cursor > 0) {
    const start = from[cursor];
    if (start < 0) { spans.push([0, cursor]); break; }
    spans.push([start, cursor]);
    cursor = start;
  }
  spans.reverse();
  return spans;
}

/** מפצל כתובית לשתי שורות מאוזנות בנקודת השבירה הטובה ביותר. */
export function splitLines(tokens: CaptionToken[], from: number, to: number, policy: CaptionPolicy): string[] {
  const words = tokens.slice(from, to).map((t) => t.text);
  const single = words.join(" ");
  if (policy.maxLines < 2 || single.length <= policy.maxCharsPerLine || words.length < 2) return [single];

  let bestSplit = -1;
  let bestCost = Infinity;
  for (let split = 1; split < words.length; split++) {
    const first = words.slice(0, split).join(" ");
    const second = words.slice(split).join(" ");
    const longest = Math.max(first.length, second.length);
    let cost = Math.abs(first.length - second.length) * 1.0;
    if (longest > policy.maxCharsPerLine) cost += (longest - policy.maxCharsPerLine) * 6;
    cost += (100 - breakScore(tokens, from + split - 1)) * 0.35;
    if (cost < bestCost) { bestCost = cost; bestSplit = split; }
  }
  if (bestSplit < 0) return [single];
  return [words.slice(0, bestSplit).join(" "), words.slice(bestSplit).join(" ")];
}

export interface BuildCuesOptions {
  policy?: Partial<CaptionPolicy>;
  /** גבול עליון לזמן (סוף הציר) — כתובית לא תחרוג ממנו. */
  limitSec?: number;
}

/**
 * בונה כתוביות סופיות: חלוקה, שורות, ותזמון שלא חופף ולא בורח מהדיבור.
 */
export function buildCaptionCues(tokens: CaptionToken[], options: BuildCuesOptions = {}): CaptionCue[] {
  const policy = { ...CAPTION_POLICY, ...options.policy };
  const clean = tokens
    .filter((t) => t.text.trim() && Number.isFinite(t.start) && Number.isFinite(t.end))
    .map((t) => ({ text: t.text.trim(), start: t.start, end: Math.max(t.start + 0.02, t.end) }))
    .sort((a, b) => a.start - b.start);
  if (!clean.length) return [];

  const spans = segmentTokens(clean, policy);
  const cues: CaptionCue[] = spans.map(([from, to]) => {
    const lines = splitLines(clean, from, to, policy);
    return {
      start: clean[from].start,
      end: clean[to - 1].end + policy.tailSec,
      lines,
      text: lines.map((line) => RLM + line).join("\n"),
      tokenFrom: from,
      tokenTo: to,
    };
  });

  // תזמון: להאריך עד למינימום כשיש מקום, אך לעולם לא לחפוף לכתובית הבאה
  for (let i = 0; i < cues.length; i++) {
    const next = cues[i + 1];
    const ceiling = next ? next.start - policy.minGapSec : (options.limitSec ?? cues[i].end + policy.tailSec);
    if (cues[i].end > ceiling) cues[i].end = ceiling;
    if (cues[i].end - cues[i].start < policy.minDurationSec) {
      cues[i].end = Math.min(Math.max(cues[i].end, cues[i].start + policy.minDurationSec), ceiling);
    }
    if (cues[i].end <= cues[i].start) cues[i].end = cues[i].start + 0.2;
  }
  return cues;
}

// ─── בקרת איכות ───────────────────────────────────────────────────────────

export interface CaptionAudit {
  count: number;
  /** מספר זוגות כתוביות עוקבות שחוזרות על אותה מילה — חייב להיות 0. */
  repeatedWordPairs: number;
  /** כתוביות שחורגות מקצב הקריאה. */
  tooFast: number[];
  /** כתוביות קצרות מהמינימום. */
  tooShort: number[];
  /** כתוביות של מילה בודדת שאינן סוף משפט. */
  orphans: number[];
  /** חפיפות זמן. */
  overlaps: number[];
  /** שורות ארוכות מהמותר. */
  longLines: number[];
  pass: boolean;
}

export function auditCaptions(cues: CaptionCue[], policy: CaptionPolicy = CAPTION_POLICY): CaptionAudit {
  const plain = (cue: CaptionCue) => cue.lines.join(" ").split(/\s+/).map(stripPunctuation).filter(Boolean);
  let repeatedWordPairs = 0;
  const tooFast: number[] = [];
  const tooShort: number[] = [];
  const orphans: number[] = [];
  const overlaps: number[] = [];
  const longLines: number[] = [];

  cues.forEach((cue, index) => {
    const words = plain(cue);
    const duration = cue.end - cue.start;
    const chars = cue.lines.join(" ").length;
    if (duration > 0 && chars / duration > policy.maxCps * 1.15) tooFast.push(index + 1);
    if (duration < policy.minDurationSec * 0.6) tooShort.push(index + 1);
    if (words.length === 1 && !SENTENCE_END.test(cue.lines.join(" ").trimEnd())) orphans.push(index + 1);
    if (cue.lines.some((line) => line.length > policy.maxCharsPerLine * 1.2)) longLines.push(index + 1);
    const next = cues[index + 1];
    if (next && next.start < cue.end - 1e-6) overlaps.push(index + 1);
    if (next) {
      const nextWords = plain(next);
      // חשיפה מצטברת: הכתובית הבאה פותחת במילים של הנוכחית
      const cumulative = words.length > 0 && words.every((word, i) => nextWords[i] === word);
      // חפיפה מהותית: רוב המילים המשמעותיות חוזרות
      const significant = words.filter((word) => word.length > 2);
      const shared = significant.filter((word) => nextWords.includes(word)).length;
      const heavyOverlap = significant.length > 0 && shared / significant.length >= 0.5;
      if (cumulative || heavyOverlap) repeatedWordPairs++;
    }
  });

  return {
    count: cues.length,
    repeatedWordPairs,
    tooFast,
    tooShort,
    orphans,
    overlaps,
    longLines,
    pass: repeatedWordPairs === 0 && overlaps.length === 0 && tooFast.length === 0 && longLines.length === 0,
  };
}
