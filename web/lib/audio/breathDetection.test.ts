// רגרסיה: נשימה רמה סווגה "silence" כי כיול הרעש נדגם מהנשימה עצמה.
//
// הבאג: calibrateFromTranscript דגם את אוכלוסיית "רעש הרקע" מאמצע הפערים
// שבין מילים — בדיוק המקום שבו יושבת נשימה. ככל שהנשימה רמה יותר, כך
// noiseDb.p90 טיפס אחריה, סף השקט טיפס יחד איתו, ונשימה של 0.30 שנ' נצבעה
// "silence" — תווית שאינה ב-NOISE_LABELS (scriptPlan.ts) ולכן שרדה כל עוד
// הפער קצר מ-pacing.maxInternalPauseSec (0.42 שנ' ב-natural). הפוך ומוזר:
// ככל שהמשתמש רצה יותר להסיר את הנשימה (כי היא נשמעת חזק) — כך המערכת
// הייתה בטוחה יותר שזו רק רעש רקע.
//
// התיקון: roomFloorDb נגזר מהנמוך שבין חציון-הפערים לבין האחוזון ה-12
// המתגלגל של המעטפת (envelope.floor, חלון 3 שניות). חלון כזה שורד נשימה —
// גם כשחצי שנייה ממנו היא נשיפה רמה, האחוזון ה-12 עדיין נופל על השקט
// שסביבה. noiseDb.p90 לעומת זאת נדגם *מתוך* הנשימה ולכן מזוהם בהגדרה.
// speechThresholdDb/speechMarginDb/separationDb כולם עוגנו ל-roomFloorDb,
// ו-nonSpeech.ts גוזר ממנו את מרווח השקט (silenceMargin), כך שנשימה שיושבת
// 20dB+ מעל הרצפה כבר לא נבלעת כ"שקט".
//
// כל האות כאן מסונתז בתהליך בלבד (LCG דטרמיניסטי, בלי Math.random, בלי
// ffmpeg/קבצים/רשת) ומריץ את הצינור האמיתי: features → calibration →
// nonSpeech → scriptPlan. המספרים באסטרטגיה ד' למטה נמדדו בפועל (ראה שם).

import { describe, expect, it } from "vitest";

import { computeEnvelope, computeSpectral } from "./features";
import { calibrateFromTranscript } from "./calibration";
import { classifyGap } from "./nonSpeech";
import { planSilenceTighten } from "@/lib/cut/scriptPlan";
import type { Word } from "@/lib/models";

const SR = 16000;
const WORD_COUNT = 16;
const WORD_DURATION_SEC = 0.45;
const GAP_DURATION_SEC = 0.30;
/** משך כל 16 המילים המתוכננות בפועל — שום קליפ שמור לא יכול להכיל פחות מזה. */
const TOTAL_WORDS_SEC = WORD_COUNT * WORD_DURATION_SEC;

/**
 * "שיעור" מסונתז: 16 מילים בנות 0.45 שנ' כל אחת, מופרדות בפערים של 0.30 שנ'.
 * כל מילה היא תערובת הרמוניות בפורמנטים גסים של קול אנושי. בכל פער (או בכל
 * פער שני, לפי breathInEveryGap) מוטמנת "נשימה": רעש-לבן שעבר high-pass
 * (הפרש בין דגימות עוקבות) עם מעטפת sin^1.4, מוזחת 0.06 שנ' פנימה מקצות
 * הפער — כדי לא לגעת בהתקפה/דעיכה של המילה עצמה, בדיוק כמו GAP_INSET_SEC
 * בקוד האמיתי. LCG דטרמיניסטי (seed קבוע) — אותה תוצאה בכל הרצה.
 */
