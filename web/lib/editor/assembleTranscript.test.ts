// מיפוי תמלול לציר הערוך.
//
// הרגרסיה שנצרבה כאן: מילה שנאמרה על גבול חיתוך נעלמה מהציר. השיוך היה לפי
// אמצע המילה, ונקודת החיתוך מוקמה לפי מדידה אקוסטית — כך שאמצע המילה נפל
// בתוך הפער שהוסר, המילה לא שויכה לאף קליפ, ונמחקה בשקט. הסוכן אז רדף אחרי
// "מילה חסרה" שהייתה קיימת באודיו כל הזמן.

import { describe, expect, it } from "vitest";
import { assembleTranscript } from "./assembleTranscript";
import type { Clip } from "./model";
import type { Word } from "@/lib/models";

const clip = (id: string, start: number, end: number): Clip =>
  ({ id, sourceId: "src", start, end }) as Clip;

const word = (text: string, start: number, end: number): Word =>
  ({ text, start, end, type: "word" }) as Word;

const texts = (words: Word[]) => words.map((w) => w.text);

describe("מיפוי תמלול לציר הערוך", () => {
  it("שומר מילה שאמצעה נפל בפער שהוסר", () => {
    // הפער בין הקליפים הוא 46.873–47.308. המילה 46.80–47.40 מרכזה ב-47.10,
    // כלומר בתוך הפער — אבל היא נשמעת בשני הקליפים ואסור שתיעלם.
    const clips = [clip("a", 41.437, 46.873), clip("b", 47.308, 55.086)];
    const words = [
      word("לעזור", 45.0, 45.6),
      word("מה", 46.8, 47.4),
      word("שאין", 47.5, 47.9),
    ];
    const out = assembleTranscript(clips, () => words);
    expect(texts(out)).toEqual(["לעזור", "מה", "שאין"]);
  });

  it("אינו מכפיל מילה בין שני קליפים סמוכים", () => {
    const clips = [clip("a", 0, 5), clip("b", 5, 10)];
    const words = [word("גבול", 4.8, 5.2)];
    const out = assembleTranscript(clips, () => words);
    expect(out).toHaveLength(1);
  });

  it("משאיר מילה כפולה כשהקטע עצמו שוכפל", () => {
    const clips = [clip("a", 0, 3), clip("b", 0, 3)];
    const words = [word("חוזר", 1.0, 1.5)];
    const out = assembleTranscript(clips, () => words);
    expect(texts(out)).toEqual(["חוזר", "חוזר"]);
  });

  it("מסיר מילה שנאמרה כולה בתוך קטע שנחתך", () => {
    const clips = [clip("a", 0, 5), clip("b", 20, 25)];
    const words = [word("נשאר", 1, 1.5), word("הוסר", 10, 10.5), word("נשאר2", 21, 21.5)];
    const out = assembleTranscript(clips, () => words);
    expect(texts(out)).toEqual(["נשאר", "נשאר2"]);
  });

  it("מחזיר זמנים עולים על הציר", () => {
    const clips = [clip("a", 10, 12), clip("b", 0, 2)];
    const words = [word("ראשון", 0.2, 0.8), word("שני", 10.2, 10.8)];
    const out = assembleTranscript(clips, () => words);
    expect(texts(out)).toEqual(["שני", "ראשון"]);
    for (let i = 1; i < out.length; i++) {
      expect(out[i].start).toBeGreaterThanOrEqual(out[i - 1].start);
    }
  });

  it("אינו מייצר מילה באורך אפס", () => {
    const clips = [clip("a", 0, 5), clip("b", 5.4, 10)];
    const words = [word("קצה", 5.3, 5.45)];
    const out = assembleTranscript(clips, () => words);
    for (const w of out) expect(w.end).toBeGreaterThan(w.start);
  });
});
