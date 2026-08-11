import { describe, expect, it } from "vitest";
import type { Word } from "@/lib/models";
import { computeEnvelope, computeSpectral, dbAt, meanDb } from "@/lib/audio/features";
import { classifyGap } from "@/lib/audio/nonSpeech";
import { planScriptCut } from "./scriptPlan";
import { findValley, refineOffset, refineOnset } from "./boundaries";

const SR = 16000;

/** רעש פסאודו-אקראי דטרמיניסטי — אותה תוצאה בכל הרצה. */
function noiseSource(seed = 12345) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return (state / 0xffffffff) * 2 - 1;
  };
}

type Kind = "silence" | "speech" | "breath" | "thud";
interface Region { kind: Kind; from: number; to: number }

/**
 * מייצר אות בדיקה: דיבור = הרמוניות מאופננות, נשימה = רעש רחב-פס חלש,
 * חבטה = פרץ 80Hz דועך, שקט = רצפת רעש בלבד.
 */
function synth(regions: Region[], duration: number): Float32Array {
  const rand = noiseSource();
  const samples = new Float32Array(Math.round(duration * SR));
  for (let i = 0; i < samples.length; i++) samples[i] = rand() * 0.0008; // רצפת רעש ≈ -62dBFS

  for (const region of regions) {
    const from = Math.round(region.from * SR);
    const to = Math.min(samples.length, Math.round(region.to * SR));
    for (let i = from; i < to; i++) {
      const t = (i - from) / SR;
      if (region.kind === "speech") {
        // אפנון הברות רדוד — דיבור אמיתי אינו יורד לרצפת הרעש בין הברות
        const envelope = 0.72 + 0.28 * Math.sin(2 * Math.PI * 4 * t);
        samples[i] += 0.22 * envelope * (
          Math.sin(2 * Math.PI * 130 * t)
          + 0.6 * Math.sin(2 * Math.PI * 260 * t)
          + 0.35 * Math.sin(2 * Math.PI * 520 * t)
          + 0.15 * Math.sin(2 * Math.PI * 1040 * t)
        ) / 2.1;
      } else if (region.kind === "breath") {
        // רעש עם הדגשת גבוהים (הפרש ראשון) והתקפה רכה
        const shape = Math.sin(Math.PI * ((i - from) / Math.max(1, to - from)));
        samples[i] += (rand() - rand() * 0.5) * 0.012 * shape;
      } else if (region.kind === "thud") {
        const decay = Math.exp(-t * 22);
        samples[i] += 0.14 * decay * Math.sin(2 * Math.PI * 85 * t);
      }
    }
  }
  return samples;
}

function words(spec: Array<[string, number, number]>): Word[] {
  return spec.map(([text, start, end]) => ({ text, start, end }));
}

// שיעור מסונתז: שלוש קבוצות דיבור מופרדות בשקט אמיתי
const REGIONS: Region[] = [
  { kind: "speech", from: 0.50, to: 1.90 },
  { kind: "silence", from: 1.90, to: 2.60 },
  { kind: "speech", from: 2.60, to: 4.00 },
  { kind: "silence", from: 4.00, to: 4.80 },
  { kind: "speech", from: 4.80, to: 6.20 },
];
const DURATION = 7;
const SAMPLES = synth(REGIONS, DURATION);
const ENVELOPE = computeEnvelope(SAMPLES, SR);

const WORDS = words([
  ["שלום", 0.52, 0.95], ["וברכה", 1.00, 1.45], ["השיעור", 1.50, 1.88],
  ["נמסר", 2.62, 3.05], ["בכולל", 3.10, 3.55], ["הקדיש", 3.58, 3.98],
  ["ההנצחה", 4.82, 5.30], ["היום", 5.35, 5.70], ["תהיה", 5.75, 6.18],
]);

