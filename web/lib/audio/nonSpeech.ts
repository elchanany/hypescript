// סיווג צלילים שאינם דיבור בפערים שבין המילים.
//
// עד כה למערכת לא הייתה שום דרך לדעת מה קרה בפער: אם ספק התמלול לא סימן
// audio_event, הפער היה "היעדר מילים" ותו לא. לכן היא לא ידעה להבחין בין
// נשימה שצריך לחתוך, לבין שיעול, גרירת כיסא או צחוק.
//
// כאן מסווגים לפי מאפיינים אקוסטיים *נמדדים* בלבד, עם דרגת ביטחון:
//   נשימה     — רעש-לבן אוושתי, פס גבוה, התקפה רכה, 0.12–0.9 שנ'.
//   שיעול/גרון — פרץ קצר ועז, התקפה חדה, רחב-פס.
//   חבטה/כיסא  — אנרגיה מרוכזת מתחת ל-300Hz, התקפה חדה, דעיכה מהירה.
//   צחוק      — מאופנן 3–8Hz, מוטעם (שטיחות נמוכה), ארוך מ-0.4 שנ'.
// כשאף פרופיל אינו מתאים בביטחון מספיק — התווית היא "לא ידוע", ולא ניחוש.
// תווית מפורשת מספק התמלול תמיד גוברת על המדידה.

import { EnvelopeProfile, SpectralFeatures, meanDb, peakDb } from "./features";
import { AudioCalibration, percentileRank } from "./calibration";

export type NonSpeechLabel =
  | "silence"
  | "breath"
  | "cough_throat"
  | "impact"
  | "laugh"
  | "unknown_nonspeech";

export type EventBasis = "provider_label" | "measured_acoustic_features";

export interface NonSpeechEvent {
  start: number;
  end: number;
  label: NonSpeechLabel;
  /** 0..1 — מידת ההתאמה לפרופיל. מתחת ל-minConfidence התווית היא unknown. */
  confidence: number;
  basis: EventBasis;
  /** תווית מילולית מספק התמלול, כשקיימת. */
  providerText?: string;
  measurements: {
    durationSec: number;
    peakAboveFloorDb: number;
    meanAboveFloorDb: number;
    zcr: number;
    centroid?: number;
    flatness?: number;
    lowRatio?: number;
    midRatio?: number;
    highRatio?: number;
    attack?: number;
    modulationHz?: number;
  };
}

export interface ClassifyOptions {
  /** מתחת לזה הפער נחשב שקט. */
  silenceMarginDb?: number;
  /** מתחת לביטחון הזה מחזירים unknown_nonspeech. */
  minConfidence?: number;
  /** ערך התייחסות ל-attack — משמש רק כשאין כיול. */
  attackReference?: number;
  /**
   * כיול מההקלטה עצמה. **זה מה שמאפשר לאותו קוד לעבוד על כל סרטון.** עם
   * כיול, כל ההשוואות הן מיקום יחסי בהתפלגות של הקובץ הזה; בלעדיו נופלים
   * לספים מוחלטים שנכונים רק להקלטה טיפוסית.
   */
  calibration?: AudioCalibration | null;
}

export const CLASSIFY_DEFAULTS: Required<Omit<ClassifyOptions, "calibration">> = {
  silenceMarginDb: 6,
  minConfidence: 0.55,
  attackReference: 0.35,
};

/** מדרון עולה 0..1 בין lo ל-hi. */
function ramp(value: number, lo: number, hi: number): number {
  if (hi === lo) return value >= hi ? 1 : 0;
  return Math.max(0, Math.min(1, (value - lo) / (hi - lo)));
}

/** חברות טרפזית: 0 מתחת ל-lo, 1 בין loFull ל-hiFull, 0 מעל hi. */
function band(value: number, lo: number, loFull: number, hiFull: number, hi: number): number {
  if (value <= lo || value >= hi) return 0;
  if (value >= loFull && value <= hiFull) return 1;
  if (value < loFull) return (value - lo) / (loFull - lo);
  return (hi - value) / (hi - hiFull);
}

/** ציון פרופיל = ממוצע גיאומטרי של החברויות; קריטריון שנכשל מאפס את הכל. */
function profileScore(memberships: number[]): number {
  if (!memberships.length) return 0;
  let product = 1;
  for (const m of memberships) {
    if (m <= 0) return 0;
    product *= m;
  }
  return Math.pow(product, 1 / memberships.length);
}

