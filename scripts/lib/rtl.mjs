// סידור טקסט עברי לטרמינל שלא יודע bidi.
//
// הבעיה: conhost, Windows Terminal, והטרמינל של VS Code מציירים תווים
// משמאל לימין לפי הסדר הלוגי שבמחרוזת. הם לא מיישמים את אלגוריתם ה-bidi
// של יוניקוד. התוצאה: עברית מופיעה הפוכה — האות הראשונה בצד שמאל.
//
// הפתרון: להפוך את הטקסט בעצמנו לפני ההדפסה, בדיוק כמו שדפדפן מסדר אותו.
// מה שיוצא נקרא נכון בטרמינל טיפש, ולכן נשמר כאן כ"סדר ויזואלי".
//
// המימוש הוא גרסה מצומצמת של UBA: כיוון בסיס לפי האות החזקה הראשונה
// (P2/P3), ספרות נצמדות להקשר שלפניהן (W2), תווים ניטרליים לוקחים את כיוון
// השכנים אם הם זהים ואחרת את כיוון הבסיס (N1/N2), והיפוך לפי רמות (L2).
//
// שתי תכונות שחשוב לשמור: אורך השורה לא משתנה (טבלאות נשארות מיושרות),
// והרווח בתחילת השורה ובסופה נשאר במקומו.

const RTL_LETTER = /[֐-׿؀-ۿ܀-ݏހ-޿ࠀ-࡟יִ-﷿ﹰ-﻿]/;
const LTR_LETTER = /[A-Za-zÀ-ʯͰ-֏ऀ-῿Ⰰ-ⷿ]/;
const DIGITS = /^[0-9]+(?:[.,:/][0-9]+)*/;

/** תווים שצריך להחליף בבן הזוג שלהם כשהופכים כיוון. */
const MIRROR = new Map(Object.entries({
  "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{",
  "<": ">", ">": "<", "«": "»", "»": "«", "‹": "›", "›": "‹",
}));

/**
 * פירוק שורה לאסימונים: מילה עברית, מילה לטינית, מספר שלם, או תו ניטרלי בודד.
 * המספר נשאר אסימון אחד כדי ש-"0/13" לא יתהפך ל-"13/0".
 */
function tokenize(text) {
  const tokens = [];
  let index = 0;
  while (index < text.length) {
    const number = text.slice(index).match(DIGITS);
    if (number) {
      tokens.push({ text: number[0], kind: "number" });
      index += number[0].length;
      continue;
    }
    const char = text[index];
    if (RTL_LETTER.test(char)) {
      let end = index;
      while (end < text.length && RTL_LETTER.test(text[end])) end++;
      tokens.push({ text: text.slice(index, end), kind: "rtl" });
      index = end;
      continue;
    }
    if (LTR_LETTER.test(char)) {
      let end = index;
      while (end < text.length && LTR_LETTER.test(text[end])) end++;
      tokens.push({ text: text.slice(index, end), kind: "ltr" });
      index = end;
      continue;
    }
    tokens.push({ text: char, kind: "neutral" });
    index++;
  }
  return tokens;
}

const BRACKET_OPENS = new Map([["(", ")"], ["[", "]"], ["{", "}"]]);

/**
 * כלל N0 של יוניקוד: זוג סוגריים תואם מקבל כיוון אחד לשני האיברים.
 * בלי זה "ראייה (חלופה)" בשורה שבסיסה לטיני יוצא עם שני סוגריים סוגרים,
 * כי הסוגר האחרון נשען על סוף השורה ומקבל את כיוון הבסיס.
 */
function resolveBracketPairs(tokens, base) {
  const stack = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.dir || token.kind !== "neutral") continue;
    if (BRACKET_OPENS.has(token.text)) { stack.push({ at: i, close: BRACKET_OPENS.get(token.text) }); continue; }
    const open = stack[stack.length - 1];
    if (!open || open.close !== token.text) continue;
    stack.pop();

    const inner = tokens.slice(open.at + 1, i);
    let dir = null;
    if (inner.some((x) => x.dir === base)) {
      dir = base;
    } else if (inner.some((x) => x.dir && x.dir !== base)) {
      // יש בפנים כיוון הפוך בלבד — הולכים אחריו רק אם גם ההקשר שלפני
      // הסוגר הפותח הפוך, אחרת חוזרים לכיוון הבסיס.
      let before = base;
      for (let k = open.at - 1; k >= 0; k--) {
        if (tokens[k].dir) { before = tokens[k].dir; break; }
      }
      dir = before !== base ? before : base;
    }
    if (dir) { tokens[open.at].dir = dir; tokens[i].dir = dir; }
  }
}

