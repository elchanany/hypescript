import { describe, expect, it } from "vitest";
import { isParticleVariant, phoneticFold, tokenizeHebrew, tokenSimilarity } from "./hebrew";
import { alignTokens, findUniqueAnchors, summarizeAlignment } from "./globalAlign";

const toks = tokenizeHebrew;

function align(asrText: string, scriptText: string) {
  const asr = toks(asrText);
  const script = toks(scriptText);
  const pairs = alignTokens(asr, script);
  return { asr, script, pairs, report: summarizeAlignment(pairs, script.length) };
}

/** הטקסט שהותאם בפועל, לפי סדר ה-ASR. */
function matchedAsrText(asrText: string, scriptText: string): string {
  const { asr, pairs } = align(asrText, scriptText);
  return pairs.filter((p) => p.asrIndex != null && p.scriptIndex != null)
    .map((p) => asr[p.asrIndex!].raw).join(" ");
}

describe("נרמול עברי", () => {
  it("מקפל ניקוד, סופיות וגרשיים", () => {
    const [token] = toks("הַגְּמָרָא");
    expect(token.base).toBe("הגמרא");
    expect(token.stem).toBe("גמרא");
  });

  it("מזהה אות שימוש כווריאציה ולא כמילה אחרת", () => {
    expect(isParticleVariant("במקום", "ובמקום")).toBe(true);
    expect(isParticleVariant("מקום", "ובמקום")).toBe(true);
    expect(isParticleVariant("שלום", "חלום")).toBe(false);
  });

  it("קיפול פונטי מאחד בלבולי ASR אמיתיים", () => {
    // שתי הטעויות שהמשתמש דיווח עליהן בפועל
    expect(phoneticFold("תפארת")).toBe(phoneticFold("טיפרת"));
    expect(phoneticFold("כשר")).toBe(phoneticFold("קשר"));
  });

  it("אינו מאחד מילים שונות באמת", () => {
    const [a] = toks("שריפה");
    const [b] = toks("חורבן");
    expect(tokenSimilarity(a, b)).toBeLessThan(0.5);
  });
});

