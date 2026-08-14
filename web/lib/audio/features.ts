// מדידת מעטפת אנרגיה ומאפיינים ספקטרליים — הבסיס למיקום חיתוך מדויק
// ולסיווג צלילים שאינם דיבור.
//
// המנתח הקודם עבד בחלונות RMS של 20ms בלי חפיפה, בלי החלקה ועם רצפת רעש
// גלובלית אחת. משמעות: (א) רזולוציית החיתוך 20ms — בדיוק ה"מילישנייה לפני או
// אחרי" שהמשתמש התלונן עליה; (ב) רצפה גלובלית לא מתאימה לשיעור שבו רעש החדר
// משתנה; (ג) אין שום מידע ספקטרלי, ולכן אי-אפשר להבחין בין נשימה לגרירת כיסא.
//
// כאן: חלונות 25ms עם קפיצה של 5ms (חפיפה 80%), חלון Hann, רצפת רעש נעה,
// ואינטרפולציה תת-מסגרתית. המאפיינים הספקטרליים מחושבים לפי דרישה בלבד
// (רק בפערים שבודקים), כדי לא לשלם FFT על כל השיעור.
//
// כל הפונקציות טהורות ופועלות על Float32Array — ניתנות לבדיקה בלי Web Audio.

export interface EnvelopeProfile {
  sampleRate: number;
  /** מרווח בין מסגרות בשניות. */
  hop: number;
  /** אורך חלון הניתוח בשניות. */
  win: number;
  frameCount: number;
  duration: number;
  /** עוצמת RMS ב-dBFS לכל מסגרת. */
  db: Float32Array;
  /** שיעור חציות-אפס מנורמל 0..1 — גבוה = צליל רועש/אוושתי. */
  zcr: Float32Array;
  /** רצפת רעש נעה (dBFS) לכל מסגרת. */
  floor: Float32Array;
  globalFloorDb: number;
  globalPeakDb: number;
}

export interface EnvelopeOptions {
  hopSec?: number;
  winSec?: number;
  /** אורך החלון (שניות) לחישוב רצפת רעש נעה. */
  floorWindowSec?: number;
  /** אחוזון לרצפת הרעש בתוך החלון הנע. */
  floorPercentile?: number;
}

export const ENVELOPE_DEFAULTS: Required<EnvelopeOptions> = {
  hopSec: 0.005,
  winSec: 0.025,
  floorWindowSec: 3,
  floorPercentile: 0.12,
};

const SILENCE_DB = -100;

function hann(size: number): Float32Array {
  const w = new Float32Array(size);
  for (let i = 0; i < size; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1 || 1));
  return w;
}

/** מעטפת אנרגיה על כל האות. עלות: O(samples) — בלי FFT. */
export function computeEnvelope(
  samples: Float32Array,
  sampleRate: number,
  options: EnvelopeOptions = {},
): EnvelopeProfile {
  const opts = { ...ENVELOPE_DEFAULTS, ...options };
  const hopSamples = Math.max(1, Math.round(sampleRate * opts.hopSec));
  const winSamples = Math.max(hopSamples, Math.round(sampleRate * opts.winSec));
  const frameCount = samples.length >= winSamples
    ? Math.floor((samples.length - winSamples) / hopSamples) + 1
    : (samples.length > 0 ? 1 : 0);

  const db = new Float32Array(frameCount);
  const zcr = new Float32Array(frameCount);
  const window = hann(winSamples);

  for (let f = 0; f < frameCount; f++) {
    const from = f * hopSamples;
    const to = Math.min(samples.length, from + winSamples);
    let energy = 0;
    let weight = 0;
    let crossings = 0;
    let previous = 0;
    for (let i = from; i < to; i++) {
      const w = window[i - from];
      const v = samples[i];
      energy += v * v * w;
      weight += w;
      if (i > from && ((v >= 0 && previous < 0) || (v < 0 && previous >= 0))) crossings++;
      previous = v;
    }
    const rms = weight > 0 ? Math.sqrt(energy / weight) : 0;
    db[f] = rms > 0 ? Math.max(SILENCE_DB, 20 * Math.log10(rms)) : SILENCE_DB;
    zcr[f] = to > from + 1 ? crossings / (to - from - 1) : 0;
  }

  const floor = rollingPercentile(db, Math.max(1, Math.round(opts.floorWindowSec / opts.hopSec)), opts.floorPercentile);
  const sorted = Float32Array.from(db).sort();
  const globalFloorDb = frameCount ? sorted[Math.floor(frameCount * 0.12)] : -60;
  const globalPeakDb = frameCount ? sorted[Math.min(frameCount - 1, Math.floor(frameCount * 0.95))] : -10;

  return {
    sampleRate,
    hop: opts.hopSec,
    win: opts.winSec,
    frameCount,
    duration: samples.length / sampleRate,
    db,
    zcr,
    floor,
    globalFloorDb,
    globalPeakDb,
  };
}

