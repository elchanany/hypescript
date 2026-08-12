// כיול עצמי לכל הקלטה — הדרך היחידה שאלגוריתם כזה מכליל.
//
// הבעיה: כל סף אקוסטי מוחלט ("שקט = מתחת ל-40dB", "נשימה = שטיחות מעל 0.42")
// נכון להקלטה אחת ושגוי לאחרת. מיקרופון דש במרחק 30 ס"מ, מיקרופון מצלמה
// במרחק שני מטר בבית מדרש עם הד, וטלפון עם מזגן ברקע — מייצרים מספרים
// שונים לחלוטין לאותו צליל. כלי שמכויל ידנית על הקלטה אחת נשבר על השנייה.
//
// הפתרון: יש לנו תיוג חינם. התמלול אומר במפורש "בין 2.61 ל-2.94 נאמרה מילה" —
// אלה מסגרות דיבור *ודאיות*. פערים ארוכים בין מילים הם מסגרות לא-דיבור ברמת
// הסתברות גבוהה. משתי האוכלוסיות האלה בונים לכל קובץ בנפרד את ההתפלגות שלו,
// וכל "סף" הופך למיקום יחסי בין שתי ההתפלגויות האלה במקום למספר קבוע.
//
// כך אותו קוד עובד על הקלטת אולפן ועל טלפון ברעש — כי הוא לא מניח דבר על
// הרמות, הוא מודד אותן מהקובץ שלפניו.

import { isSpeechWord, Word } from "@/lib/models";
import { EnvelopeProfile, SpectralFeatures, computeSpectral } from "./features";

export interface Distribution {
  p10: number;
  p50: number;
  p90: number;
  count: number;
}

export interface SpectralDistribution {
  flatness: Distribution;
  centroid: Distribution;
  lowRatio: Distribution;
  midRatio: Distribution;
  highRatio: Distribution;
  attack: Distribution;
}

export interface AudioCalibration {
  /** עוצמת מסגרות שידוע שהן דיבור (מתוך חלונות המילים בתמלול). */
  speechDb: Distribution;
  /** עוצמת מסגרות בפערים ארוכים — רעש הרקע האמיתי של ההקלטה הזו. */
  noiseDb: Distribution;
  /** סף ההפרדה שנגזר מההקלטה עצמה, לא מהנחה. */
  speechThresholdDb: number;
  /** אותו סף, מבוטא כמרחק מרצפת הרעש המקומית (מה ש-boundaries.ts מצפה לו). */
  speechMarginDb: number;
  /** כמה dB מפרידים בין רעש לדיבור בהקלטה הזו — מדד לאיכות ההקלטה. */
  separationDb: number;
  spectralSpeech: SpectralDistribution | null;
  spectralNoise: SpectralDistribution | null;
  /**
   * false כשלא היה מספיק חומר להסיק (הקלטה קצרה, בלי פערים, או הפרדה
   * חלשה מדי). הצרכנים חוזרים לברירות מחדל שמרניות ומדווחים על כך.
   */
  reliable: boolean;
  notes: string[];
}

const EMPTY: Distribution = { p10: 0, p50: 0, p90: 0, count: 0 };

function distribution(values: number[]): Distribution {
  if (!values.length) return { ...EMPTY };
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * q)))];
  return { p10: at(0.1), p50: at(0.5), p90: at(0.9), count: sorted.length };
}

/**
 * מיקום יחסי של ערך בתוך התפלגות: 0 = בתחתית, 0.5 = חציון, 1 = בראש.
 * אינטרפולציה לינארית דרך p10/p50/p90, עם המשך לינארי מעבר לקצוות.
 */