describe("יישור גלובלי", () => {
  it("מוצא את הסקריפט בתוך תמלול ארוך יותר", () => {
    const asr = "אה אז שלום וברכה השיעור הזה נמסר בכולל הקדיש והחסד אממ תודה";
    const script = "שלום וברכה השיעור הזה נמסר בכולל הקדיש והחסד";
    const { report } = align(asr, script);
    expect(report.missingScript).toEqual([]);
    expect(report.coverage).toBe(1);
    expect(matchedAsrText(asr, script)).toBe(script);
  });

  it("לא מאבד מילה כששגיאת תמלול משנה את הכתיב", () => {
    // "טיפרת" (ASR) מול "תפארת" (סקריפט) — הגישה הישנה הפילה את המילה
    const asr = "להצלחת הגברת טיפרת עטר בת נתלי";
    const script = "להצלחת הגברת תפארת עטר בת נתלי";
    const { report } = align(asr, script);
    expect(report.missingScript).toEqual([]);
    expect(matchedAsrText(asr, script)).toBe(asr);
  });

  it("לא מאבד מילה כשאות שימוש נבלעה", () => {
    const asr = "ובמקום אחר נאמר קשה סילוקו של אדם";
    const script = "במקום אחר נאמר קשה סילוקו של אדם";
    const { report } = align(asr, script);
    expect(report.missingScript).toEqual([]);
  });

  it("מדווח במפורש על מילת סקריפט שאינה בתמלול — ולא בולע אותה", () => {
    const asr = "קשה סילוקו של אדם";
    const script = "קשה סילוקו של אדם כשר";
    const { script: scriptTokens, report } = align(asr, script);
    expect(report.missingScript).toHaveLength(1);
    expect(scriptTokens[report.missingScript[0]].raw).toBe("כשר");
  });

  it("שומר על סדר מונוטוני גם עם חזרות בסקריפט", () => {
    const asr = "קשה סילוקו של אדם כשר כשריפת בית אלהינו ובמקום אחר קשה סילוקו של אדם כשר כחורבן בית אלהינו";
    const script = "קשה סילוקו של אדם כשר כשריפת בית אלהינו קשה סילוקו של אדם כשר כחורבן בית אלהינו";
    const { report, pairs } = align(asr, script);
    expect(report.missingScript).toEqual([]);
    const matchedAsr = pairs.filter((p) => p.asrIndex != null && p.scriptIndex != null).map((p) => p.asrIndex!);
    const matchedScript = pairs.filter((p) => p.asrIndex != null && p.scriptIndex != null).map((p) => p.scriptIndex!);
    for (let i = 1; i < matchedAsr.length; i++) {
      expect(matchedAsr[i]).toBeGreaterThan(matchedAsr[i - 1]);
      expect(matchedScript[i]).toBeGreaterThan(matchedScript[i - 1]);
    }
  });

  it("מכסה כל טוקן בדיוק פעם אחת", () => {
    const asr = "אחת שתיים שלוש ארבע חמש שש שבע";
    const script = "שתיים שלוש חמש שבע";
    const { asr: asrTokens, script: scriptTokens, pairs } = align(asr, script);
    const asrSeen = pairs.filter((p) => p.asrIndex != null).map((p) => p.asrIndex!);
    const scriptSeen = pairs.filter((p) => p.scriptIndex != null).map((p) => p.scriptIndex!);
    expect(new Set(asrSeen).size).toBe(asrTokens.length);
    expect(new Set(scriptSeen).size).toBe(scriptTokens.length);
  });

  it("מוחק זבל ASR שאינו בסקריפט במקום לשמור אותו", () => {
    const asr = "שלום אה אממ וברכה";
    const script = "שלום וברכה";
    const { asr: asrTokens, report } = align(asr, script);
    expect(report.droppedAsr.map((i) => asrTokens[i].raw)).toEqual(["אה", "אממ"]);
  });

  it("מדלג על קטע ארוך שנמחק בלי לשבור את ההמשך", () => {
    const filler = Array.from({ length: 120 }, (_, i) => `מילה${i}`).join(" ");
    const asr = `פתיחה ראשונה ${filler} סיום אחרון`;
    const script = "פתיחה ראשונה סיום אחרון";
    const { report } = align(asr, script);
    expect(report.missingScript).toEqual([]);
    expect(report.droppedAsr).toHaveLength(120);
  });
});

describe("עוגני ייחוד", () => {
  it("מחזיר שרשרת מונוטונית בלבד", () => {
    const asr = toks("אלפא ביתא גמא דלתא");
    const script = toks("אלפא גמא ביתא דלתא");
    const anchors = findUniqueAnchors(asr, script, 3);
    for (let i = 1; i < anchors.length; i++) {
      expect(anchors[i].asrIndex).toBeGreaterThan(anchors[i - 1].asrIndex);
      expect(anchors[i].scriptIndex).toBeGreaterThan(anchors[i - 1].scriptIndex);
    }
  });

  it("מסלול העוגנים מגיע לאותה תוצאה כמו המטריצה המלאה", () => {
    const words = Array.from({ length: 400 }, (_, i) => `מילהX${i}`);
    const asrText = words.join(" ");
    const scriptText = words.filter((_, i) => i % 3 !== 0).join(" ");
    const asr = toks(asrText);
    const script = toks(scriptText);
    const full = summarizeAlignment(alignTokens(asr, script), script.length);
    const anchored = summarizeAlignment(alignTokens(asr, script, { fullMatrixBudget: 500 }), script.length);
    expect(anchored.matchedScript).toEqual(full.matchedScript);
    expect(anchored.missingScript).toEqual([]);
  });
});