function synth(breathGain: number, breathInEveryGap: boolean) {
  const words: Word[] = [];
  const gaps: Array<[number, number]> = [];
  let t = 0.3;
  for (let i = 0; i < WORD_COUNT; i++) {
    words.push({ text: `w${i}`, start: t, end: t + WORD_DURATION_SEC });
    t += WORD_DURATION_SEC;
    gaps.push([t, t + GAP_DURATION_SEC]);
    t += GAP_DURATION_SEC;
  }
  const durationSec = t + 0.3;
  const n = Math.round(durationSec * SR);
  const samples = new Float32Array(n);

  let seed = 12345;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed / 0x7fffffff) * 2 - 1;
  };
  for (let i = 0; i < n; i++) samples[i] = rnd() * 0.0008; // רצפת רעש ≈ -62dBFS

  for (const w of words) {
    const from = Math.round(w.start * SR);
    const to = Math.round(w.end * SR);
    for (let i = from; i < to; i++) {
      const tt = i / SR;
      const local = (i - from) / (to - from);
      const env = Math.sin(Math.PI * local) ** 0.5;
      let v = 0;
      for (let h = 1; h <= 30; h++) {
        const f = 115 * h;
        if (f > 7000) break;
        const g = (1 / h)
          * (1 + 1.6 * Math.exp(-(((f - 500) / 220) ** 2)))
          * (1 + 1.1 * Math.exp(-(((f - 1500) / 300) ** 2)))
          * (1 + 0.7 * Math.exp(-(((f - 2500) / 380) ** 2)));
        v += g * Math.sin(2 * Math.PI * f * tt);
      }
      samples[i] += 0.055 * v * env * (0.85 + 0.15 * Math.sin(2 * Math.PI * 4 * tt));
    }
  }

  // הפער האחרון (אחרי המילה ה-16) הוא זנב-שקט לפני סוף הקובץ — לא פנימי,
  // ואינו יכול ליצור פיצול קליפ נוסף (אין "מילה הבאה" לחתוך ממנה).
  const trailingGap = gaps[gaps.length - 1];
  const breathGaps: Array<[number, number]> = [];
  gaps.forEach((gap, idx) => {
    if (!breathInEveryGap && idx % 2 !== 0) return;
    breathGaps.push(gap);
    const from = Math.round((gap[0] + 0.06) * SR);
    const to = Math.round((gap[1] - 0.06) * SR);
    let prev = 0;
    for (let i = from; i < to; i++) {
      const local = (i - from) / (to - from);
      const env = Math.sin(Math.PI * local) ** 1.4;
      const white = rnd();
      const hp = white - prev;
      prev = white;
      samples[i] += breathGain * hp * env;
    }
  });

  const internalBreathGaps = breathGaps.filter((g) => g !== trailingGap);
  return { samples, words, gaps, breathGaps, internalBreathGaps, durationSec };
}

/** עוצמות נשימה ריאליסטיות שבהן המסווג באמת מזהה "breath" (נמדד ומאומת למטה). */
const REALISTIC_GAINS = [0.002, 0.005, 0.010, 0.020] as const;

for (const breathInEveryGap of [true, false] as const) {
  const layoutName = breathInEveryGap ? "נשימה בכל פער בין מילים" : "נשימה בכל פער שני (חצי מהפערים)";

  describe(layoutName, () => {
    for (const breathGain of REALISTIC_GAINS) {
      const { samples, words, breathGaps, internalBreathGaps, durationSec } = synth(breathGain, breathInEveryGap);
      const envelope = computeEnvelope(samples, SR);
      const calibration = calibrateFromTranscript(envelope, words, samples, SR);
      const plan = planSilenceTighten(words, {
        sourceId: "s", duration: durationSec, pacing: "natural", envelope, samples, sampleRate: SR,
      });
      const expectedClips = internalBreathGaps.length + 1;

      it(`עוצמת נשימה ${breathGain}: הפער מסווג "breath", לא "silence"`, () => {
        // זה בדיוק הבאג: לפני התיקון נשימה רמה יחסית לרעש שנדגם ממנה עצמה
        // נצבעה "silence" ולכן לא הוסרה (0.30s < maxInternalPauseSec=0.42s).
        const [gapStart, gapEnd] = breathGaps[3];
        const inset = Math.min(0.09, (gapEnd - gapStart) * 0.25);
        const event = classifyGap(
          envelope,
          gapStart + inset,
          gapEnd - inset,
          computeSpectral(samples, SR, gapStart + inset, gapEnd - inset),
          { calibration },
        );
        expect(
          event.label,
          `gain=${breathGain} label=${event.label} confidence=${event.confidence.toFixed(2)}`,
        ).toBe("breath");
      });

      it(`עוצמת נשימה ${breathGain}: מספר הקליפים שווה למספר הנשימות הפנימיות + 1`, () => {
        // כל נשימה פנימית שהוסרה בהצלחה מפצלת רצף אחד לשניים. אם הנשימה
        // הייתה מסווגת "silence" (הבאג המקורי) הפער קצר מדי כדי להיחתך
        // לבד, ו-16 המילים היו נשארות קליפ אחד — הבדיקה הזו נופלת מיד
        // כשמחזירים את הבאג.
        expect(
          plan.clips.length,
          `ציפינו ל-${expectedClips} קליפים (${internalBreathGaps.length} נשימות פנימיות שתוכננו), התקבלו ${plan.clips.length}`,
        ).toBe(expectedClips);
      });

      it(`עוצמת נשימה ${breathGain}: אף מילה אינה נחתכת ואף אחת לא מקוצצת`, () => {
        expect(
          plan.keptSec,
          `נשמרו ${plan.keptSec.toFixed(2)}s, פחות מ-${TOTAL_WORDS_SEC}s שהן 16 המילים המתוכננות בלבד`,
        ).toBeGreaterThan(TOTAL_WORDS_SEC);
        for (const word of plan.keptWords) {
          const owner = plan.clips.find((c) => word.start >= c.start - 1e-6 && word.end <= c.end + 1e-6);
          expect(owner, `"${word.text}" (${word.start.toFixed(2)}–${word.end.toFixed(2)}) נחתכת`).toBeTruthy();
        }
      });
    }
  });
}