/**
 * אחוזון בחלון נע. מימוש דגימתי (צעד לפי 1/8 חלון) — הפרש זניח מול
 * חישוב מלא, ומונע O(n·w) על שיעור באורך עשר דקות.
 */
export function rollingPercentile(values: Float32Array, windowFrames: number, percentile: number): Float32Array {
  const n = values.length;
  const out = new Float32Array(n);
  if (!n) return out;
  const half = Math.max(1, windowFrames >> 1);
  const step = Math.max(1, half >> 2);
  const anchors: number[] = [];
  const anchorValues: number[] = [];
  const scratch: number[] = [];
  for (let center = 0; center < n; center += step) {
    const from = Math.max(0, center - half);
    const to = Math.min(n, center + half);
    scratch.length = 0;
    for (let i = from; i < to; i++) scratch.push(values[i]);
    scratch.sort((a, b) => a - b);
    anchors.push(center);
    anchorValues.push(scratch[Math.min(scratch.length - 1, Math.floor(scratch.length * percentile))]);
  }
  // אינטרפולציה לינארית בין העוגנים
  let slot = 0;
  for (let i = 0; i < n; i++) {
    while (slot + 1 < anchors.length && anchors[slot + 1] <= i) slot++;
    if (slot + 1 >= anchors.length) { out[i] = anchorValues[slot]; continue; }
    const span = anchors[slot + 1] - anchors[slot];
    const t = span > 0 ? (i - anchors[slot]) / span : 0;
    out[i] = anchorValues[slot] + (anchorValues[slot + 1] - anchorValues[slot]) * t;
  }
  return out;
}

export function frameAt(profile: EnvelopeProfile, seconds: number): number {
  return Math.max(0, Math.min(profile.frameCount - 1, Math.round(seconds / profile.hop)));
}

export function timeAt(profile: EnvelopeProfile, frame: number): number {
  return frame * profile.hop + profile.win / 2;
}

/** עוצמה ב-dB בזמן נתון, עם אינטרפולציה לינארית בין מסגרות. */
export function dbAt(profile: EnvelopeProfile, seconds: number): number {
  if (!profile.frameCount) return SILENCE_DB;
  const exact = (seconds - profile.win / 2) / profile.hop;
  const low = Math.floor(exact);
  if (low < 0) return profile.db[0];
  if (low >= profile.frameCount - 1) return profile.db[profile.frameCount - 1];
  const t = exact - low;
  return profile.db[low] * (1 - t) + profile.db[low + 1] * t;
}

export function floorAt(profile: EnvelopeProfile, seconds: number): number {
  if (!profile.frameCount) return -60;
  return profile.floor[frameAt(profile, seconds)];
}

