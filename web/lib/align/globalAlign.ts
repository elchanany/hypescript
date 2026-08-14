// יישור גלובלי מונוטוני בין תמלול ASR לסקריפט המשתמש.
//
// הגישה הקודמת הייתה חיפוש חמדני עם סמן: לכל מילת-סקריפט חיפשה התאמה מדויקת
// קדימה, ואם לא נמצאה — דילגה עליה בשקט (si++). זה בדיוק המקור ל"נעלמו מילים":
// שגיאת תמלול אחת מוחקת מילה מהפלט, בלי שאיש יידע.
//
// כאן: Needleman–Wunsch עם עונשי-פער *א-סימטריים*. דילוג על מילת ASR זול
// (המשתמש באמת מוחק חלקים גדולים), דילוג על מילת סקריפט יקר מאוד (המילה שלו
// חייבת להימצא). כל מילת סקריפט שלא הותאמה מדווחת במפורש — לעולם לא נבלעת.
//
// לקלט ארוך משתמשים בעוגני-ייחוד: מילים שמופיעות פעם אחת בשני הצדדים מפרקות
// את הבעיה לבלוקים קטנים שמיושרים במלואם. מהיר יותר וגם מדויק יותר.

import { HebrewToken, SIMILARITY, WEAK_MATCH, tokenSimilarity } from "./hebrew";

export interface AlignPair {
  /** אינדקס בטוקני ה-ASR, או null כשמילת הסקריפט לא נמצאה. */
  asrIndex: number | null;
  /** אינדקס בטוקני הסקריפט, או null כשמילת ASR אינה בסקריפט. */
  scriptIndex: number | null;
  /** דמיון 0..1 (רק לזוגות מותאמים). */
  similarity: number;
}

export interface AlignOptions {
  /** עונש פתיחת דילוג על טוקן ASR (מילה שנאמרה ואינה בסקריפט). */
  asrGapOpen?: number;
  /** עונש המשך דילוג ASR — נמוך בכוונה, קטעים ארוכים נמחקים לגיטימית. */
  asrGapExtend?: number;
  /** עונש פתיחת דילוג על טוקן סקריפט (מילה שהמשתמש ביקש ולא נמצאה). */
  scriptGapOpen?: number;
  scriptGapExtend?: number;
  /** מתחת לדמיון הזה זוג נחשב לא-התאמה ולא ייווצר. */
  minSimilarity?: number;
  /** מעל מכפלת האורכים הזו עוברים ליישור מבוסס-עוגנים. */
  fullMatrixBudget?: number;
}

const DEFAULTS: Required<AlignOptions> = {
  asrGapOpen: -0.55,
  asrGapExtend: -0.03,
  scriptGapOpen: -3.2,
  scriptGapExtend: -1.6,
  minSimilarity: SIMILARITY.floor,
  fullMatrixBudget: 4_000_000,
};

/**
 * ציון זוג. מתחת לסף הדמיון הזיווג *אסור*, לא רק יקר: אחרת, מכיוון שדילוג על
 * מילת סקריפט יקר בכוונה, האלגוריתם היה מעדיף להצמיד כל מילת סקריפט למילת ASR
 * אקראית — ואז מילה שלא נאמרה כלל הייתה "נמצאת" והדוח היה משקר.
 */
function pairScore(similarity: number, minSimilarity: number): number {
  if (similarity < minSimilarity) return FORBIDDEN;
  return (similarity - minSimilarity) / (1 - minSimilarity) * 1.8 - 0.2;
}

type Matrix = { m: Float32Array; x: Float32Array; y: Float32Array; tm: Uint8Array; tx: Uint8Array; ty: Uint8Array };

const NEG = -1e9;
/** זיווג אסור — שלילי מספיק כדי לא להיבחר, סופי כדי לא לייצר NaN. */
const FORBIDDEN = -1e5;

/**
 * Needleman–Wunsch עם פערים אפיניים (Gotoh).
 * M = זוג מותאם, X = דילוג על ASR, Y = דילוג על סקריפט.
 */