describe("מעטפת אנרגיה", () => {
  it("מפרידה בבירור בין דיבור לשקט", () => {
    expect(dbAt(ENVELOPE, 1.2) - ENVELOPE.globalFloorDb).toBeGreaterThan(25);
    expect(dbAt(ENVELOPE, 2.25) - ENVELOPE.globalFloorDb).toBeLessThan(6);
  });

  it("רזולוציית המסגרות עדינה מ-10ms", () => {
    expect(ENVELOPE.hop).toBeLessThanOrEqual(0.01);
  });
});

describe("מיקום גבולות", () => {
  it("מוצא כניסת דיבור ליד ההתחלה האמיתית ולא ליד חותמת התמלול", () => {
    // חותמת ASR מאחרת ב-120ms — הגבול האקוסטי הוא 2.60
    const refined = refineOnset(ENVELOPE, 2.72);
    expect(refined.measured).toBe(true);
    expect(refined.acousticTime).toBeGreaterThan(2.50);
    expect(refined.acousticTime).toBeLessThan(2.70);
  });

  it("מוצא יציאת דיבור אחרי הדעיכה ולא לפניה", () => {
    // חותמת ASR מקדימה ב-80ms — הדיבור נמשך עד 1.90
    const refined = refineOffset(ENVELOPE, 1.82);
    expect(refined.measured).toBe(true);
    expect(refined.acousticTime).toBeGreaterThan(1.85);
  });

  it("מאתר את תחתית עמק השקט", () => {
    const valley = findValley(ENVELOPE, 1.9, 2.6);
    expect(valley).not.toBeNull();
    expect(valley!.aboveFloorDb).toBeLessThan(5);
    expect(valley!.center).toBeGreaterThan(1.9);
    expect(valley!.center).toBeLessThan(2.6);
  });
});

describe("תכנון חיתוך לפי סקריפט", () => {
  const script = "שלום וברכה השיעור ההנצחה היום תהיה";
  const plan = planScriptCut(WORDS, script, {
    sourceId: "src", duration: DURATION, pacing: "natural",
    envelope: ENVELOPE, samples: SAMPLES, sampleRate: SR,
  });

  it("שומר בדיוק את מילות הסקריפט", () => {
    expect(plan.missingScript).toEqual([]);
    expect(plan.keptWords.map((w) => w.text)).toEqual(script.split(" "));
  });

  it("מסיר את הדיבור שאינו בסקריפט ומדווח עליו", () => {
    expect(plan.removedSpeech.map((r) => r.text)).toEqual(["נמסר", "בכולל", "הקדיש"]);
  });

  it("בונה שני קליפים רציפים בזמן מקור", () => {
    expect(plan.clips).toHaveLength(2);
    expect(plan.clips[1].start).toBeGreaterThanOrEqual(plan.clips[0].end - 1e-9);
  });

  it("כל נקודת חיתוך נופלת בשקט מדוד ולא בתוך דיבור", () => {
    for (const clip of plan.clips) {
      expect(dbAt(ENVELOPE, clip.start) - ENVELOPE.globalFloorDb).toBeLessThan(9);
      expect(dbAt(ENVELOPE, clip.end) - ENVELOPE.globalFloorDb).toBeLessThan(9);
    }
  });

  it("אף מילה שנשמרה אינה נחתכת באמצע", () => {
    for (const word of plan.keptWords) {
      const owner = plan.clips.find((c) => word.start >= c.start - 0.06 && word.end <= c.end + 0.06);
      expect(owner, `המילה "${word.text}" אינה מוכלת בקליפ`).toBeTruthy();
    }
  });

  it("מדווח על נקודות החיתוך עם מדידה", () => {
    expect(plan.boundaries).toHaveLength(1);
    expect(plan.boundaries[0].measured).toBe(true);
    expect(plan.boundaries[0].reason).toBe("script_removal");
    expect(plan.boundaries[0].removedSec).toBeGreaterThan(1.0);
  });

  it("אין הברה קטועה במעבר — הצד הנזרק של כל קאט שקט", () => {
    // הפער עצמו מכיל דיבור שהוסר בכוונה. מה שחייב להיות שקט הוא הצד הנזרק:
    // מיד אחרי נקודת היציאה, ומיד לפני נקודת הכניסה.
    const afterOut = meanDb(ENVELOPE, plan.clips[0].end, plan.clips[0].end + 0.08);
    const beforeIn = meanDb(ENVELOPE, plan.clips[1].start - 0.08, plan.clips[1].start);
    expect(afterOut - ENVELOPE.globalFloorDb).toBeLessThan(12);
    expect(beforeIn - ENVELOPE.globalFloorDb).toBeLessThan(12);
  });
});

