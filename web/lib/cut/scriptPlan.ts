// מתכנן החיתוך: מסקריפט + תמלול + גל-קול → רשימת קליפים, עם דוח מלא.
//
// זה מחליף שני מנגנונים נפרדים שעבדו זה נגד זה: חיפוש חמדני שהפיל מילים,
// והידוק שקט שהוזז אחר כך בחזרה על ידי הרחבת גבולות. כאן ההחלטה אחת:
// היישור קובע *מה* נשמר, האקוסטיקה קובעת *איפה בדיוק* חותכים, והדוח אומר
// בפירוש מה לא נמצא — במקום להשמיט בשקט.

import { isSpeechWord, Word } from "@/lib/models";
import { Clip, uid } from "@/lib/editor/model";
import { HebrewToken, makeToken, normalizeBase, tokenizeHebrew } from "@/lib/align/hebrew";
import { AlignmentReport, alignTokens, summarizeAlignment } from "@/lib/align/globalAlign";
import { EnvelopeProfile, SpectralFeatures, computeSpectral } from "@/lib/audio/features";
import { AudioCalibration, calibrateFromTranscript, describeCalibration } from "@/lib/audio/calibration";
import { NonSpeechEvent, classifyGap, isRemovable } from "@/lib/audio/nonSpeech";
import { BOUNDARY_DEFAULTS, BoundaryOptions, chooseJoinPoint, refineOffset, refineOnset } from "./boundaries";

export type Pacing = "staccato" | "tight" | "natural" | "broadcast";

export interface PacingPolicy {
  /** פאוזה פנימית ארוכה מזו נחתכת גם בתוך רצף שנשמר. */
  maxInternalPauseSec: number;
  boundary: BoundaryOptions;
  /** מתחת לפער הזה אחרי ההידוק — לא שווה לחתוך בכלל. */
  minRemovalSec: number;
}

export const PACING: Record<Pacing, PacingPolicy> = {
  /**
   * מקסימום הידוק — חותך בכל מקום שיש בו באמת שקט בין מילה למילה.
   * האוויר סביב כל מילה מצומצם למינימום שעדיין לא קוטע הברה. שים לב:
   * במקומות שבהן מילים נאמרות רצוף (פחות מ-50ms ביניהן) אין מה להסיר —
   * חיתוך שם יחתוך את המילה עצמה, וההגנה המבנית תמנע אותו.
   */
  staccato: {
    maxInternalPauseSec: 0.04,
    minRemovalSec: 0.015,
    boundary: { preRollSec: 0.02, postRollSec: 0.035, speechMarginDb: 9, softMarginDb: 3 },
  },
  // פרסומת / רשתות חברתיות — בלי שנייה מיותרת
  tight: {
    maxInternalPauseSec: 0.16,
    minRemovalSec: 0.05,
    boundary: { preRollSec: 0.03, postRollSec: 0.05, speechMarginDb: 9, softMarginDb: 3 },
  },
  // ברירת מחדל לשיעור — מהודק אך נושם
  natural: {
    maxInternalPauseSec: 0.42,
    minRemovalSec: 0.08,
    boundary: { preRollSec: 0.05, postRollSec: 0.09, speechMarginDb: 8, softMarginDb: 3 },
  },
  // שיעור/דרשה — נשמרת פאוזה רטורית, מוסרות רק נשימות ותקלות
  broadcast: {
    maxInternalPauseSec: 0.85,
    minRemovalSec: 0.12,
    boundary: { preRollSec: 0.07, postRollSec: 0.12, speechMarginDb: 8, softMarginDb: 3 },
  },
};

/** מהססים עבריים נפוצים — מוסרים גם כשהם "הותאמו" בטעות לסקריפט. */
export const HEBREW_FILLERS = new Set(
  ["אה", "אהה", "אאא", "אא", "אמ", "אממ", "אהם", "המ", "המם", "אהמ", "מממ", "ננ", "יעני", "כאילו"]
    .map(normalizeBase),
);

