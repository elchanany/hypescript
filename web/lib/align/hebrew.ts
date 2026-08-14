// נרמול טוקנים עברי + מדד דמיון — הבסיס ליישור סקריפט↔ASR.
//
// למה זה קיים: תמלול אוטומטי בעברית טועה באופן *שיטתי*, לא אקראי:
//   1. אותיות שימוש (ו/ה/ב/כ/ל/מ/ש) נבלעות או נוספות: "ובמקום" ↔ "במקום".
//   2. כתיב מלא/חסר: "סילוקו" ↔ "סילקו", "תפארת" ↔ "טיפרת".
//   3. עיצורים הומופוניים: כ↔ק, ט↔ת, א/ע/ה בתוך מילה.
// השוואת מחרוזות מדויקת (הגישה הקודמת) נכשלת בכל אחד מאלה, והמילה
// פשוט נעלמת מהפלט. כאן מחשבים דמיון מדורג במקום שוויון בינארי.

/** ניקוד, טעמים ומקף-שוואי. */
const NIQQUD = /[֑-ׇ]/g;
/** גרש/גרשיים עבריים ומקבילותיהם הלטיניות — משמשים בראשי תיבות ("י\"א"). */
const GERESH = /[׳״'"`´’‘“”]/g;
/** כל מה שאינו אות עברית/לטינית/ספרה. */
const NON_WORD = /[^א-ת0-9A-Za-z]+/g;

const FINALS: Record<string, string> = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };

/** אותיות שימוש שעלולות להיבלע/להתווסף בתמלול. */
const PARTICLES = new Set(["ו", "ה", "ב", "כ", "ל", "מ", "ש"]);

/** הכי קצר שנשאר אחרי הסרת אות שימוש — מתחת לזה ההסרה הורסת את המילה. */
const MIN_STEM_LEN = 3;

export interface HebrewToken {
  /** הטקסט המקורי כפי שנכתב (מקור האמת לתצוגה/כתוביות). */
  raw: string;
  /** אותיות בלבד, בלי ניקוד/פיסוק, סופיות מקופלות. */
  base: string;
  /** base בלי אותיות שימוש מובילות. */
  stem: string;
  /** קיפול פונטי — מנטרל בלבולי כ/ק, ט/ת ואמות קריאה. */
  phonetic: string;
  /** true אם הטוקן מסתיים בסימן סוף-משפט. */
  endsSentence: boolean;
  /** true אם הטוקן מסתיים בפיסוק שובר-פסוקית. */
  endsClause: boolean;
  /** true אם זה מספר (ספרות או ראשי תיבות עם גרשיים). */
  numeric: boolean;
}

const SENTENCE_END = /[.!?…׃]["'”’)\]]*$/;
const CLAUSE_END = /[,;:־–—]["'”’)\]]*$/;

export function foldFinals(text: string): string {
  let out = "";
  for (const ch of text) out += FINALS[ch] ?? ch;
  return out;
}

/** נרמול בסיסי — תואם לאחור ל-normalizeHebrew הישן. */
export function normalizeBase(text: string): string {
  const stripped = String(text || "")
    .replace(NIQQUD, "")
    .replace(GERESH, "")
    .replace(NON_WORD, " ")
    .trim()
    .toLowerCase();
  return foldFinals(stripped);
}

/** מסיר עד שתי אותיות שימוש מובילות, כל עוד נשאר גזע בעל אורך סביר. */
export function stripParticles(base: string): string {
  let out = base;
  for (let i = 0; i < 2; i++) {
    const head = out[0];
    if (!head || !PARTICLES.has(head)) break;
    const rest = out.slice(1);
    if (rest.length < MIN_STEM_LEN) break;
    out = rest;
  }
  return out;
}

/**
 * קיפול פונטי לעברית מדוברת:
 *  - כ→ק ו-ט→ת (אותו צליל, כתיב שונה) — כך "כשר"/"קשר" מתלכדים.
 *  - א/ע/ה בתוך מילה או בסופה נשמטות (אינן נשמעות).
 *  - אמות קריאה י/ו פנימיות נשמטות — כך "תפארת"/"טיפרת" מתלכדים.
 *  - רצף אותיות זהות מתכווץ.
 * שומרים על אות ראשונה תמיד, כדי לא למחוק מילים קצרות.
 */
export function phoneticFold(base: string): string {
  if (!base) return "";
  const chars = Array.from(base);
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    let ch = chars[i];
    const first = i === 0;
    if (ch === "כ") ch = "ק";
    else if (ch === "ט") ch = "ת";
    else if (ch === "ש") ch = "ס";
    if (!first && (ch === "א" || ch === "ע" || ch === "ה")) continue;
    // אמות קריאה פנימיות — רק כשנשאר די גוף למילה
    if (!first && (ch === "י" || ch === "ו") && base.length > 3) continue;
    if (out.length && out[out.length - 1] === ch) continue;
    out += ch;
  }
  return out || base;
}

export function tokenizeHebrew(text: string): HebrewToken[] {
  const out: HebrewToken[] = [];
  for (const rawPiece of String(text || "").split(/\s+/)) {
    const raw = rawPiece.trim();
    if (!raw) continue;
    const base = normalizeBase(raw);
    if (!base) continue;
    out.push(makeToken(raw, base));
  }
  return out;
}

/** בונה טוקן יחיד — משמש גם למילות ASR שכבר מגיעות מופרדות. */
export function makeToken(raw: string, precomputedBase?: string): HebrewToken {
  const base = precomputedBase ?? normalizeBase(raw);
  const stem = stripParticles(base);
  return {
    raw,
    base,
    stem,
    phonetic: phoneticFold(base),
    endsSentence: SENTENCE_END.test(raw.trimEnd()),
    endsClause: CLAUSE_END.test(raw.trimEnd()),
    numeric: /^\d+$/.test(base) || /^[א-ת]{1,3}$/.test(base) === false && /\d/.test(base),
  };
}

/** מרחק לוינשטיין עם תקרה — מפסיק מוקדם כשברור שהמילים רחוקות. */
export function levenshtein(a: string, b: string, ceiling = Infinity): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  if (Math.abs(a.length - b.length) > ceiling) return ceiling + 1;
  let prev = new Uint16Array(b.length + 1);
  let cur = new Uint16Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    const ca = a[i - 1];
    for (let j = 1; j <= b.length; j++) {
      const cost = ca === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > ceiling) return ceiling + 1;
    const swap = prev; prev = cur; cur = swap;
  }
  return prev[b.length];
}