describe("שקיפות על מה שלא נמצא", () => {
  it("מדווח על מילת סקריפט שלא נאמרה במקום להשמיט אותה בשקט", () => {
    const plan = planScriptCut(WORDS, "שלום וברכה השיעור המופלא", {
      sourceId: "src", duration: DURATION, envelope: ENVELOPE,
    });
    expect(plan.missingScript.map((m) => m.text)).toEqual(["המופלא"]);
    expect(plan.clips.length).toBeGreaterThan(0);
  });

  it("עמיד לשגיאת כתיב בתמלול — המילה נשמרת ולא נעלמת", () => {
    const drifted = WORDS.map((w) => (w.text === "וברכה" ? { ...w, text: "ובראכה" } : w));
    const plan = planScriptCut(drifted, "שלום וברכה השיעור", {
      sourceId: "src", duration: DURATION, envelope: ENVELOPE,
    });
    expect(plan.missingScript).toEqual([]);
    expect(plan.keptWords.map((w) => w.text)).toEqual(["שלום", "וברכה", "השיעור"]);
  });

  it("עובד גם בלי גל-קול, ומסמן שהמדידה חסרה", () => {
    const plan = planScriptCut(WORDS, "שלום וברכה השיעור ההנצחה היום תהיה", {
      sourceId: "src", duration: DURATION, envelope: null,
    });
    expect(plan.clips.length).toBe(2);
    expect(plan.boundaries.every((b) => b.measured === false)).toBe(true);
  });
});

describe("סיווג צלילים שאינם דיבור", () => {
  const eventRegions: Region[] = [
    { kind: "speech", from: 0.2, to: 1.0 },
    { kind: "breath", from: 1.15, to: 1.55 },
    { kind: "speech", from: 1.8, to: 2.6 },
    { kind: "thud", from: 2.8, to: 3.1 },
    { kind: "speech", from: 3.4, to: 4.2 },
  ];
  const eventSamples = synth(eventRegions, 5);
  const eventEnvelope = computeEnvelope(eventSamples, SR);
  const classify = (from: number, to: number) =>
    classifyGap(eventEnvelope, from, to, computeSpectral(eventSamples, SR, from, to));

  it("מזהה שקט אמיתי כשקט", () => {
    const result = classify(4.4, 4.9);
    expect(result.label).toBe("silence");
  });

  it("אינו מסווג נשימה כשקט", () => {
    const result = classify(1.15, 1.55);
    expect(result.label).not.toBe("silence");
    expect(result.measurements.peakAboveFloorDb).toBeGreaterThan(6);
  });

  it("מבחין בין נשימה לחבטה לפי פיזור האנרגיה בפסים", () => {
    const breath = classify(1.15, 1.55);
    const thud = classify(2.8, 3.1);
    expect(thud.measurements.lowRatio!).toBeGreaterThan(breath.measurements.lowRatio!);
    expect(breath.measurements.highRatio!).toBeGreaterThan(thud.measurements.highRatio!);
  });

  it("מחזיר 'לא ידוע' במקום לנחש כשאין מספיק ראיות", () => {
    const result = classifyGap(eventEnvelope, 1.15, 1.55, null);
    expect(result.label).toBe("unknown_nonspeech");
    expect(result.basis).toBe("measured_acoustic_features");
  });

  it("כל סיווג נושא ביטחון ומדידות", () => {
    const result = classify(2.8, 3.1);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.measurements.durationSec).toBeCloseTo(0.3, 1);
    expect(result.measurements.centroid).toBeGreaterThan(0);
  });
});