/** עוצמה ממוצעת בטווח (ממוצע אנרגטי, לא ממוצע דציבלים). */
export function meanDb(profile: EnvelopeProfile, start: number, end: number): number {
  const from = frameAt(profile, start);
  const to = frameAt(profile, end);
  if (to <= from) return dbAt(profile, start);
  let energy = 0;
  for (let i = from; i <= to; i++) energy += Math.pow(10, profile.db[i] / 10);
  return 10 * Math.log10(energy / (to - from + 1) + 1e-12);
}

export function peakDb(profile: EnvelopeProfile, start: number, end: number): number {
  const from = frameAt(profile, start);
  const to = frameAt(profile, end);
  let peak = SILENCE_DB;
  for (let i = from; i <= to; i++) if (profile.db[i] > peak) peak = profile.db[i];
  return peak;
}

// ─── מאפיינים ספקטרליים (לפי דרישה) ──────────────────────────────────────────

export interface SpectralFeatures {
  /** מרכז כובד ספקטרלי (Hz) — נמוך=רעם/חבטה, גבוה=אוושה/נשיפה. */
  centroid: number;
  /** שטיחות ספקטרלית 0..1 — גבוה=רעש לבן (נשימה), נמוך=צליל מוטעם (קול). */
  flatness: number;
  /** התדר שמתחתיו 85% מהאנרגיה. */
  rolloff: number;
  /** חלק האנרגיה בפס 0–300Hz. */
  lowRatio: number;
  /** חלק האנרגיה בפס 300–3400Hz (פס הדיבור). */
  midRatio: number;
  /** חלק האנרגיה מעל 3400Hz. */
  highRatio: number;
  /**
   * חדות ההתקפה: העלייה החדה ביותר באנרגיה הכוללת בין מסגרות סמוכות,
   * מנורמלת לשיא. 0 = עולה בהדרגה, 1 = קופץ ממש.
   *
   * לא שטף ספקטרלי. שטף מודד שינוי *לכל תא תדר*, ולכן רעש רחב-פס מקבל
   * ערך גבוה גם בלי שום התקפה — הספקטרום שלו משתנה אקראית בכל מסגרת.
   * נשימה היא רעש, ולכן נמדדה כ"התקפה חדה" ונפסלה מלהיות נשימה.
   */
  attack: number;
  /** קצב אפנון המעטפת (Hz) — צחוק מאופנן ב-3..8Hz. */
  modulationHz: number;
}

/** FFT רדיקס-2 במקום (in-place), על מערכי ממשי/מדומה. */
export function fftRadix2(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const aRe = re[i + k], aIm = im[i + k];
        const bRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const bIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k] = aRe + bRe; im[i + k] = aIm + bIm;
        re[i + k + len / 2] = aRe - bRe; im[i + k + len / 2] = aIm - bIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

function nextPow2(value: number): number {
  let n = 1;
  while (n < value) n <<= 1;
  return n;
}

/**
 * מאפיינים ספקטרליים ממוצעים על טווח זמן. מחשב FFT רק על הטווח המבוקש,
 * ולכן זול מספיק להרצה על כל פער בין-מילים בשיעור שלם.
 */