/** יחס דמיון 0..1 לפי לוינשטיין. */
export function levenshteinRatio(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  if (!longest) return 1;
  const ceiling = Math.ceil(longest * 0.5);
  const distance = levenshtein(a, b, ceiling);
  if (distance > ceiling) return 0;
  return 1 - distance / longest;
}

/** האם b הוא a עם אות שימוש מובילה (או להפך). */
export function isParticleVariant(a: string, b: string): boolean {
  const [shortSide, longSide] = a.length <= b.length ? [a, b] : [b, a];
  if (shortSide.length < MIN_STEM_LEN) return false;
  const delta = longSide.length - shortSide.length;
  if (delta < 1 || delta > 2) return false;
  if (!longSide.endsWith(shortSide)) return false;
  for (const ch of longSide.slice(0, delta)) {
    if (!PARTICLES.has(ch)) return false;
  }
  return true;
}

export const SIMILARITY = {
  exact: 1,
  particle: 0.93,
  phonetic: 0.87,
  /** מתחת לזה שני הטוקנים נחשבים זרים. */
  floor: 0.62,
} as const;

/**
 * דמיון בין טוקן ASR לטוקן סקריפט, 0..1.
 * הסולם מדורג בכוונה: התאמה מדויקת גוברת על אות שימוש, שגוברת על פונטיקה,
 * שגוברת על קרבת-כתיב. כך היישור הגלובלי בוחר את ההתאמה הטובה כשיש כמה.
 */
/**
 * מתחת לזה התאמה נחשבת "חלשה" — היא מתקבלת, אבל מדווחת לבדיקה אנושית.
 * שגיאת אות אחת יכולה להיות שיבוש תמלול (תהיה/יהיה) או הבדל אמיתי
 * (תשפ"ו/תשע"ו), ואי-אפשר להכריע ביניהם אקוסטית.
 */
export const WEAK_MATCH = 0.82;

export function tokenSimilarity(a: HebrewToken, b: HebrewToken): number {
  if (a.base === b.base) return SIMILARITY.exact;
  if (isParticleVariant(a.base, b.base)) return SIMILARITY.particle;
  if (a.stem && a.stem === b.stem) return SIMILARITY.particle - 0.02;
  if (a.phonetic && a.phonetic === b.phonetic) return SIMILARITY.phonetic;

  // ניקוד לפי *מספר* העריכות ולא לפי יחסן לאורך. יחס מעניש מילים קצרות
  // שלא בצדק: שגיאת אות אחת ב"תהיה"→"יהיה" נותנת יחס 0.75 בלבד, בעוד
  // שאותה שגיאה במילה בת עשר אותיות נותנת 0.9 — למרות שהיא אותה שגיאה.
  const longest = Math.max(a.base.length, b.base.length);
  const distance = levenshtein(a.base, b.base, 3);
  if (distance === 1 && longest >= 3) return 0.8;
  if (distance === 2 && longest >= 6) return 0.72;
  if (distance === 3 && longest >= 9) return 0.66;

  const ratio = levenshteinRatio(a.base, b.base);
  if (ratio >= 0.8) return 0.6 + ratio * 0.25;
  const phoneticRatio = levenshteinRatio(a.phonetic, b.phonetic);
  if (phoneticRatio >= 0.85) return 0.58 + phoneticRatio * 0.2;
  return ratio * 0.5;
}

/** תואם לאחור — הקוד הקיים מייבא את השם הזה. */
export function normalizeHebrew(text: string): string {
  return normalizeBase(text);
}