export function percentileRank(value: number, dist: Distribution): number {
  if (!dist.count) return 0.5;
  if (value <= dist.p10) {
    const span = Math.max(1e-6, dist.p50 - dist.p10);
    return Math.max(0, 0.1 - (dist.p10 - value) / span * 0.1);
  }
  if (value <= dist.p50) return 0.1 + (value - dist.p10) / Math.max(1e-6, dist.p50 - dist.p10) * 0.4;
  if (value <= dist.p90) return 0.5 + (value - dist.p50) / Math.max(1e-6, dist.p90 - dist.p50) * 0.4;
  const span = Math.max(1e-6, dist.p90 - dist.p50);
  return Math.min(1, 0.9 + (value - dist.p90) / span * 0.1);
}

export interface CalibrationOptions {
  /** קיצוץ מקצות חלון המילה — הגבולות של ASR רועשים. */
  wordInsetSec?: number;
  /** פער מינימלי שנחשב מועמד לרעש רקע. */
  minGapSec?: number;
  /** כמה חלונות ספקטרליים לדגום מכל אוכלוסייה. */
  spectralSamples?: number;
  /** מתחת להפרדה הזו הכיול אינו אמין. */
  minSeparationDb?: number;
}

const DEFAULTS: Required<CalibrationOptions> = {
  wordInsetSec: 0.04,
  minGapSec: 0.3,
  spectralSamples: 24,
  minSeparationDb: 6,
};

/** ברירות מחדל שמרניות כשאין תמלול או שהכיול נכשל. */
export function fallbackCalibration(envelope: EnvelopeProfile, reason: string): AudioCalibration {
  return {
    speechDb: { ...EMPTY },
    noiseDb: { ...EMPTY },
    speechThresholdDb: envelope.globalFloorDb + 9,
    speechMarginDb: 9,
    separationDb: Math.max(0, envelope.globalPeakDb - envelope.globalFloorDb),
    spectralSpeech: null,
    spectralNoise: null,
    reliable: false,
    notes: [reason],
  };
}

function spectralDistribution(
  samples: Float32Array,
  sampleRate: number,
  windows: Array<[number, number]>,
  limit: number,
): SpectralDistribution | null {
  const picked: SpectralFeatures[] = [];
  const step = Math.max(1, Math.floor(windows.length / limit));
  for (let i = 0; i < windows.length && picked.length < limit; i += step) {
    const [from, to] = windows[i];
    const features = computeSpectral(samples, sampleRate, from, Math.min(to, from + 0.25));
    if (features) picked.push(features);
  }
  if (picked.length < 3) return null;
  return {
    flatness: distribution(picked.map((f) => f.flatness)),
    centroid: distribution(picked.map((f) => f.centroid)),
    lowRatio: distribution(picked.map((f) => f.lowRatio)),
    midRatio: distribution(picked.map((f) => f.midRatio)),
    highRatio: distribution(picked.map((f) => f.highRatio)),
    attack: distribution(picked.map((f) => f.attack)),
  };
}

/**
 * בונה כיול מהקובץ עצמו, בעזרת התיוג החינמי שהתמלול נותן.
 * `samples` אופציונלי — בלעדיו מכוילת רק העוצמה, בלי המאפיינים הספקטרליים.
 */