function alignBlock(
  asr: HebrewToken[],
  script: HebrewToken[],
  asrOffset: number,
  scriptOffset: number,
  opts: Required<AlignOptions>,
): AlignPair[] {
  const n = asr.length;
  const m = script.length;
  if (!n && !m) return [];
  if (!n) return script.map((_, j) => ({ asrIndex: null, scriptIndex: scriptOffset + j, similarity: 0 }));
  if (!m) return asr.map((_, i) => ({ asrIndex: asrOffset + i, scriptIndex: null, similarity: 0 }));

  const width = m + 1;
  const size = (n + 1) * width;
  const mat: Matrix = {
    m: new Float32Array(size), x: new Float32Array(size), y: new Float32Array(size),
    tm: new Uint8Array(size), tx: new Uint8Array(size), ty: new Uint8Array(size),
  };
  const at = (i: number, j: number) => i * width + j;

  mat.m[0] = 0;
  mat.x[0] = NEG;
  mat.y[0] = NEG;
  for (let i = 1; i <= n; i++) {
    const k = at(i, 0);
    mat.m[k] = NEG;
    mat.y[k] = NEG;
    mat.x[k] = opts.asrGapOpen + (i - 1) * opts.asrGapExtend;
    mat.tx[k] = i === 1 ? 0 : 1; // 0=מ-M, 1=המשך X
  }
  for (let j = 1; j <= m; j++) {
    const k = at(0, j);
    mat.m[k] = NEG;
    mat.x[k] = NEG;
    mat.y[k] = opts.scriptGapOpen + (j - 1) * opts.scriptGapExtend;
    mat.ty[k] = j === 1 ? 0 : 2; // 0=מ-M, 2=המשך Y
  }

  for (let i = 1; i <= n; i++) {
    const asrToken = asr[i - 1];
    for (let j = 1; j <= m; j++) {
      const k = at(i, j);
      const diag = at(i - 1, j - 1);
      const score = pairScore(tokenSimilarity(asrToken, script[j - 1]), opts.minSimilarity);

      const fromM = mat.m[diag], fromX = mat.x[diag], fromY = mat.y[diag];
      let best = fromM, from = 0;
      if (fromX > best) { best = fromX; from = 1; }
      if (fromY > best) { best = fromY; from = 2; }
      mat.m[k] = best + score;
      mat.tm[k] = from;

      // X: דילוג על טוקן ASR (התקדמות ב-i בלבד)
      const up = at(i - 1, j);
      const xOpen = Math.max(mat.m[up], mat.y[up]) + opts.asrGapOpen;
      const xExtend = mat.x[up] + opts.asrGapExtend;
      if (xExtend >= xOpen) { mat.x[k] = xExtend; mat.tx[k] = 1; }
      else { mat.x[k] = xOpen; mat.tx[k] = mat.m[up] >= mat.y[up] ? 0 : 2; }

      // Y: דילוג על טוקן סקריפט (התקדמות ב-j בלבד)
      const left = at(i, j - 1);
      const yOpen = Math.max(mat.m[left], mat.x[left]) + opts.scriptGapOpen;
      const yExtend = mat.y[left] + opts.scriptGapExtend;
      if (yExtend >= yOpen) { mat.y[k] = yExtend; mat.ty[k] = 2; }
      else { mat.y[k] = yOpen; mat.ty[k] = mat.m[left] >= mat.x[left] ? 0 : 1; }
    }
  }

  // Traceback
  const out: AlignPair[] = [];
  let i = n, j = m;
  const endK = at(n, m);
  let state: 0 | 1 | 2 = 0;
  let best = mat.m[endK];
  if (mat.x[endK] > best) { best = mat.x[endK]; state = 1; }
  if (mat.y[endK] > best) { state = 2; }

  while (i > 0 || j > 0) {
    const k = at(i, j);
    if (state === 0) {
      out.push({
        asrIndex: asrOffset + i - 1,
        scriptIndex: scriptOffset + j - 1,
        similarity: tokenSimilarity(asr[i - 1], script[j - 1]),
      });
      state = mat.tm[k] as 0 | 1 | 2;
      i--; j--;
    } else if (state === 1) {
      out.push({ asrIndex: asrOffset + i - 1, scriptIndex: null, similarity: 0 });
      state = mat.tx[k] as 0 | 1 | 2;
      i--;
    } else {
      out.push({ asrIndex: null, scriptIndex: scriptOffset + j - 1, similarity: 0 });
      state = mat.ty[k] as 0 | 1 | 2;
      j--;
    }
    if (i === 0 && j === 0) break;
    if (i === 0) state = 2;
    else if (j === 0) state = 1;
  }
  out.reverse();
  return out;
}

