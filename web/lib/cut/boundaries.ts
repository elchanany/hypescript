// מיקום מדויק של נקודות החיתוך.
//
// חותמות הזמן של מנועי התמלול אינן גבולות אקוסטיים: הן נוטות להקדים תחילת
// מילה ולאחר את סופה בעשרות מילישניות, והדיוק שלהן הוא ברמת ההברה. חיתוך
// ישיר לפיהן מייצר בדיוק את מה שהמשתמש שמע — קאט "מילישנייה לפני או אחרי",
// ולפעמים הברה קטועה.
//
// כאן מזיזים כל גבול אל האירוע האקוסטי האמיתי הקרוב אליו:
//   כניסה  — הרגע שבו האנרגיה עולה מעל סף הדיבור ונשארת מעליו.
//   יציאה  — הרגע שבו האנרגיה יורדת מתחת לסף ונשארת מתחתיו (כולל דעיכת העיצור).
//   מעבר   — הנקודה השקטה ביותר בעמק שבין שני קטעים שנשמרים.
// כל שלושתם עוברים אינטרפולציה תת-מסגרתית, ולכן הרזולוציה אינה מוגבלת
// לרשת המסגרות.

import { EnvelopeProfile, dbAt } from "@/lib/audio/features";

export interface BoundaryOptions {
  /** סף דיבור מעל רצפת הרעש המקומית. */
  speechMarginDb?: number;
  /**
   * סף "דיבור רך" — עיצורים שוקקים (ש/ס/ה/פ) ודעיכת סוף מילה נמצאים הרבה
   * מתחת לסף הדיבור הרגיל. אחרי איתור החצייה מרחיבים את הגבול כל עוד
   * האנרגיה מעל הסף הזה, אחרת נחתכת תחילת/סוף ההברה.
   */
  softMarginDb?: number;
  /** כמה אחורה מותר לחפש כניסה אמיתית. */
  onsetSearchSec?: number;
  /** כמה קדימה מותר לחפש יציאה אמיתית. */
  offsetSearchSec?: number;
  /** אוויר לפני הכניסה. */
  preRollSec?: number;
  /** אוויר אחרי היציאה — חייב לכלול את דעיכת העיצור האחרון. */
  postRollSec?: number;
  /** כמה זמן ברציפות צריך להישאר מתחת לסף כדי להיחשב סוף דיבור. */
  sustainSec?: number;
}

export const BOUNDARY_DEFAULTS: Required<BoundaryOptions> = {
  speechMarginDb: 9,
  softMarginDb: 3,
  onsetSearchSec: 0.3,
  offsetSearchSec: 0.35,
  preRollSec: 0.035,
  postRollSec: 0.06,
  sustainSec: 0.05,
};

export interface RefinedBoundary {
  /** הזמן הסופי לחיתוך (כולל pre/post roll). */
  time: number;
  /** הגבול האקוסטי עצמו, לפני ה-roll. */
  acousticTime: number;
  /** מרחק מהחותמת המקורית של התמלול — לדיווח QA. */
  shiftSec: number;
  /** true אם נמצא גבול אקוסטי; false = נשארנו על חותמת התמלול. */
  measured: boolean;
}

const clampTime = (value: number, duration: number) => Math.max(0, Math.min(duration, value));

/** חוצה מדויקת של הסף בין שתי מסגרות סמוכות (אינטרפולציה לינארית ב-dB). */
function crossingTime(profile: EnvelopeProfile, frame: number, threshold: number): number {
  const a = profile.db[frame];
  const b = profile.db[frame + 1];
  const base = frame * profile.hop + profile.win / 2;
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return base;
  const t = (threshold - a) / (b - a);
  if (t < 0 || t > 1) return base;
  return base + t * profile.hop;
}

function frameIndex(profile: EnvelopeProfile, seconds: number): number {
  return Math.max(0, Math.min(profile.frameCount - 1, Math.round((seconds - profile.win / 2) / profile.hop)));
}

/**
 * מוצא את תחילת הדיבור האמיתית סביב חותמת התמלול.
 * סורק אחורה מהחותמת ומחפש את החצייה האחרונה מלמטה למעלה מעל סף הדיבור.
 */
