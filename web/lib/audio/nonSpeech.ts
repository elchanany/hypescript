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
  /** ערך התייחסות ל-attack — תלוי במשרעת, מנורמל מול השיא בפער. */
  attackReference?: number;
}

export const CLASSIFY_DEFAULTS: Required<ClassifyOptions> = {
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

  if (peakAboveFloorDb < opts.silenceMarginDb) {
    return { ...base, label: "silence", confidence: 1 - ramp(peakAboveFloorDb, 0, opts.silenceMarginDb) * 0.35 };
  }
  if (!spectral) {
    return { ...base, label: "unknown_nonspeech", confidence: 0.3 };
  }

  const attackNorm = ramp(spectral.attack, 0, opts.attackReference * 2);
  const scores: Array<[NonSpeechLabel, number]> = [
    ["breath", profileScore([
      band(durationSec, 0.08, 0.14, 0.6, 1.0),
      band(peakAboveFloorDb, 4, 7, 20, 30),
      ramp(spectral.flatness, 0.18, 0.42),
      ramp(spectral.highRatio + spectral.midRatio * 0.4, 0.28, 0.55),
      1 - ramp(attackNorm, 0.35, 0.8),
      1 - ramp(spectral.lowRatio, 0.45, 0.75),
    ])],
    ["cough_throat", profileScore([
      band(durationSec, 0.05, 0.09, 0.45, 0.9),
      ramp(peakAboveFloorDb, 12, 22),
      ramp(attackNorm, 0.25, 0.6),
      band(spectral.lowRatio, 0.1, 0.22, 0.62, 0.82),
      ramp(spectral.highRatio, 0.08, 0.25),
      band(spectral.centroid, 350, 700, 2600, 4200),
    ])],
    ["impact", profileScore([
      band(durationSec, 0.02, 0.05, 0.45, 0.9),
      ramp(peakAboveFloorDb, 9, 18),
      ramp(attackNorm, 0.3, 0.65),
      ramp(spectral.lowRatio, 0.5, 0.72),
      1 - ramp(spectral.centroid, 320, 900),
      1 - ramp(spectral.highRatio, 0.1, 0.3),
    ])],
    ["laugh", profileScore([
      ramp(durationSec, 0.35, 0.6),
      ramp(peakAboveFloorDb, 9, 16),
      band(spectral.modulationHz, 1.8, 3, 8, 12),
      1 - ramp(spectral.flatness, 0.22, 0.45),
      ramp(spectral.midRatio, 0.3, 0.5),
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