interface Anchor { asrIndex: number; scriptIndex: number; }

/**
 * עוגנים = מילים שמופיעות *פעם אחת בלבד* בשני הצדדים ואורכן ≥4 אותיות.
 * ייחודיות דו-כיוונית מבטיחה שאין אי-ודאות בשיוך, ולכן אפשר לפצל סביבן.
 */
export function findUniqueAnchors(asr: HebrewToken[], script: HebrewToken[], minLength = 4): Anchor[] {
  const count = (tokens: HebrewToken[]) => {
    const map = new Map<string, number[]>();
    tokens.forEach((token, index) => {
      if (token.base.length < minLength) return;
      const slot = map.get(token.base);
      if (slot) slot.push(index);
      else map.set(token.base, [index]);
    });
    return map;
  };
  const asrMap = count(asr);
  const scriptMap = count(script);
  const candidates: Anchor[] = [];
  for (const [base, asrHits] of asrMap) {
    if (asrHits.length !== 1) continue;
    const scriptHits = scriptMap.get(base);
    if (!scriptHits || scriptHits.length !== 1) continue;
    candidates.push({ asrIndex: asrHits[0], scriptIndex: scriptHits[0] });
  }
  candidates.sort((a, b) => a.asrIndex - b.asrIndex);
  return longestIncreasing(candidates);
}

/** LIS על scriptIndex — משאיר רק שרשרת עוגנים מונוטונית (patience sorting). */
function longestIncreasing(items: Anchor[]): Anchor[] {
  if (items.length < 2) return items;
  const tails: number[] = [];
  const tailIndex: number[] = [];
  const previous = new Int32Array(items.length).fill(-1);
  for (let i = 0; i < items.length; i++) {
    const value = items[i].scriptIndex;
    let low = 0, high = tails.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (tails[mid] < value) low = mid + 1;
      else high = mid;
    }
    tails[low] = value;
    tailIndex[low] = i;
    previous[i] = low > 0 ? tailIndex[low - 1] : -1;
  }
  const out: Anchor[] = [];
  let cursor = tailIndex[tails.length - 1];
  while (cursor >= 0) { out.push(items[cursor]); cursor = previous[cursor]; }
  out.reverse();
  return out;
}

/**
 * מיישר תמלול לסקריפט. תמיד מחזיר כיסוי מלא: כל טוקן ASR וכל טוקן סקריפט
 * מופיעים בדיוק פעם אחת בתוצאה (כזוג מותאם או כפער מפורש).
 */
export function alignTokens(
  asr: HebrewToken[],
  script: HebrewToken[],
  options: AlignOptions = {},
): AlignPair[] {
  const opts = { ...DEFAULTS, ...options };
  if (!asr.length || !script.length) {
    return alignBlock(asr, script, 0, 0, opts);
  }
  if (asr.length * script.length <= opts.fullMatrixBudget) {
    return alignBlock(asr, script, 0, 0, opts);
  }

  const anchors = findUniqueAnchors(asr, script);
  if (!anchors.length) {
    // אין עוגנים ובלוק ענק — מיישרים ברצועה סביב האלכסון היחסי
    return alignBanded(asr, script, opts);
  }

  const out: AlignPair[] = [];
  let asrCursor = 0;
  let scriptCursor = 0;
  for (const anchor of anchors) {
    if (anchor.asrIndex < asrCursor || anchor.scriptIndex < scriptCursor) continue;
    const asrBlock = asr.slice(asrCursor, anchor.asrIndex);
    const scriptBlock = script.slice(scriptCursor, anchor.scriptIndex);
    if (asrBlock.length * scriptBlock.length > opts.fullMatrixBudget) {
      out.push(...alignBanded(asrBlock, scriptBlock, opts, asrCursor, scriptCursor));
    } else {
      out.push(...alignBlock(asrBlock, scriptBlock, asrCursor, scriptCursor, opts));
    }
    out.push({ asrIndex: anchor.asrIndex, scriptIndex: anchor.scriptIndex, similarity: 1 });
    asrCursor = anchor.asrIndex + 1;
    scriptCursor = anchor.scriptIndex + 1;
  }
  const tailAsr = asr.slice(asrCursor);
  const tailScript = script.slice(scriptCursor);
  if (tailAsr.length * tailScript.length > opts.fullMatrixBudget) {
    out.push(...alignBanded(tailAsr, tailScript, opts, asrCursor, scriptCursor));
  } else {
    out.push(...alignBlock(tailAsr, tailScript, asrCursor, scriptCursor, opts));
  }
  return out;
}

