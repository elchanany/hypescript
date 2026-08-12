// המבחן שקובע אם המוצר עובד אצל אנשים אחרים.
//
// אותו תוכן בדיוק מוקלט בארבעה תנאים שונים לחלוטין — אולפן, מיקרופון מצלמה
// באולם, טלפון עם המהום מזגן, והקלטה חלשה מאוד. אם החיתוך יוצא זהה בכולם,
// האלגוריתם לא מכויל לקובץ אחד אלא מודד כל קובץ בנפרד.

import { describe, expect, it } from "vitest";
import type { Word } from "@/lib/models";
import { computeEnvelope, dbAt } from "./features";
import { calibrateFromTranscript, percentileRank } from "./calibration";
import { planScriptCut } from "@/lib/cut/scriptPlan";

const SR = 16000;

function noiseSource(seed = 4242) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return (state / 0xffffffff) * 2 - 1;
  };
}

interface Condition {
  name: string;
  /** משרעת הדיבור — מרחק מהמיקרופון / gain. */
  speechGain: number;
  /** משרעת רעש הרקע — חדר שקט מול אולם רועש. */
  noiseGain: number;
  /** הד — זנב דועך אחרי כל מילה. */
  reverb: number;
  /** המהום מזגן/רשת ב-50Hz. */
  humGain: number;
}

const CONDITIONS: Condition[] = [
  { name: "אולפן", speechGain: 0.30, noiseGain: 0.0004, reverb: 0, humGain: 0 },
  { name: "מיקרופון מצלמה באולם", speechGain: 0.055, noiseGain: 0.006, reverb: 0.25, humGain: 0 },
  { name: "טלפון עם מזגן", speechGain: 0.11, noiseGain: 0.0025, reverb: 0.1, humGain: 0.004 },
  { name: "הקלטה חלשה", speechGain: 0.022, noiseGain: 0.0011, reverb: 0.05, humGain: 0.0008 },
];

/** חלונות הדיבור — זהים בכל התנאים; רק תנאי ההקלטה משתנים. */
const SPEECH_SPANS: Array<[number, number]> = [
  [0.50, 1.90],
  [2.60, 4.00],
  [4.80, 6.20],
];
const DURATION = 7;

const WORDS: Word[] = [
  { text: "שלום", start: 0.53, end: 0.96 }, { text: "וברכה", start: 1.01, end: 1.45 },
  { text: "השיעור", start: 1.50, end: 1.87 },
  { text: "נמסר", start: 2.63, end: 3.06 }, { text: "בכולל", start: 3.11, end: 3.55 },
  { text: "הקדיש", start: 3.59, end: 3.97 },
  { text: "ההנצחה", start: 4.83, end: 5.30 }, { text: "היום", start: 5.35, end: 5.70 },
  { text: "תהיה", start: 5.75, end: 6.17 },
];

function record(condition: Condition): Float32Array {
  const rand = noiseSource();
  const samples = new Float32Array(Math.round(DURATION * SR));
  for (let i = 0; i < samples.length; i++) {
    const t = i / SR;
    samples[i] = rand() * condition.noiseGain
      + (condition.humGain ? condition.humGain * Math.sin(2 * Math.PI * 50 * t) : 0);
  }
  for (const [from, to] of SPEECH_SPANS) {
    const start = Math.round(from * SR);
    const stop = Math.round(to * SR);
    for (let i = start; i < stop; i++) {
      const t = (i - start) / SR;
      const envelope = 0.72 + 0.28 * Math.sin(2 * Math.PI * 4 * t);
      samples[i] += condition.speechGain * envelope * (
        Math.sin(2 * Math.PI * 130 * t)
        + 0.6 * Math.sin(2 * Math.PI * 260 * t)
        + 0.35 * Math.sin(2 * Math.PI * 520 * t)
        + 0.15 * Math.sin(2 * Math.PI * 1040 * t)
      ) / 2.1;
    }
    // זנב הד אחרי סוף הדיבור
    if (condition.reverb > 0) {
      const tail = Math.round(0.22 * SR);
      for (let k = 0; k < tail && stop + k < samples.length; k++) {
        samples[stop + k] += samples[stop - tail + k] * condition.reverb * Math.exp(-k / (0.07 * SR));
      }
    }
  }
  return samples;
}

