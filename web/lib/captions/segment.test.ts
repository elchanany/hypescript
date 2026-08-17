import { describe, expect, it } from "vitest";
import { CAPTION_POLICY, auditCaptions, breakScore, buildCaptionCues, type CaptionToken } from "./segment";
import { captionTokensFromScript } from "./fromScript";

/** בונה טוקנים בקצב דיבור אחיד (0.34s למילה, 0.06s רווח). */
function speak(text: string, from = 0, wordSec = 0.34, gapSec = 0.06): CaptionToken[] {
  let t = from;
  return text.split(/\s+/).filter(Boolean).map((word) => {
    const token = { text: word, start: t, end: t + wordSec };
    t += wordSec + gapSec;
    return token;
  });
}

const LESSON = "שלום וברכה השיעור הזה נמסר בכולל הקדיש והחסד. הנצחת השיעור היום תהיה לעילוי נשמת משה בן רחל.";

describe("נקודות שבירה", () => {
  it("סוף משפט הוא נקודת השבירה הטובה ביותר", () => {
    const tokens = speak("נמסר בכולל הקדיש והחסד. הנצחת השיעור");
    expect(breakScore(tokens, 3)).toBe(100);
  });

  it("לא שוברת בין ראש סמיכות לסומך", () => {
    const tokens = speak("כשריפת בית אלהינו נשאלת השאלה");
    // אחרי "בית" — שבירה גרועה
    expect(breakScore(tokens, 1)).toBeLessThan(breakScore(tokens, 2));
  });

  it("לא שוברת אחרי תואר כבוד", () => {
    const tokens = speak("אמר רבי יוחנן משום רבי שמעון");
    expect(breakScore(tokens, 1)).toBeLessThan(20);
  });

  it("מעדיפה לשבור לפני מילת קישור", () => {
    const tokens = speak("אפשר עוד לשחזר אבל הכל מתכלה");
    expect(breakScore(tokens, 2)).toBeGreaterThan(breakScore(tokens, 3));
  });

  it("פאוזה ארוכה היא נקודת שבירה", () => {
    const tokens: CaptionToken[] = [
      { text: "ראשון", start: 0, end: 0.4 },
      { text: "שני", start: 1.4, end: 1.8 },
    ];
    expect(breakScore(tokens, 0)).toBeGreaterThanOrEqual(70);
  });
});

describe("חלוקת כתוביות", () => {
  const cues = buildCaptionCues(speak(LESSON));

  it("אף מילה אינה חוזרת בין כתוביות עוקבות", () => {
    const audit = auditCaptions(cues);
    expect(audit.repeatedWordPairs).toBe(0);
  });

  it("כל מילה מופיעה בדיוק פעם אחת", () => {
    const all = cues.flatMap((cue) => cue.lines.join(" ").split(/\s+/));
    expect(all).toEqual(LESSON.split(/\s+/));
  });

  it("שומרת על ארבע-שש מילים בפעימה", () => {
    const counts = cues.map((cue) => cue.tokenTo - cue.tokenFrom);
    const average = counts.reduce((sum, n) => sum + n, 0) / counts.length;
    expect(average).toBeGreaterThanOrEqual(3.5);
    expect(average).toBeLessThanOrEqual(6.5);
    expect(Math.max(...counts)).toBeLessThanOrEqual(CAPTION_POLICY.maxWords);
  });

  it("אינה חופפת בזמן ואינה מבזיקה", () => {
    const audit = auditCaptions(cues);
    expect(audit.overlaps).toEqual([]);
    expect(audit.tooFast).toEqual([]);
    expect(audit.pass).toBe(true);
  });

  it("שוברת בסוף משפט", () => {
    const endsWithPeriod = cues.filter((cue) => cue.lines.join(" ").trimEnd().endsWith("."));
    expect(endsWithPeriod.length).toBeGreaterThan(0);
    const afterPeriod = cues.findIndex((cue) => cue.lines.join(" ").includes("והחסד."));
    expect(cues[afterPeriod].lines.join(" ").trimEnd().endsWith("והחסד.")).toBe(true);
  });

  it("מגבילה לשתי שורות ולאורך שורה סביר", () => {
    for (const cue of cues) {
      expect(cue.lines.length).toBeLessThanOrEqual(CAPTION_POLICY.maxLines);
      for (const line of cue.lines) expect(line.length).toBeLessThanOrEqual(CAPTION_POLICY.maxCharsPerLine * 1.2);
    }
  });

  it("מסמנת כיווניות RTL בכל שורה", () => {
    for (const cue of cues) {
      for (const line of cue.text.split("\n")) expect(line.startsWith("‏")).toBe(true);
    }
  });

  it("תופסת חשיפה מצטברת כפגם", () => {
    const progressive = [
      { start: 0, end: 0.5, lines: ["שלום"], text: "שלום", tokenFrom: 0, tokenTo: 1 },
      { start: 0.5, end: 1.0, lines: ["שלום וברכה"], text: "שלום וברכה", tokenFrom: 0, tokenTo: 2 },
      { start: 1.0, end: 1.6, lines: ["שלום וברכה השיעור"], text: "שלום וברכה השיעור", tokenFrom: 0, tokenTo: 3 },
    ];
    const audit = auditCaptions(progressive);
    expect(audit.repeatedWordPairs).toBe(2);
    expect(audit.pass).toBe(false);
  });
});