/**
 * גיבוי לבלוק ענק בלי עוגנים: מפצלים את הסקריפט לחצי, מוצאים את נקודת
 * החיתוך הטובה ב-ASR לפי חיפוש חלון, ומיישרים כל חצי בנפרד (חלוקה ומיזוג).
 */
function alignBanded(
  asr: HebrewToken[],
  script: HebrewToken[],
  opts: Required<AlignOptions>,
  asrOffset = 0,
  scriptOffset = 0,
): AlignPair[] {
  if (asr.length * script.length <= opts.fullMatrixBudget) {
    return alignBlock(asr, script, asrOffset, scriptOffset, opts);
  }
  const scriptMid = script.length >> 1;
  const ratio = asr.length / Math.max(1, script.length);
  const guess = Math.round(scriptMid * ratio);
  const radius = Math.max(64, Math.round(asr.length * 0.1));
  const from = Math.max(1, guess - radius);
  const to = Math.min(asr.length - 1, guess + radius);

  // בוחרים נקודת חיתוך שבה מילת ה-ASR הכי דומה למילת הסקריפט האמצעית
  let cut = guess;
  let bestScore = -Infinity;
  const pivot = script[scriptMid];
  for (let i = from; i <= to; i++) {
    const score = tokenSimilarity(asr[i], pivot) - Math.abs(i - guess) / Math.max(1, radius) * 0.3;
    if (score > bestScore) { bestScore = score; cut = i; }
  }
  return [
    ...alignBanded(asr.slice(0, cut), script.slice(0, scriptMid), opts, asrOffset, scriptOffset),
    ...alignBanded(asr.slice(cut), script.slice(scriptMid), opts, asrOffset + cut, scriptOffset + scriptMid),
  ];
}

export interface AlignmentReport {
  pairs: AlignPair[];
  /** אינדקסי סקריפט שהותאמו לטוקן ASR. */
  matchedScript: number[];
  /** אינדקסי סקריפט שלא נמצאו בתמלול — זה מה שהיה "נעלם" בשקט. */
  missingScript: number[];
  /** אינדקסי ASR שנאמרו ואינם בסקריפט (מיועדים לחיתוך). */
  droppedAsr: number[];
  /**
   * אינדקסי סקריפט שהותאמו בדמיון נמוך — התקבלו כדי לא לאבד מילה, אבל
   * ייתכן שהמילה נאמרה אחרת ממה שנכתב. ראויים לבדיקה אנושית.
   */
  weakMatches: number[];
  coverage: number;
  /** דמיון ממוצע על הזוגות שהותאמו. */
  meanSimilarity: number;
}

export function summarizeAlignment(pairs: AlignPair[], scriptLength: number): AlignmentReport {
  const matchedScript: number[] = [];
  const missingScript: number[] = [];
  const droppedAsr: number[] = [];
  const weakMatches: number[] = [];
  let similaritySum = 0;
  for (const pair of pairs) {
    if (pair.asrIndex != null && pair.scriptIndex != null) {
      matchedScript.push(pair.scriptIndex);
      if (pair.similarity < WEAK_MATCH) weakMatches.push(pair.scriptIndex);
      similaritySum += pair.similarity;
    } else if (pair.scriptIndex != null) {
      missingScript.push(pair.scriptIndex);
    } else if (pair.asrIndex != null) {
      droppedAsr.push(pair.asrIndex);
    }
  }
  return {
    pairs,
    matchedScript,
    missingScript,
    droppedAsr,
    weakMatches,
    coverage: scriptLength ? matchedScript.length / scriptLength : 1,
    meanSimilarity: matchedScript.length ? similaritySum / matchedScript.length : 0,
  };
}