/** קובע לכל אסימון כיוון סופי: "R" או "L". */
function resolveDirections(tokens, base) {
  for (const token of tokens) {
    if (token.kind === "rtl") token.dir = "R";
    else if (token.kind === "ltr") token.dir = "L";
  }
  // ספרה מקבלת את הכיוון של האות החזקה שלפניה — "עמוד 12" נשאר צמוד לעברית.
  let context = base;
  for (const token of tokens) {
    if (token.dir) { context = token.dir; continue; }
    if (token.kind === "number") token.dir = context;
  }
  resolveBracketPairs(tokens, base);
  // ניטרלי בין שני צדדים שווים מקבל אותם; אחרת נופל לכיוון הבסיס.
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].dir) continue;
    let end = i;
    while (end < tokens.length && !tokens[end].dir) end++;
    const before = i === 0 ? base : tokens[i - 1].dir;
    const after = end === tokens.length ? base : tokens[end].dir;
    const dir = before === after ? before : base;
    for (let k = i; k < end; k++) tokens[k].dir = dir;
    i = end - 1;
  }
  return tokens;
}

function flip(text) {
  return [...text].reverse().map((char) => MIRROR.get(char) ?? char).join("");
}

/**
 * הופך רצף אסימונים שכיוונו `spanDir`. אסימונים בכיוון ההפוך נשארים
 * כמו שהם ונדבקים לשכניהם — ככה "API — Vercel" בתוך משפט עברי לא מתפרק.
 */
function reorder(tokens, spanDir) {
  const units = [];
  for (const token of tokens) {
    const opposite = token.dir !== spanDir;
    const last = units[units.length - 1];
    if (opposite && last?.opposite) { last.text += token.text; continue; }
    // מספר לא מתהפך גם כשהוא בתוך רצף עברי — 2024 נשאר 2024.
    units.push({ text: opposite || token.kind === "number" ? token.text : flip(token.text), opposite });
  }
  return units.reverse().map((unit) => unit.text).join("");
}

/** ממיר שורה בודדת מסדר לוגי לסדר ויזואלי. */
export function toVisual(line) {
  if (!RTL_LETTER.test(line)) return line;

  const lead = line.match(/^\s*/)[0];
  const trail = line.slice(lead.length).match(/\s*$/)[0];
  const body = line.slice(lead.length, line.length - trail.length);
  if (!body) return line;

  const tokens = tokenize(body);
  const firstStrong = tokens.find((token) => token.kind === "rtl" || token.kind === "ltr");
  const base = firstStrong?.kind === "rtl" ? "R" : "L";
  resolveDirections(tokens, base);

  // בסיס עברי: כל השורה מתהפכת. בסיס לטיני: רק קטעי העברית, כדי שעמודות
  // ושמות מפתחות באנגלית יישארו בדיוק במקום שבו הם היו.
  let out;
  if (base === "R") {
    out = reorder(tokens, "R");
  } else {
    out = "";
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].dir !== "R") { out += tokens[i].text; continue; }
      let end = i;
      while (end < tokens.length && tokens[end].dir === "R") end++;
      out += reorder(tokens.slice(i, end), "R");
      i = end - 1;
    }
  }
  return lead + out + trail;
}

/** ממיר טקסט רב-שורתי. כל שורה נחשבת פסקה נפרדת. */
export function toVisualText(text) {
  return String(text).split("\n").map(toVisual).join("\n");
}

/**
 * האם להפוך? ברירת המחדל: כן ב-Windows כשמדפיסים לטרמינל אמיתי.
 * mintty (Git Bash) כן יודע bidi, ופלט שעובר לצינור או לקובץ חייב להישאר
 * לוגי כדי ש-grep ימשיך לעבוד. אפשר לכפות עם HYPESCRIPT_BIDI=visual|logical.
 */
export function shouldReorder(stream = process.stdout) {
  const forced = (process.env.HYPESCRIPT_BIDI || "").toLowerCase();
  if (forced === "visual") return true;
  if (forced === "logical" || forced === "off") return false;
  if (!stream.isTTY) return false;
  if (process.env.TERM_PROGRAM === "mintty" || process.env.TERM_PROGRAM === "Apple_Terminal") return false;
  return process.platform === "win32";
}

const enabled = shouldReorder();

/** console.log שמסדר עברית לפי הטרמינל. */
export function say(text = "") {
  console.log(enabled ? toVisualText(text) : String(text));
}

/** console.error שמסדר עברית לפי הטרמינל. */
export function warn(text = "") {
  console.error(enabled && process.stderr.isTTY ? toVisualText(text) : String(text));
}

/** לשורות prompt שנכתבות בלי ירידת שורה. */
export function visual(text) {
  return enabled ? toVisualText(text) : String(text);
}