export function refineOnset(
  profile: EnvelopeProfile,
  wordStart: number,
  options: BoundaryOptions = {},
): RefinedBoundary {
  const opts = { ...BOUNDARY_DEFAULTS, ...options };
  const fallback = {
    time: clampTime(wordStart - opts.preRollSec, profile.duration),
    acousticTime: wordStart,
    shiftSec: 0,
    measured: false,
  };
  if (!profile.frameCount) return fallback;

  const earliest = frameIndex(profile, wordStart - opts.onsetSearchSec);
  const latest = frameIndex(profile, wordStart + opts.onsetSearchSec * 0.4);
  const sustainFrames = Math.max(1, Math.round(opts.sustainSec / profile.hop));

  // מרגע העוגן אחורה: החצייה האחרונה שאחריה האנרגיה נשארת מעל הסף
  for (let i = Math.min(latest, profile.frameCount - 2); i >= earliest; i--) {
    const threshold = profile.floor[i] + opts.speechMarginDb;
    if (profile.db[i] >= threshold) continue;
    let sustained = true;
    for (let k = 1; k <= sustainFrames && i + k <= latest; k++) {
      if (profile.db[i + k] < profile.floor[i + k] + opts.speechMarginDb) { sustained = false; break; }
    }
    if (!sustained) continue;
    // הרחבה אחורה על "דיבור רך" — עיצור שוקק שנמצא מתחת לסף הראשי
    let soft = i;
    while (soft > earliest && profile.db[soft] >= profile.floor[soft] + opts.softMarginDb) soft--;
    const threshFrame = soft < i ? soft : i;
    const acoustic = crossingTime(
      profile,
      threshFrame,
      profile.floor[threshFrame] + (soft < i ? opts.softMarginDb : opts.speechMarginDb),
    );
    return {
      time: clampTime(acoustic - opts.preRollSec, profile.duration),
      acousticTime: acoustic,
      shiftSec: acoustic - wordStart,
      measured: true,
    };
  }
  return fallback;
}

/**
 * מוצא את סוף הדיבור האמיתי — כולל הדעיכה של העיצור האחרון.
 * זה מה שמונע את הקטיעה של מילת סיום ("...אמן" שנחתך ל"...אמ").
 */
export function refineOffset(
  profile: EnvelopeProfile,
  wordEnd: number,
  options: BoundaryOptions = {},
): RefinedBoundary {
  const opts = { ...BOUNDARY_DEFAULTS, ...options };
  const fallback = {
    time: clampTime(wordEnd + opts.postRollSec, profile.duration),
    acousticTime: wordEnd,
    shiftSec: 0,
    measured: false,
  };
  if (!profile.frameCount) return fallback;

  const earliest = frameIndex(profile, wordEnd - opts.offsetSearchSec * 0.4);
  const latest = frameIndex(profile, wordEnd + opts.offsetSearchSec);
  const sustainFrames = Math.max(1, Math.round(opts.sustainSec / profile.hop));

  for (let i = earliest; i < Math.min(latest, profile.frameCount - 1); i++) {
    const threshold = profile.floor[i] + opts.speechMarginDb;
    if (profile.db[i] >= threshold) continue;
    let sustained = true;
    for (let k = 1; k <= sustainFrames && i + k < profile.frameCount; k++) {
      if (profile.db[i + k] >= profile.floor[i + k] + opts.speechMarginDb) { sustained = false; break; }
    }
    if (!sustained) continue;
    // הרחבה קדימה על הדעיכה — כך "אמן" לא נחתך ל"אמ"
    let soft = i;
    while (soft < profile.frameCount - 1 && profile.db[soft] >= profile.floor[soft] + opts.softMarginDb) soft++;
    const threshFrame = Math.max(0, (soft > i ? soft : i) - 1);
    const acoustic = crossingTime(
      profile,
      threshFrame,
      profile.floor[threshFrame] + (soft > i ? opts.softMarginDb : opts.speechMarginDb),
    );
    return {
      time: clampTime(acoustic + opts.postRollSec, profile.duration),
      acousticTime: acoustic,
      shiftSec: acoustic - wordEnd,
      measured: true,
    };
  }
  return fallback;
}

export interface Valley {
  /** הנקודה השקטה ביותר בטווח. */
  center: number;
  start: number;
  end: number;
  /** dB בנקודה השקטה ביותר. */
  db: number;
  floorDb: number;
  /** כמה dB מעל רצפת הרעש — קטן = עמק אמיתי. */
  aboveFloorDb: number;
}