export function calibrateFromTranscript(
  envelope: EnvelopeProfile,
  words: Word[] | null | undefined,
  samples?: Float32Array | null,
  sampleRate?: number,
  options: CalibrationOptions = {},
): AudioCalibration {
  const opts = { ...DEFAULTS, ...options };
  const speech = (words || [])
    .filter(isSpeechWord)
    .filter((w) => Number.isFinite(w.start) && Number.isFinite(w.end) && w.end - w.start > opts.wordInsetSec * 2.5)
    .sort((a, b) => a.start - b.start);
  if (speech.length < 5) return fallbackCalibration(envelope, "אין די מילים בתמלול לכיול — נעשה שימוש בברירות מחדל.");

  const frame = (seconds: number) =>
    Math.max(0, Math.min(envelope.frameCount - 1, Math.round((seconds - envelope.win / 2) / envelope.hop)));

  // אוכלוסייה א': מסגרות בתוך חלונות מילים — דיבור ודאי
  const speechDbValues: number[] = [];
  const speechWindows: Array<[number, number]> = [];
  for (const word of speech) {
    const from = word.start + opts.wordInsetSec;
    const to = word.end - opts.wordInsetSec;
    if (to <= from) continue;
    speechWindows.push([from, to]);
    for (let i = frame(from); i <= frame(to); i++) speechDbValues.push(envelope.db[i]);
  }

  // אוכלוסייה ב': אמצע פערים ארוכים — רעש הרקע של ההקלטה הזו
  const noiseDbValues: number[] = [];
  const noiseWindows: Array<[number, number]> = [];
  let previousEnd = 0;
  const pushGap = (from: number, to: number) => {
    if (to - from < opts.minGapSec) return;
    // רבע מכל צד נזרק — שם נמצאות התקפה ודעיכה, לא רעש נקי
    const quarter = (to - from) / 4;
    const inner: [number, number] = [from + quarter, to - quarter];
    noiseWindows.push(inner);
    for (let i = frame(inner[0]); i <= frame(inner[1]); i++) noiseDbValues.push(envelope.db[i]);
  };
  for (const word of speech) {
    pushGap(previousEnd, word.start);
    previousEnd = Math.max(previousEnd, word.end);
  }
  pushGap(previousEnd, envelope.duration);

  if (speechDbValues.length < 30 || noiseDbValues.length < 20) {
    return fallbackCalibration(envelope, "אין די מסגרות דיבור/שקט לכיול — נעשה שימוש בברירות מחדל.");
  }

  const speechDb = distribution(speechDbValues);
  const noiseDb = distribution(noiseDbValues);
  const separationDb = speechDb.p50 - noiseDb.p90;
  const notes: string[] = [];

  if (separationDb < opts.minSeparationDb) {
    const weak = fallbackCalibration(
      envelope,
      `הפרדה חלשה בין דיבור לרעש (${separationDb.toFixed(1)}dB) — ההקלטה רועשת; נעשה שימוש בברירות מחדל שמרניות.`,
    );
    return { ...weak, speechDb, noiseDb, separationDb };
  }

  // הסף יושב ברבע התחתון של המרווח בין רעש לדיבור: מספיק גבוה כדי לא
  // לתפוס רעש רקע, מספיק נמוך כדי לא לפספס עיצור שוקק בתחילת מילה.
  const speechThresholdDb = noiseDb.p90 + Math.max(2.5, (speechDb.p10 - noiseDb.p90) * 0.3);
  const medianFloor = distribution(Array.from(envelope.floor)).p50;

  const canSpectral = !!samples && !!sampleRate;
  return {
    speechDb,
    noiseDb,
    speechThresholdDb,
    speechMarginDb: Math.max(3, speechThresholdDb - medianFloor),
    separationDb,
    spectralSpeech: canSpectral ? spectralDistribution(samples!, sampleRate!, speechWindows, opts.spectralSamples) : null,
    spectralNoise: canSpectral ? spectralDistribution(samples!, sampleRate!, noiseWindows, opts.spectralSamples) : null,
    reliable: true,
    notes,
  };
}

/** תיאור קריא לדוח — כדי שהמשתמש יראה על מה ההחלטות התבססו. */
export function describeCalibration(calibration: AudioCalibration): string {
  if (!calibration.reliable) {
    return `כיול: לא אמין — ${calibration.notes[0] || "סיבה לא ידועה"}`;
  }
  return (
    `כיול מההקלטה עצמה: דיבור ${calibration.speechDb.p50.toFixed(0)}dB, `
    + `רעש רקע ${calibration.noiseDb.p90.toFixed(0)}dB, `
    + `הפרדה ${calibration.separationDb.toFixed(0)}dB, `
    + `סף ${calibration.speechThresholdDb.toFixed(0)}dB`
    + (calibration.spectralSpeech ? " (כולל פרופיל ספקטרלי)" : "")
  );
}