export function computeSpectral(
  samples: Float32Array,
  sampleRate: number,
  start: number,
  end: number,
  options: { winSec?: number; hopSec?: number } = {},
): SpectralFeatures | null {
  const winSec = options.winSec ?? 0.025;
  const hopSec = options.hopSec ?? 0.01;
  const from = Math.max(0, Math.floor(start * sampleRate));
  const to = Math.min(samples.length, Math.ceil(end * sampleRate));
  const winSamples = Math.round(winSec * sampleRate);
  const hopSamples = Math.max(1, Math.round(hopSec * sampleRate));
  if (to - from < winSamples) return null;

  const fftSize = nextPow2(winSamples);
  const bins = fftSize >> 1;
  const window = hann(winSamples);
  const re = new Float32Array(fftSize);
  const im = new Float32Array(fftSize);
  const magnitude = new Float32Array(bins);

  let frames = 0;
  let centroidSum = 0, flatnessSum = 0, rolloffSum = 0;
  let lowSum = 0, midSum = 0, highSum = 0;
  const envelope: number[] = [];

  for (let offset = from; offset + winSamples <= to; offset += hopSamples) {
    re.fill(0); im.fill(0);
    for (let i = 0; i < winSamples; i++) re[i] = samples[offset + i] * window[i];
    fftRadix2(re, im);

    let total = 0, weighted = 0, logSum = 0;
    let low = 0, mid = 0, high = 0;
    for (let b = 1; b < bins; b++) {
      const mag = Math.sqrt(re[b] * re[b] + im[b] * im[b]);
      magnitude[b] = mag;
      const hz = (b * sampleRate) / fftSize;
      total += mag;
      weighted += mag * hz;
      logSum += Math.log(mag + 1e-10);
      if (hz < 300) low += mag;
      else if (hz < 3400) mid += mag;
      else high += mag;
    }
    if (total <= 1e-9) continue;

    frames++;
    centroidSum += weighted / total;
    const geometric = Math.exp(logSum / (bins - 1));
    flatnessSum += geometric / (total / (bins - 1));
    let cumulative = 0;
    let rolloffHz = 0;
    for (let b = 1; b < bins; b++) {
      cumulative += magnitude[b];
      if (cumulative >= total * 0.85) { rolloffHz = (b * sampleRate) / fftSize; break; }
    }
    rolloffSum += rolloffHz;
    lowSum += low / total;
    midSum += mid / total;
    highSum += high / total;
    envelope.push(total);
  }

  if (!frames) return null;
  return {
    attack: envelopeAttack(envelope),
    centroid: centroidSum / frames,
    flatness: flatnessSum / frames,
    rolloff: rolloffSum / frames,
    lowRatio: lowSum / frames,
    midRatio: midSum / frames,
    highRatio: highSum / frames,
    modulationHz: modulationRate(envelope, 1 / hopSec),
  };
}

/**
 * חדות ההתקפה מתוך מעטפת האנרגיה: העלייה החדה ביותר בין מסגרות סמוכות
 * ביחס לשיא. חסין לרעש רחב-פס, בשונה משטף ספקטרלי.
 */
export function envelopeAttack(envelope: number[]): number {
  if (envelope.length < 3) return 0;
  // החלקה על שלוש מסגרות: אנרגיית רעש רחב-פס מרצדת אקראית בין מסגרות,
  // ובלי החלקה הריצוד הזה נראה כמו התקפה חדה.
  const smooth: number[] = [];
  for (let i = 0; i < envelope.length; i++) {
    const a = envelope[Math.max(0, i - 1)];
    const b = envelope[i];
    const c = envelope[Math.min(envelope.length - 1, i + 1)];
    smooth.push((a + b + c) / 3);
  }
  const peak = Math.max(...smooth);
  if (peak <= 0) return 0;
  // גם עלייה חדה וגם דעיכה חדה מעידות על טרנזיינט. חבטה שמתחילה בשיא
  // ממש בתחילת החלון אין לה עלייה נמדדת בכלל — רק נפילה.
  let sharpest = 0;
  for (let i = 1; i < smooth.length; i++) {
    const delta = Math.abs(smooth[i] - smooth[i - 1]);
    if (delta > sharpest) sharpest = delta;
  }
  return Math.max(0, Math.min(1, sharpest / peak));
}

/** קצב אפנון המעטפת — סופר חציות של הממוצע כלפי מעלה. */
export function modulationRate(envelope: number[], frameRate: number): number {
  if (envelope.length < 4) return 0;
  const mean = envelope.reduce((sum, v) => sum + v, 0) / envelope.length;
  if (mean <= 0) return 0;
  let crossings = 0;
  for (let i = 1; i < envelope.length; i++) {
    if (envelope[i - 1] <= mean && envelope[i] > mean) crossings++;
  }
  const seconds = envelope.length / frameRate;
  return seconds > 0 ? crossings / seconds : 0;
}