const SCRIPT = "שלום וברכה השיעור ההנצחה היום תהיה";

function analyze(condition: Condition) {
  const samples = record(condition);
  const envelope = computeEnvelope(samples, SR);
  const calibration = calibrateFromTranscript(envelope, WORDS, samples, SR);
  const plan = planScriptCut(WORDS, SCRIPT, {
    sourceId: "src", duration: DURATION, pacing: "natural",
    envelope, samples, sampleRate: SR,
  });
  return { samples, envelope, calibration, plan };
}

describe("כיול עצמי לכל הקלטה", () => {
  const analyzed = CONDITIONS.map((condition) => ({ condition, ...analyze(condition) }));

  it("מזהה את סף הדיבור בכל תנאי הקלטה, בלי סף קבוע", () => {
    for (const { condition, calibration } of analyzed) {
      expect(calibration.reliable, `${condition.name}: הכיול נכשל`).toBe(true);
      expect(calibration.separationDb, `${condition.name}: הפרדה`).toBeGreaterThan(6);
    }
  });

  it("הסף שנגזר באמת שונה בין ההקלטות — כלומר הוא נמדד ולא הונח", () => {
    const thresholds = analyzed.map((a) => a.calibration.speechThresholdDb);
    expect(Math.max(...thresholds) - Math.min(...thresholds)).toBeGreaterThan(10);
  });

  it("הסף תמיד יושב בין רעש הרקע לדיבור של אותה הקלטה", () => {
    for (const { condition, calibration } of analyzed) {
      expect(calibration.speechThresholdDb, `${condition.name}: מתחת לרעש`)
        .toBeGreaterThan(calibration.noiseDb.p90);
      expect(calibration.speechThresholdDb, `${condition.name}: מעל הדיבור`)
        .toBeLessThan(calibration.speechDb.p50);
    }
  });

  it("מפיק את אותו חיתוך בדיוק בכל ארבעת התנאים", () => {
    const shapes = analyzed.map((a) => a.plan.clips.length);
    expect(new Set(shapes).size, `מספר קליפים שונה: ${shapes.join(",")}`).toBe(1);
    for (const { condition, plan } of analyzed) {
      expect(plan.missingScript, `${condition.name}: מילים חסרות`).toEqual([]);
      expect(plan.keptWords.map((w) => w.text)).toEqual(SCRIPT.split(" "));
      expect(plan.removedSpeech.map((r) => r.text)).toEqual(["נמסר", "בכולל", "הקדיש"]);
    }
  });

  it("נקודות החיתוך נופלות בשקט בכל התנאים", () => {
    for (const { condition, plan, envelope, calibration } of analyzed) {
      for (const clip of plan.clips) {
        expect(dbAt(envelope, clip.start), `${condition.name}: כניסה רועשת`)
          .toBeLessThan(calibration.speechThresholdDb + 3);
        expect(dbAt(envelope, clip.end), `${condition.name}: יציאה רועשת`)
          .toBeLessThan(calibration.speechThresholdDb + 3);
      }
    }
  });

  it("אף מילה אינה נחתכת, בשום תנאי הקלטה", () => {
    for (const { condition, plan } of analyzed) {
      for (const word of plan.keptWords) {
        const owner = plan.clips.find((c) => word.start >= c.start - 1e-6 && word.end <= c.end + 1e-6);
        expect(owner, `${condition.name}: "${word.text}" נחתכת`).toBeTruthy();
      }
    }
  });

  it("זמני החיתוך דומים בין התנאים — ההבדל האקוסטי לא מזיז את העריכה", () => {
    const starts = analyzed.map((a) => a.plan.clips.map((c) => c.start));
    const ends = analyzed.map((a) => a.plan.clips.map((c) => c.end));
    for (let clip = 0; clip < starts[0].length; clip++) {
      const s = starts.map((row) => row[clip]);
      const e = ends.map((row) => row[clip]);
      expect(Math.max(...s) - Math.min(...s), `קליפ ${clip + 1} התחלה`).toBeLessThan(0.25);
      expect(Math.max(...e) - Math.min(...e), `קליפ ${clip + 1} סוף`).toBeLessThan(0.25);
    }
  });
});