/**
 * מסווג פער יחיד. spectral אופציונלי — בלעדיו אפשר להבחין רק בין שקט
 * לצליל כלשהו, וכל השאר מוחזר כ-unknown (בכוונה, לא כניחוש).
 */
export function classifyGap(
  envelope: EnvelopeProfile,
  start: number,
  end: number,
  spectral: SpectralFeatures | null,
  options: ClassifyOptions = {},
): NonSpeechEvent {
  const opts = { ...CLASSIFY_DEFAULTS, ...options };
  const durationSec = Math.max(0, end - start);
  const floorDb = envelope.floor.length
    ? envelope.floor[Math.max(0, Math.min(envelope.floor.length - 1, Math.round(start / envelope.hop)))]
    : envelope.globalFloorDb;
  const peakAboveFloorDb = peakDb(envelope, start, end) - floorDb;
  const meanAboveFloorDb = meanDb(envelope, start, end) - floorDb;

  const fromFrame = Math.max(0, Math.round(start / envelope.hop));
  const toFrame = Math.min(envelope.frameCount - 1, Math.round(end / envelope.hop));
  let zcr = 0;
  let zcrFrames = 0;
  for (let i = fromFrame; i <= toFrame; i++) { zcr += envelope.zcr[i]; zcrFrames++; }
  zcr = zcrFrames ? zcr / zcrFrames : 0;

  const measurements: NonSpeechEvent["measurements"] = {
    durationSec,
    peakAboveFloorDb,
    meanAboveFloorDb,
    zcr,
    ...(spectral ? {
      centroid: spectral.centroid,
      flatness: spectral.flatness,
      lowRatio: spectral.lowRatio,
      midRatio: spectral.midRatio,
      highRatio: spectral.highRatio,
      attack: spectral.attack,
      modulationHz: spectral.modulationHz,
    } : {}),
  };

  const base = { start, end, basis: "measured_acoustic_features" as const, measurements };

  const calibration = options.calibration ?? null;
  const calibrated = !!calibration?.reliable;

  // סף השקט: עם כיול הוא נגזר מרעש הרקע האמיתי של ההקלטה, לא ממספר קבוע
  const silenceMargin = calibrated
    ? Math.max(3, calibration!.speechThresholdDb - calibration!.noiseDb.p50)
    : opts.silenceMarginDb;
  if (peakAboveFloorDb < silenceMargin) {
    return { ...base, label: "silence", confidence: 1 - ramp(peakAboveFloorDb, 0, silenceMargin) * 0.35 };
  }
  if (!spectral) {
    return { ...base, label: "unknown_nonspeech", confidence: 0.3 };
  }

  // ─── מיקום יחסי בהתפלגות של ההקלטה הזו ──────────────────────────────────
  // עם כיול כל מדד הופך ל"איפה זה יושב מול הדיבור בקובץ הזה" (0..1) במקום
  // מול קבוע. עם ההמרה הזו אותם פרופילים תקפים באולפן ובטלפון.
  const speechSpectral = calibration?.spectralSpeech ?? null;
  const relative = calibrated && speechSpectral;
  const rank = (value: number, key: keyof NonNullable<typeof speechSpectral>) =>
    speechSpectral ? percentileRank(value, speechSpectral[key]) : 0.5;

  // אנרגיה: 0 = ברעש הרקע, 1 = בעוצמת דיבור מלאה
  const loudness = calibrated
    ? Math.max(0, Math.min(1,
      (peakAboveFloorDb + calibration!.noiseDb.p50 - calibration!.noiseDb.p90)
      / Math.max(3, calibration!.speechDb.p50 - calibration!.noiseDb.p90)))
    : ramp(peakAboveFloorDb, 4, 26);

  const attackNorm = relative
    ? rank(spectral.attack, "attack")
    : ramp(spectral.attack, 0, opts.attackReference * 2);
  const flatnessHigh = relative ? rank(spectral.flatness, "flatness") : ramp(spectral.flatness, 0.18, 0.42);
  const lowHigh = relative ? rank(spectral.lowRatio, "lowRatio") : ramp(spectral.lowRatio, 0.45, 0.75);
  const highHigh = relative ? rank(spectral.highRatio, "highRatio") : ramp(spectral.highRatio, 0.12, 0.4);
  const midHigh = relative ? rank(spectral.midRatio, "midRatio") : ramp(spectral.midRatio, 0.3, 0.5);
  const centroidHigh = relative ? rank(spectral.centroid, "centroid") : ramp(spectral.centroid, 320, 2600);

  const scores: Array<[NonSpeechLabel, number]> = [
    // נשימה: חלשה מדיבור, אוושתית יותר מדיבור, מוטית לגבוהים, התקפה רכה
    ["breath", profileScore([
      band(durationSec, 0.08, 0.14, 0.6, 1.0),
      band(loudness, 0.03, 0.1, 0.55, 0.85),
      ramp(flatnessHigh, 0.35, 0.7),
      ramp(highHigh, 0.4, 0.75),
      1 - ramp(attackNorm, 0.5, 0.85),
      1 - ramp(lowHigh, 0.6, 0.9),
    ])],
    // שיעול/כחכוח: קצר, חזק כמעט כמו דיבור, התקפה חדה, רחב-פס
    ["cough_throat", profileScore([
      band(durationSec, 0.05, 0.09, 0.45, 0.9),
      ramp(loudness, 0.35, 0.75),
      ramp(attackNorm, 0.5, 0.8),
      band(centroidHigh, 0.1, 0.25, 0.9, 1.0),
      ramp(highHigh, 0.3, 0.6),
    ])],
    // חבטה/גרירת רהיט: אנרגיה בנמוכים הרבה מעבר לכל דיבור, מרכז כובד נמוך
    ["impact", profileScore([
      band(durationSec, 0.02, 0.05, 0.45, 0.9),
      ramp(loudness, 0.2, 0.6),
      ramp(attackNorm, 0.45, 0.8),
      ramp(lowHigh, 0.7, 0.95),
      1 - ramp(centroidHigh, 0.15, 0.45),
      1 - ramp(highHigh, 0.4, 0.75),
    ])],
    // צחוק: ארוך, מוטעם (לא אוושתי), מאופנן 3–8Hz, בפס הדיבור
    ["laugh", profileScore([
      ramp(durationSec, 0.35, 0.6),
      ramp(loudness, 0.25, 0.6),
      band(spectral.modulationHz, 1.8, 3, 8, 12),
      1 - ramp(flatnessHigh, 0.45, 0.8),
      ramp(midHigh, 0.35, 0.7),
    ])],
  ];

  scores.sort((a, b) => b[1] - a[1]);
  const [label, confidence] = scores[0];
  if (confidence < opts.minConfidence) {
    return { ...base, label: "unknown_nonspeech", confidence };
  }
  // הפרש קטן מדי בין שני המועמדים המובילים = אין הכרעה אמיתית
  if (scores.length > 1 && confidence - scores[1][1] < 0.06) {
    return { ...base, label: "unknown_nonspeech", confidence: scores[1][1] };
  }
  return { ...base, label, confidence };
}

