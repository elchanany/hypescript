// יישור-לפי-סקריפט — פורט של editing.script_keep_mask מהגרסה המקומית.
// משתמש ב-LCS כדי לייצר opcodes (equal/replace/delete/insert), עמיד לשגיאות תמלול.

import { Word } from "./models";

const NIQQUD = /[֑-ׇ]/g;
const NON_WORD = /[^א-ת0-9A-Za-z]+/g;
const FINALS: Record<string, string> = {
  "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ",
};

export function normalizeHebrew(text: string): string {
  let t = text.replace(NIQQUD, "").replace(NON_WORD, " ");
  t = Array.from(t).map((c) => FINALS[c] ?? c).join("");
  return t.trim().toLowerCase();
}

type Op = { tag: "equal" | "replace" | "delete" | "insert"; a1: number; a2: number; b1: number; b2: number };

// זוגות אינדקסים תואמים לפי LCS (i,j עולים).
function lcsMatches(a: string[], b: string[]): Array<[number, number]> {
  const n = a.length, m = b.length;
  // DP על שורות (חוסך זיכרון), אבל צריך backtrack -> נשמור טבלה מלאה כשקטן,
  // אחרת נשתמש בגרסת האש. לטקסטים של שיעור (~אלפי מילים) טבלה מלאה בסדר.
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const matches: Array<[number, number]> = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      matches.push([i, j]);
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return matches;
}

export function getOpcodes(a: string[], b: string[]): Op[] {
  const matches = lcsMatches(a, b);
  const ops: Op[] = [];
  let i = 0, j = 0;
  const push = (tag: Op["tag"], a1: number, a2: number, b1: number, b2: number) => {
    if (a1 === a2 && b1 === b2) return;
    const last = ops[ops.length - 1];
    if (last && last.tag === tag && last.a2 === a1 && last.b2 === b1) {
      last.a2 = a2; last.b2 = b2;
    } else {
      ops.push({ tag, a1, a2, b1, b2 });
    }
  };
  for (const [mi, mj] of matches) {
    if (i < mi && j < mj) push("replace", i, mi, j, mj);
    else if (i < mi) push("delete", i, mi, j, j);
    else if (j < mj) push("insert", i, i, j, mj);
    push("equal", mi, mi + 1, mj, mj + 1);
    i = mi + 1; j = mj + 1;
  }
  if (i < a.length && j < b.length) push("replace", i, a.length, j, b.length);
  else if (i < a.length) push("delete", i, a.length, j, j);
  else if (j < b.length) push("insert", i, i, j, b.length);
  return ops;
}

const REPLACE_KEEP_MAX_WORDS = 8;

// מחזיר מסכה בוליאנית מקבילה ל-words: true=לשמור.
export function scriptKeepMask(words: Word[], scriptText: string): boolean[] {
  const mask = new Array(words.length).fill(false);
  const indexed: Array<[number, string]> = [];
  words.forEach((w, i) => {
    const n = normalizeHebrew(w.text);
    if (n) indexed.push([i, n]);
  });
  const transcriptTokens = indexed.map(([, n]) => n);
  const scriptTokens = scriptText.split(/\s+/).map(normalizeHebrew).filter(Boolean);

  if (transcriptTokens.length === 0 || scriptTokens.length === 0) {
    return new Array(words.length).fill(true);
  }

  const ops = getOpcodes(transcriptTokens, scriptTokens);
  for (const op of ops) {
    let keepBlock = false;
    if (op.tag === "equal") keepBlock = true;
    else if (op.tag === "replace") {
      const tLen = op.a2 - op.a1, sLen = op.b2 - op.b1;
      keepBlock = tLen <= REPLACE_KEEP_MAX_WORDS && tLen <= sLen * 2 + 2;
    }
    if (keepBlock) {
      for (let k = op.a1; k < op.a2; k++) mask[indexed[k][0]] = true;
    }
  }
  return mask;
}