describe("כשל בטוח כשאין על מה לכייל", () => {
  const samples = record(CONDITIONS[0]);
  const envelope = computeEnvelope(samples, SR);

  it("בלי תמלול מספיק — לא אמין, ומדווח למה", () => {
    const calibration = calibrateFromTranscript(envelope, WORDS.slice(0, 2), samples, SR);
    expect(calibration.reliable).toBe(false);
    expect(calibration.notes[0]).toContain("כיול");
  });

  it("הקלטה שבה הדיבור טובע ברעש מסומנת כלא אמינה", () => {
    const drowned = record({ name: "רעש", speechGain: 0.01, noiseGain: 0.03, reverb: 0, humGain: 0 });
    const calibration = calibrateFromTranscript(computeEnvelope(drowned, SR), WORDS, drowned, SR);
    expect(calibration.reliable).toBe(false);
    expect(calibration.notes.join(" ")).toContain("רועשת");
  });

  it("גם כשהכיול נכשל — אף מילה אינה נחתכת", () => {
    const drowned = record({ name: "רעש", speechGain: 0.01, noiseGain: 0.03, reverb: 0, humGain: 0 });
    const plan = planScriptCut(WORDS, SCRIPT, {
      sourceId: "src", duration: DURATION, envelope: computeEnvelope(drowned, SR),
      samples: drowned, sampleRate: SR,
    });
    for (const word of plan.keptWords) {
      const owner = plan.clips.find((c) => word.start >= c.start - 1e-6 && word.end <= c.end + 1e-6);
      expect(owner, `"${word.text}" נחתכת`).toBeTruthy();
    }
  });

  it("סף שגוי לחלוטין עדיין אינו יכול לחתוך מילה — התיקון האוטומטי חוסם", () => {
    const plan = planScriptCut(WORDS, SCRIPT, {
      sourceId: "src", duration: DURATION, envelope, samples, sampleRate: SR,
      // סף אבסורדי: הכל ייראה כמו שקט, כולל אמצע מילים
      boundary: { speechMarginDb: 60, softMarginDb: 55, preRollSec: 0, postRollSec: 0 },
    });
    expect(plan.repairedEdges).toBeGreaterThan(0);
    for (const word of plan.keptWords) {
      const owner = plan.clips.find((c) => word.start >= c.start - 1e-6 && word.end <= c.end + 1e-6);
      expect(owner, `"${word.text}" נחתכת`).toBeTruthy();
    }
  });
});

describe("דירוג אחוזוני", () => {
  const dist = { p10: 10, p50: 20, p90: 40, count: 100 };

  it("ממפה חציון לאמצע וקצוות לקצוות", () => {
    expect(percentileRank(20, dist)).toBeCloseTo(0.5, 5);
    expect(percentileRank(10, dist)).toBeCloseTo(0.1, 5);
    expect(percentileRank(40, dist)).toBeCloseTo(0.9, 5);
  });

  it("מונוטוני ותחום ב-0..1", () => {
    let previous = -1;
    for (let v = -20; v <= 80; v += 2) {
      const rank = percentileRank(v, dist);
      expect(rank).toBeGreaterThanOrEqual(previous);
      expect(rank).toBeGreaterThanOrEqual(0);
      expect(rank).toBeLessThanOrEqual(1);
      previous = rank;
    }
  });
});