export interface ScriptCutOptions {
  sourceId: string;
  duration: number;
  pacing?: Pacing;
  envelope?: EnvelopeProfile | null;
  /** דגימות מונו לניתוח ספקטרלי — בלעדיהן אין סיווג צלילים. */
  samples?: Float32Array | null;
  sampleRate?: number;
  removeFillers?: boolean;
  /** צחוק קהל נשמר כברירת מחדל — הוא חלק מהאווירה. */
  keepLaughter?: boolean;
  minClipSec?: number;
  boundary?: BoundaryOptions;
  /** עוקף את הפאוזה של ה-pacing (שניות) כשהמשתמש נקב במספר מפורש. */
  maxInternalPauseOverride?: number;
}

export interface CutBoundaryReport {
  /** אינדקס הקליפ שנוצר. */
  clipIndex: number;
  sourceOut: number;
  nextSourceIn: number;
  /** הפער שהוסר בזמן-מקור. */
  removedSec: number;
  /** dB בנקודת החיתוך מעל רצפת הרעש. 0 ≈ שקט מוחלט. */
  cutAboveFloorDb: number | null;
  /** true כשהחיתוך מוקם לפי מדידה ולא לפי חותמת התמלול בלבד. */
  measured: boolean;
  /** מה נמדד בפער שהוסר. */
  event?: NonSpeechEvent;
  /** הסיבה לחיתוך. */
  reason: "script_removal" | "pause" | "filler" | "non_speech";
}

export interface ScriptCutPlan {
  clips: Clip[];
  alignment: AlignmentReport;
  /** מילות סקריפט שלא נמצאו בתמלול — הליבה של "נעלמו לי מילים". */
  missingScript: Array<{ scriptIndex: number; text: string }>;
  /** מילים שהותאמו בדמיון נמוך — התקבלו כדי לא לאבד אותן, אך ראויות לבדיקה. */
  weakMatches: Array<{ scriptIndex: number; text: string }>;
  /** מילים שנאמרו והוסרו כי אינן בסקריפט. */
  removedSpeech: Array<{ text: string; start: number; end: number }>;
  boundaries: CutBoundaryReport[];
  events: NonSpeechEvent[];
  keptSec: number;
  removedSec: number;
  /** המילים שנשמרו, לפי סדר — הבסיס לכתוביות. */
  keptWords: Word[];
  /** מה נמדד מההקלטה עצמה — הבסיס לכל ההחלטות האקוסטיות. */
  calibration: AudioCalibration | null;
  /** כמה גבולות הורחבו בתיקון האוטומטי כדי לא לחתוך מילה. */
  repairedEdges: number;
}

interface KeptWord {
  word: Word;
  asrIndex: number;
  scriptIndex: number;
  scriptToken: HebrewToken;
}

type BreakReason = CutBoundaryReport["reason"];

interface Run {
  words: KeptWord[];
  /** למה נשבר הרצף *לפני* הרצף הזה. */
  reason: BreakReason;
  /**
   * true כשהפער שלפני הרצף סווג כרעש או שקט ודאי. אז מותר להדק עד גבולות
   * המילים; אחרת נשמרת הרחבת הדיבור-הרך שמגינה על עיצורים.
   */
  cleanGap?: boolean;
}

/**
 * פער קצר מזה לא נבדק בכלל — הוא חלק מזרימת הדיבור. הגבול נגזר מה-pacing:
 * ב-staccato המשתמש ביקש לחתוך בין כל מילה, ולכן גם פער של 40ms נבחן.
 * הרצפה של 30ms קיימת כי מתחתיה אין די מסגרות למדידה אמינה.
 */
const CLASSIFY_GAP_CEILING = 0.12;
const CLASSIFY_GAP_FLOOR = 0.03;
/** צלילים שמוסרים בזכות עצמם, גם כשהם קצרים מסף הפאוזה. */
const NOISE_LABELS = new Set(["breath", "cough_throat", "impact"]);
const NOISE_CONFIDENCE = 0.6;
/** קיצוץ מקצות הפער לפני סיווג — חותמות ASR צמודות לדיבור. */
const GAP_INSET_SEC = 0.09;
/** קאט שמסיר פחות מזה אינו שווה את גבול הקידוד שהוא מוסיף. */
const MIN_EFFECTIVE_CUT = 0.02;