export const NON_SPEECH_LABELS_HE: Record<NonSpeechLabel, string> = {
  silence: "שקט",
  breath: "נשימה",
  cough_throat: "שיעול/כחכוח",
  impact: "חבטה/גרירת רהיט",
  laugh: "צחוק",
  unknown_nonspeech: "צליל לא מזוהה",
};

/** ניסוח כן: מדידה אינה ודאות. */
export function describeEvent(event: NonSpeechEvent): string {
  const label = NON_SPEECH_LABELS_HE[event.label];
  const range = `${event.start.toFixed(2)}–${event.end.toFixed(2)}s`;
  if (event.basis === "provider_label") {
    return `${range} ${event.providerText || label} (תווית מפורשת מספק התמלול)`;
  }
  if (event.label === "unknown_nonspeech") {
    return `${range} צליל שאינו דיבור, ללא סיווג ודאי (${event.measurements.peakAboveFloorDb.toFixed(0)}dB מעל הרצפה)`;
  }
  if (event.label === "silence") {
    return `${range} שקט (${event.measurements.peakAboveFloorDb.toFixed(0)}dB מעל הרצפה)`;
  }
  return `${range} מאפיינים תואמים ל${label} (ביטחון ${(event.confidence * 100).toFixed(0)}%)`;
}

/** האם מותר להסיר את הצליל בחיתוך אוטומטי. */
export function isRemovable(event: NonSpeechEvent, keepLaughter: boolean): boolean {
  if (event.label === "laugh") return !keepLaughter;
  if (event.label === "unknown_nonspeech") return event.measurements.peakAboveFloorDb < 14;
  return true;
}