/** הטקסט האמיתי מהשיעור — המקרה שבו הכתוביות יצאו פגומות. */
const SHIUR = "נשאלת השאלה. לכאורה למה פעם שריפה ופעם חורבן? אז כתוב שאם אדם השאיר אחריו דור. "
  + "אז זה רק חורבן. אפשר עוד לשחזר. אפשר להציל. אפשר לעזור. מה שאין כן כשזה שריפה. הכל מתכלה והכל נגמר.";

/** אינדקסי הטוקנים שסוגרים משפט. */
function sentenceEnds(tokens: CaptionToken[]): Set<number> {
  const ends = new Set<number>();
  tokens.forEach((token, index) => {
    if (/[.!?…]["'”’)\]]*$/.test(token.text.trimEnd())) ends.add(index);
  });
  return ends;
}

describe("גבול משפט הוא גבול כתובית", () => {
  const tokens = speak(SHIUR);
  const ends = sentenceEnds(tokens);

  for (const maxLines of [1, 2] as const) {
    it(`אף כתובית אינה חוצה סוף משפט (max_lines=${maxLines})`, () => {
      const cues = buildCaptionCues(tokens, {
        policy: { maxLines, maxCharsPerLine: maxLines === 1 ? 48 : 24 },
      });
      for (const cue of cues) {
        // סוף משפט מותר רק בטוקן האחרון של הכתובית
        for (let i = cue.tokenFrom; i < cue.tokenTo - 1; i++) {
          expect(ends.has(i)).toBe(false);
        }
      }
    });
  }

  it("משפט קצר עומד בפני עצמו ולא נגרר למשפט הבא", () => {
    const cues = buildCaptionCues(tokens, { policy: { maxLines: 1, maxCharsPerLine: 48 } });
    const opening = cues.find((cue) => cue.lines.join(" ").includes("נשאלת"));
    expect(opening?.lines.join(" ").trim()).toBe("נשאלת השאלה.");
  });

  it("לא גוררת מילה בודדת מהמשפט הבא", () => {
    const cues = buildCaptionCues(tokens, { policy: { maxLines: 1, maxCharsPerLine: 48 } });
    const carried = cues.find((cue) => cue.lines.join(" ").trimEnd().endsWith("מה"));
    expect(carried).toBeUndefined();
  });
});

describe("איות מהסקריפט", () => {
  it("מחליף שיבוש ASR בכתיב של המשתמש בלי לאבד תזמון", () => {
    const asr = speak("להצלחת הגברת טיפרת עטר בת נתלי");
    const result = captionTokensFromScript(asr, "להצלחת הגברת תפארת עטר בת נתלי");
    expect(result.tokens.map((t) => t.text)).toEqual(
      ["להצלחת", "הגברת", "תפארת", "עטר", "בת", "נתלי"],
    );
    expect(result.tokens[2].start).toBeCloseTo(asr[2].start, 5);
    expect(result.interpolated).toEqual([]);
  });

  it("זורק זבל ASR שאינו בסקריפט", () => {
    const asr = speak("שלום אה אממ וברכה");
    const result = captionTokensFromScript(asr, "שלום וברכה");
    expect(result.tokens.map((t) => t.text)).toEqual(["שלום", "וברכה"]);
    expect(result.dropped).toBe(2);
  });

  it("מתזמן מילת סקריפט חסרה במקום להשמיט אותה", () => {
    const asr = speak("קשה סילוקו של אדם");
    const result = captionTokensFromScript(asr, "קשה סילוקו של אדם כשר");
    expect(result.tokens.map((t) => t.text)).toEqual(["קשה", "סילוקו", "של", "אדם", "כשר"]);
    expect(result.interpolated).toEqual([4]);
  });

  it("שומר על סדר זמנים עולה", () => {
    const asr = speak("אחת שתיים שלוש ארבע חמש");
    const result = captionTokensFromScript(asr, "אחת שתיים חדשה שלוש ארבע חמש");
    for (let i = 1; i < result.tokens.length; i++) {
      expect(result.tokens[i].start).toBeGreaterThanOrEqual(result.tokens[i - 1].start);
      expect(result.tokens[i].end).toBeGreaterThan(result.tokens[i].start);
    }
  });

  it("הכתוביות שנבנות מהסקריפט עוברות בקרת איכות", () => {
    const asr = speak("קשה סילוקו של אדם קשר כשריפת בית אלהינו ובמקום אחר נאמר קשה סילוקו של אדם קשר כחורבן בית אלהינו");
    const script = "קשה סילוקו של אדם כשר כשריפת בית אלהינו. ובמקום אחר נאמר קשה סילוקו של אדם כשר כחורבן בית אלהינו.";
    const { tokens } = captionTokensFromScript(asr, script);
    const audit = auditCaptions(buildCaptionCues(tokens));
    expect(audit.repeatedWordPairs).toBe(0);
    expect(audit.overlaps).toEqual([]);
  });
});