describe("roomFloorDb חסין לנשימה — בניגוד ל-noiseDb.p90 שמזוהם ממנה בכוונה", () => {
  // נמדד בפועל (נשימה בכל פער — המקרה הגרוע ביותר לזיהום): מנשימה שקטה
  // (gain=0.002) לנשימה רמה (gain=0.020):
  //   roomFloorDb:  -66.5dB -> -66.1dB   (הפרש ≈0.4dB)
  //   noiseDb.p90:  -55.7dB -> -36.2dB   (הפרש ≈19.5dB, פי ~49 מהראשון)
  // זה בדיוק ההפך ממה שקרה לפני התיקון: אז speechThresholdDb נגזר מ-
  // noiseDb.p90 וטיפס עם הנשימה; roomFloorDb קיים כדי שהוא *לא* יטפס.
  const quiet = synth(0.002, true);
  const loud = synth(0.020, true);
  const quietCal = calibrateFromTranscript(computeEnvelope(quiet.samples, SR), quiet.words, quiet.samples, SR);
  const loudCal = calibrateFromTranscript(computeEnvelope(loud.samples, SR), loud.words, loud.samples, SR);

  it("שני הכיולים אמינים (יש מספיק הפרדה כדי לא ליפול ל-fallback)", () => {
    expect(quietCal.reliable, "כיול נשימה שקטה").toBe(true);
    expect(loudCal.reliable, "כיול נשימה רמה").toBe(true);
  });

  it("roomFloorDb כמעט אינו זז בין נשימה שקטה לרועשת", () => {
    const delta = Math.abs(loudCal.roomFloorDb - quietCal.roomFloorDb);
    expect(
      delta,
      `roomFloorDb: ${quietCal.roomFloorDb.toFixed(1)}dB (שקטה) -> ${loudCal.roomFloorDb.toFixed(1)}dB (רועשת)`,
    ).toBeLessThan(3);
  });

  it("noiseDb.p90 כן טס עשרות dB — זו בדיוק ההוכחה שהאוכלוסייה הזו מזוהמת", () => {
    const delta = loudCal.noiseDb.p90 - quietCal.noiseDb.p90;
    expect(
      delta,
      `noiseDb.p90: ${quietCal.noiseDb.p90.toFixed(1)}dB (שקטה) -> ${loudCal.noiseDb.p90.toFixed(1)}dB (רועשת)`,
    ).toBeGreaterThan(10);
  });

  it("roomFloorDb זז פחות פי כמה מ-noiseDb.p90 לאותו שינוי בעוצמת הנשימה", () => {
    const roomDelta = Math.abs(loudCal.roomFloorDb - quietCal.roomFloorDb);
    const noiseDelta = loudCal.noiseDb.p90 - quietCal.noiseDb.p90;
    expect(
      noiseDelta,
      `roomFloorDb זז ${roomDelta.toFixed(1)}dB, noiseDb.p90 זז ${noiseDelta.toFixed(1)}dB`,
    ).toBeGreaterThan(roomDelta * 5);
  });
});