/**
 * מאתר את עמק השקט העמוק ביותר בטווח נתון. משתמשים בו כדי למקם קאט בין
 * שני קטעים שנשמרים — הקאט נשמע נקי רק כשהוא באמת בתחתית העמק.
 */
export function findValley(profile: EnvelopeProfile, from: number, to: number): Valley | null {
  if (!profile.frameCount || to <= from) return null;
  const first = frameIndex(profile, from);
  const last = frameIndex(profile, to);
  if (last <= first) {
    const db = dbAt(profile, (from + to) / 2);
    const floorDb = profile.floor[first];
    return { center: (from + to) / 2, start: from, end: to, db, floorDb, aboveFloorDb: db - floorDb };
  }

  // החלקה קצרה כדי לא לבחור מסגרת בודדת רועשת/שקטה במקרה
  const smoothRadius = 1;
  let bestFrame = first;
  let bestValue = Infinity;
  for (let i = first; i <= last; i++) {
    let sum = 0, count = 0;
    for (let k = -smoothRadius; k <= smoothRadius; k++) {
      const j = i + k;
      if (j < first || j > last) continue;
      sum += profile.db[j]; count++;
    }
    const value = sum / Math.max(1, count);
    if (value < bestValue) { bestValue = value; bestFrame = i; }
  }

  const floorDb = profile.floor[bestFrame];
  const quietThreshold = Math.max(bestValue + 3, floorDb + 4);
  let start = bestFrame;
  while (start > first && profile.db[start - 1] <= quietThreshold) start--;
  let end = bestFrame;
  while (end < last && profile.db[end + 1] <= quietThreshold) end++;

  const toTime = (frame: number) => frame * profile.hop + profile.win / 2;
  return {
    center: toTime(bestFrame),
    start: Math.max(from, toTime(start)),
    end: Math.min(to, toTime(end)),
    db: bestValue,
    floorDb,
    aboveFloorDb: bestValue - floorDb,
  };
}

export interface JoinPoint {
  /** סוף הקטע הקודם. */
  outPoint: number;
  /** תחילת הקטע הבא. */
  inPoint: number;
  /** עומק העמק שנבחר, במקרה שנמצא. */
  valley: Valley | null;
  /** true כשהחיתוך ממוקם בעמק מדוד ולא רק על חותמת התמלול. */
  measured: boolean;
}

/**
 * בוחר את נקודות היציאה/כניסה בין שתי מילים שנשמרות ובין שני קטעים שנשמרים.
 * שומר על אוויר משני צדי העמק, ולעולם לא חוצה את גבולות הדיבור עצמם.
 */
export function chooseJoinPoint(
  profile: EnvelopeProfile | null,
  previousWordEnd: number,
  nextWordStart: number,
  options: BoundaryOptions = {},
): JoinPoint {
  const opts = { ...BOUNDARY_DEFAULTS, ...options };
  if (!profile || !profile.frameCount || nextWordStart <= previousWordEnd) {
    return {
      outPoint: previousWordEnd + opts.postRollSec,
      inPoint: Math.max(previousWordEnd + opts.postRollSec, nextWordStart - opts.preRollSec),
      valley: null,
      measured: false,
    };
  }

  const offset = refineOffset(profile, previousWordEnd, opts);
  const onset = refineOnset(profile, nextWordStart, opts);
  const gapStart = Math.min(offset.acousticTime, nextWordStart);
  const gapEnd = Math.max(onset.acousticTime, previousWordEnd);
  const valley = gapEnd > gapStart ? findValley(profile, gapStart, gapEnd) : null;

  let outPoint = offset.time;
  let inPoint = onset.time;
  if (valley && valley.aboveFloorDb <= opts.speechMarginDb) {
    // יש עמק אמיתי — מהדקים אליו את שני הצדדים בלי לחתוך דיבור
    outPoint = Math.max(offset.acousticTime, Math.min(offset.time, valley.start + opts.postRollSec * 0.5));
    inPoint = Math.min(onset.acousticTime, Math.max(onset.time, valley.end - opts.preRollSec * 0.5));
  }
  if (inPoint < outPoint) {
    const middle = valley ? valley.center : (outPoint + inPoint) / 2;
    outPoint = middle;
    inPoint = middle;
  }
  return {
    outPoint: clampTime(outPoint, profile.duration),
    inPoint: clampTime(inPoint, profile.duration),
    valley,
    measured: offset.measured || onset.measured || !!valley,
  };
}