function spectralFor(
  options: ScriptCutOptions,
  start: number,
  end: number,
): SpectralFeatures | null {
  if (!options.samples || !options.sampleRate) return null;
  if (end - start < 0.03) return null;
  try { return computeSpectral(options.samples, options.sampleRate, start, end); }
  catch { return null; }
}

/**
 * בונה תוכנית חיתוך מלאה. אינו זורק חריגה על התאמה חלקית — מדווח עליה,
 * כדי שהשלב הבא (או המשתמש) יחליט מה לעשות.
 */
export function planScriptCut(
  words: Word[],
  scriptText: string,
  options: ScriptCutOptions,
): ScriptCutPlan {
  const preset = PACING[options.pacing ?? "natural"];
  const pacing: PacingPolicy = options.maxInternalPauseOverride != null
    ? { ...preset, maxInternalPauseSec: Math.max(0.05, options.maxInternalPauseOverride) }
    : preset;
  const minClipSec = options.minClipSec ?? 0.12;
  const classifyMinGap = Math.max(
    CLASSIFY_GAP_FLOOR,
    Math.min(CLASSIFY_GAP_CEILING, pacing.maxInternalPauseSec),
  );
  const removeFillers = options.removeFillers !== false;
  const envelope = options.envelope ?? null;

  // הכיול נגזר מההקלטה עצמה לפני כל החלטה אקוסטית. סף הדיבור מגיע מכאן
  // ולא מקבוע — זה מה שמאפשר לאותו קוד לעבוד על מיקרופון דש ועל טלפון.
  const calibration = envelope
    ? calibrateFromTranscript(envelope, words, options.samples, options.sampleRate)
    : null;
  const boundaryOpts: BoundaryOptions = {
    ...BOUNDARY_DEFAULTS,
    ...preset.boundary,
    ...(calibration?.reliable ? { speechMarginDb: calibration.speechMarginDb } : {}),
    ...options.boundary,
  };

  const speech = words
    .filter(isSpeechWord)
    .filter((w) => Number.isFinite(w.start) && Number.isFinite(w.end) && w.end > w.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const providerEvents = words
    .filter((w) => w.type === "audio_event" && Number.isFinite(w.start) && Number.isFinite(w.end))
    .sort((a, b) => a.start - b.start);

  const asrTokens = speech.map((w) => makeToken(w.text));
  const scriptTokens = tokenizeHebrew(scriptText);
  const pairs = alignTokens(asrTokens, scriptTokens);
  const alignment = summarizeAlignment(pairs, scriptTokens.length, { asr: asrTokens, script: scriptTokens });

  const emptyPlan = (): ScriptCutPlan => ({
    clips: [],
    alignment,
    missingScript: alignment.missingScript.map((i) => ({ scriptIndex: i, text: scriptTokens[i]?.raw ?? "" })),
    weakMatches: alignment.weakMatches.map((i) => ({ scriptIndex: i, text: scriptTokens[i]?.raw ?? "" })),
    removedSpeech: [],
    boundaries: [],
    events: [],
    keptSec: 0,
    removedSec: 0,
    keptWords: [],
    calibration,
    repairedEdges: 0,
  });
  if (!speech.length || !scriptTokens.length) return emptyPlan();

  // ─── אילו מילים נשמרות ─────────────────────────────────────────────────
  const kept: KeptWord[] = [];
  const removedSpeech: ScriptCutPlan["removedSpeech"] = [];
  for (const pair of pairs) {
    if (pair.asrIndex == null) continue;
    const word = speech[pair.asrIndex];
    if (!word) continue;
    const isFiller = removeFillers && HEBREW_FILLERS.has(normalizeBase(word.text));
    if (pair.scriptIndex == null || isFiller) {
      removedSpeech.push({ text: word.text, start: word.start, end: word.end });
      continue;
    }
    kept.push({ word, asrIndex: pair.asrIndex, scriptIndex: pair.scriptIndex, scriptToken: scriptTokens[pair.scriptIndex] });
  }
  if (!kept.length) return emptyPlan();

  // ─── פירוק לרצפים רציפים ────────────────────────────────────────────────
  const events: NonSpeechEvent[] = [];
  const eventInGap = (from: number, to: number): NonSpeechEvent | undefined => {
    const provider = providerEvents.find((e) => e.start >= from - 0.02 && e.end <= to + 0.02);
    if (provider) {
      const found: NonSpeechEvent = {
        start: provider.start,
        end: provider.end,
        label: "unknown_nonspeech",
        confidence: 1,
        basis: "provider_label",
        providerText: provider.text,
        measurements: { durationSec: provider.end - provider.start, peakAboveFloorDb: 0, meanAboveFloorDb: 0, zcr: 0 },
      };
      events.push(found);
      return found;
    }
    if (!envelope || to - from < 0.04) return undefined;
    // חותמות המילים של Scribe צמודות, ולכן קצוות ה"פער" עדיין מכילים את זנב
    // המילה הקודמת ואת ההתקפה של הבאה. מדידת הפער כולו רואה שם דיבור ומסווגת
    // נשימה כ-speech_like. בודקים רק את הפנים, כמו בכיול.
    const inset = Math.min(GAP_INSET_SEC, (to - from) * 0.25);
    const innerFrom = from + inset;
    const innerTo = to - inset;
    const wide = innerTo - innerFrom < 0.05;
    const measured = wide
      ? classifyGap(envelope, from, to, spectralFor(options, from, to), { calibration })
      : classifyGap(envelope, innerFrom, innerTo, spectralFor(options, innerFrom, innerTo), { calibration });
    // הטווח המדווח נשאר הפער המלא — הוא מה שיוסר בפועל
    const event: NonSpeechEvent = { ...measured, start: from, end: to };
    events.push(event);
    return event;
  };

  const runs: Run[] = [{ words: [kept[0]], reason: "script_removal", cleanGap: true }];
  for (let i = 1; i < kept.length; i++) {
    const previous = kept[i - 1];
    const current = kept[i];
    const gapStart = previous.word.end;
    const gapEnd = current.word.start;
    const gap = gapEnd - gapStart;
    // דילוג באינדקס ASR = נאמרו מילים שאינן בסקריפט → חייבים לחתוך
    const skippedSpeech = current.asrIndex > previous.asrIndex + 1;

    let reason: BreakReason | null = null;
    if (skippedSpeech) {
      reason = removedSpeech.some((r) => r.start >= gapStart - 1e-6 && r.end <= gapEnd + 1e-6
        && HEBREW_FILLERS.has(normalizeBase(r.text)))
        ? "filler"
        : "script_removal";
    } else if (gap >= classifyMinGap) {
      const event = eventInGap(gapStart, gapEnd);
      const removable = event ? isRemovable(event, options.keepLaughter !== false) : true;
      // רעש שאינו דיבור (נשימה/כחכוח/חבטה) מוסר בזכות עצמו, בלי קשר לסף
      // הפאוזה. סף הפאוזה נועד לפאוזות רטוריות — נשימה אינה פאוזה רטורית,
      // והמשתמש ביקש להסיר אותה גם כשהיא קצרה.
      const noise = !!event && NOISE_LABELS.has(event.label) && event.confidence >= NOISE_CONFIDENCE;
      if (removable && (gap > pacing.maxInternalPauseSec || noise)) {
        reason = noise ? "non_speech" : "pause";
      }
    }

    if (reason) {
      // פער שסווג כרעש הוא "נקי": מותר להדק אליו עד גבולות המילים, בלי
      // הרחבת הדיבור-הרך שנועדה להגן על עיצורים ובולעת את הנשימה עצמה.
      const event = events[events.length - 1];
      const matchesGap = !!event && event.start >= gapStart - 0.05 && event.end <= gapEnd + 0.05;
      const cleanGap = reason === "script_removal" || reason === "filler"
        || (matchesGap && (NOISE_LABELS.has(event!.label) || event!.label === "silence"));
      runs.push({ words: [current], reason, cleanGap });
    } else runs[runs.length - 1].words.push(current);
  }

  // ─── מיקום מדויק של הגבולות ─────────────────────────────────────────────
  interface Placed { start: number; end: number; run: Run; measured: boolean; cutDb: number | null }
  const placed: Placed[] = runs.map((run) => ({
    start: run.words[0].word.start,
    end: run.words[run.words.length - 1].word.end,
    run,
    measured: false,
    cutDb: null,
  }));

  if (envelope) {
    const first = refineOnset(envelope, placed[0].start, boundaryOpts);
    placed[0].start = first.time;
    placed[0].measured = first.measured;
    const lastOffset = refineOffset(envelope, placed[placed.length - 1].end, boundaryOpts);
    placed[placed.length - 1].end = lastOffset.time;
    placed[placed.length - 1].measured ||= lastOffset.measured;

    for (let i = 0; i < placed.length - 1; i++) {
      // הרחבת הדיבור-הרך זוחלת דרך נשימה (שנשמעת הרבה מעל רצפת הרעש)
      // ומשאירה אותה בפנים. בפער שסווג כרעש מנטרלים אותה.
      const nextClean = placed[i + 1].run.cleanGap === true;
      const joinOpts: BoundaryOptions = nextClean
        ? { ...boundaryOpts, softMarginDb: boundaryOpts.speechMarginDb }
        : boundaryOpts;
      const join = chooseJoinPoint(
        envelope,
        placed[i].run.words[placed[i].run.words.length - 1].word.end,
        placed[i + 1].run.words[0].word.start,
        joinOpts,
      );
      placed[i].end = join.outPoint;
      placed[i + 1].start = join.inPoint;
      placed[i].measured ||= join.measured;
      placed[i].cutDb = join.valley ? join.valley.aboveFloorDb : null;
    }
  } else {
    // בלי גל-קול נשארים על חותמות התמלול עם ריפוד — פחות מדויק, ומדווח ככזה
    const pre = boundaryOpts.preRollSec ?? BOUNDARY_DEFAULTS.preRollSec;
    const post = boundaryOpts.postRollSec ?? BOUNDARY_DEFAULTS.postRollSec;
    for (let i = 0; i < placed.length; i++) {
      placed[i].start = Math.max(0, placed[i].start - pre);
      placed[i].end = Math.min(options.duration, placed[i].end + post);
      if (i > 0 && placed[i].start < placed[i - 1].end) {
        const middle = (placed[i].start + placed[i - 1].end) / 2;
        placed[i - 1].end = middle;
        placed[i].start = middle;
      }
    }
  }

  // ─── מיזוג חיתוכים חסרי טעם + אכיפת רציפות ──────────────────────────────
  const merged: Placed[] = [];
  for (const segment of placed) {
    const previous = merged[merged.length - 1];
    // מיזוג מותר רק כשהפער הוא פאוזה. חיתוך שנועד להסיר דיבור/מהסס לעולם
    // אינו מתמזג — מיזוג כזה היה מחזיר לפלט בדיוק את המילים שביקשנו למחוק.
    const removesSpeech = segment.run.reason === "script_removal" || segment.run.reason === "filler";
    if (previous && !removesSpeech && segment.start - previous.end < pacing.minRemovalSec) {
      previous.end = Math.max(previous.end, segment.end);
      previous.run = { words: [...previous.run.words, ...segment.run.words], reason: previous.run.reason };
      previous.measured ||= segment.measured;
      continue;
    }
    if (previous && segment.start < previous.end) segment.start = previous.end;
    merged.push({ ...segment });
  }

  // ─── תיקון מחייב: גבול לעולם לא חוצה מילה שנשמרת ────────────────────────
  // המדידה האקוסטית יכולה לטעות (הקלטה רועשת, סף שלא כויל, עיצור חלש
  // במיוחד). כאן זה נעצר: אם גבול נכנס לתוך מילה שהמשתמש ביקש — הגבול זז
  // החוצה. האינווריאנטה מובטחת מבנית ולא תלויה בכיול המושלם.
  let repairedEdges = 0;
  const guard = 0.015;
  for (const segment of merged) {
    const first = segment.run.words[0].word;
    const last = segment.run.words[segment.run.words.length - 1].word;
    if (segment.start > first.start - guard) {
      segment.start = Math.max(0, first.start - guard);
      repairedEdges++;
    }
    if (segment.end < last.end + guard) {
      segment.end = Math.min(options.duration, last.end + guard);
      repairedEdges++;
    }
  }
  // ההרחבה עלולה ליצור חפיפה בין שכנים — פותרים בנקודת האמצע, שנשארת
  // מחוץ לשתי המילים כי הן לא חופפות מלכתחילה.
  for (let i = 1; i < merged.length; i++) {
    if (merged[i].start >= merged[i - 1].end) continue;
    const previousLast = merged[i - 1].run.words[merged[i - 1].run.words.length - 1].word.end;
    const nextFirst = merged[i].run.words[0].word.start;
    const middle = nextFirst > previousLast
      ? (previousLast + nextFirst) / 2
      : Math.max(merged[i - 1].end, merged[i].start);
    merged[i - 1].end = middle;
    merged[i].start = middle;
  }

  // תיקון הגבולות רץ *אחרי* המיזוג, ולכן הוא יכול לסגור פער לאפס. קאט
  // שלא מסיר כלום הוא הפסד נטו: גבול קידוד נוסף בלי שום רווח. מאחדים.
  const final: Placed[] = [];
  for (const segment of merged) {
    const previous = final[final.length - 1];
    if (previous && segment.start - previous.end < MIN_EFFECTIVE_CUT) {
      previous.end = Math.max(previous.end, segment.end);
      previous.run = { ...previous.run, words: [...previous.run.words, ...segment.run.words] };
      previous.measured ||= segment.measured;
      continue;
    }
    final.push({ ...segment });
  }
  merged.length = 0;
  merged.push(...final);

  const clips: Clip[] = [];
  const boundaries: CutBoundaryReport[] = [];
  for (let i = 0; i < merged.length; i++) {
    const segment = merged[i];
    const start = Math.max(0, segment.start);
    const end = Math.min(options.duration, segment.end);
    if (!(end - start >= minClipSec)) continue;
    clips.push({ id: uid(), sourceId: options.sourceId, start, end });
    const next = merged[i + 1];
    if (next) {
      const gapStart = end;
      const gapEnd = Math.min(options.duration, next.start);
      boundaries.push({
        clipIndex: clips.length - 1,
        sourceOut: end,
        nextSourceIn: gapEnd,
        removedSec: Math.max(0, gapEnd - gapStart),
        cutAboveFloorDb: segment.cutDb,
        measured: segment.measured,
        event: events.find((e) => e.start >= gapStart - 0.05 && e.end <= gapEnd + 0.05),
        reason: next.run.reason,
      });
    }
  }

  const keptSec = clips.reduce((sum, c) => sum + (c.end - c.start), 0);
  return {
    clips,
    alignment,
    missingScript: alignment.missingScript.map((i) => ({ scriptIndex: i, text: scriptTokens[i]?.raw ?? "" })),
    weakMatches: alignment.weakMatches.map((i) => ({ scriptIndex: i, text: scriptTokens[i]?.raw ?? "" })),
    removedSpeech,
    boundaries,
    events,
    keptSec,
    removedSec: Math.max(0, options.duration - keptSec),
    keptWords: kept.map((k) => ({ ...k.word, text: k.scriptToken.raw })),
    calibration,
    repairedEdges,
  };
}

export { describeCalibration };

/**
 * הידוק שקטים בלי סקריפט — כל הדיבור נשמר, רק הפערים מתהדקים.
 * משתמש באותם גבולות מדודים, כך שהתוצאה עקבית עם החיתוך לפי סקריפט.
 */
export function planSilenceTighten(
  words: Word[],
  options: ScriptCutOptions,
): ScriptCutPlan {
  const speechText = words.filter(isSpeechWord).map((w) => w.text).join(" ");
  return planScriptCut(words, speechText, { ...options, removeFillers: options.removeFillers === true });
}
