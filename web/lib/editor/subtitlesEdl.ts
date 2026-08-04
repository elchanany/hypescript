// ייצור כתוביות SRT מ-EDL (על ציר-הזמן הסופי), בלי צריבה לסרטון — כדי להכניס
// ל-CapCut ולשנות גופן/מיקום שם. תומך בסדר/חזרות של הקליפים.
//
// ברירת מחדל: חשיפה מצטברת לפי קצב הדיבור (מילה נוספת כשהיא נאמרת),
// עם שבירת ביטוי בפאוזה/פיסוק — לא בלוק אחד של כל המילים מראש.

import { getOpcodes, normalizeHebrew } from "@/lib/align";
import { Clip, clipDur, uid } from "./model";
import { buildSrt, Cue } from "@/lib/subtitles";
import { assembleTranscript, type WordsBySource as AssembleWordsBySource } from "./assembleTranscript";

const RLM = "‏";
const PHRASE_END = /[.?!…׃:,،;]$/;

// כתובית הניתנת לעריכה (על ציר-הזמן הסופי) + טרנספורם אופציונלי על הקנבס.
// כשאין x/y/w — המיקום נגזר מ-CaptionStyle.position של הפרויקט.
export interface Sub {
  id: string;
  start: number;
  end: number;
  text: string;
  /** Center X in project px (optional override). */
  x?: number;
  /** Center Y in project px (optional override). */
  y?: number;
  /** Text box width in project px. */
  w?: number;
  /** Uniform scale multiplier (1 = 100%). */
  scale?: number;
  /** Degrees clockwise. */
  rotation?: number;
}

export type CaptionMode = "progressive" | "phrase";

export interface CaptionBuildOpts {
  maxChars?: number;
  /** progressive = מילה מצטברת לפי דיבור (ברירת מחדל); phrase = בלוק שלם לביטוי */
  mode?: CaptionMode;
  /** פאוזה (שנ') ששוברת ביטוי חדש */
  maxGap?: number;
}

const DEFAULT_MAX_CHARS = 28;
const DEFAULT_MAX_GAP = 0.45;

export function edlToSubs(clips: Clip[], getWords: WordsBySource, maxChars = DEFAULT_MAX_CHARS, opts?: CaptionBuildOpts): Sub[] {
  return edlToCues(clips, getWords, maxChars, opts).map((c) => ({ id: uid("s"), ...c }));
}

/** כתוביות עם טקסט נקי מסקריפט המשתמש + תזמונים מהתמלול (מתקן שיבושי ASR). */
export function edlToSubsWithScript(
  clips: Clip[],
  getWords: WordsBySource,
  scriptText: string,
  maxChars = DEFAULT_MAX_CHARS,
  opts?: CaptionBuildOpts,
): Sub[] {
  return edlToCuesWithScript(clips, getWords, scriptText, maxChars, opts).map((c) => ({ id: uid("s"), ...c }));
}

export function subsToSrt(subs: Sub[]): string {
  return buildSrt(subs.map((s) => ({ start: s.start, end: s.end, text: s.text })));
}

// פירוק קובץ SRT לרשימת כתוביות ניתנות לעריכה (לייבוא).
export function parseSrt(text: string): Sub[] {
  const toSec = (t: string) => {
    const m = t.trim().match(/(\d+):(\d+):(\d+)[,.](\d+)/);
    if (!m) return 0;
    return +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000;
  };
  const out: Sub[] = [];
  for (const block of text.replace(/\r/g, "").split(/\n\n+/)) {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    if (!lines.length) continue;
    const timeIdx = lines.findIndex((l) => l.includes("-->"));
    if (timeIdx < 0) continue;
    const [a, b] = lines[timeIdx].split("-->");
    const body = lines.slice(timeIdx + 1).join("\n").trim();
    if (body) out.push({ id: uid("s"), start: toSec(a), end: toSec(b), text: body });
  }
  return out;
}

// מקבל טקסט לכל מקור בנפרד — קריטי לרצף רב-מקורי: כל קליפ מקבל כתוביות
// מהתמלול של *המקור שלו*, לא מתמלול גלובלי אחד.
export type WordsBySource = AssembleWordsBySource;

function endsPhrase(text: string | undefined): boolean {
  if (!text) return false;
  return PHRASE_END.test(text.trimEnd());
}

type TimedTok = { text: string; start: number; end: number };

function assembledWords(clips: Clip[], getWords: WordsBySource): TimedTok[] {
  // משתמש באותו מיפוי כמו assembleTranscript (כולל gaps/disabled)
  return assembleTranscript(clips, getWords).map((w) => ({
    text: w.text,
    start: w.start,
    end: w.end,
  }));
}

/** מפצל לביטויים לפי פאוזה / פיסוק / תקציב תווים. */
export function splitPhrases(words: TimedTok[], maxChars: number, maxGap: number): TimedTok[][] {
  const phrases: TimedTok[][] = [];
  let cur: TimedTok[] = [];
  let chars = 0;
  for (const w of words) {
    const gap = cur.length ? w.start - cur[cur.length - 1].end : 0;
    const overBudget = cur.length > 0 && chars + 1 + w.text.length > maxChars;
    if (cur.length && (gap > maxGap || endsPhrase(cur[cur.length - 1].text) || overBudget)) {
      phrases.push(cur);
      cur = [];
      chars = 0;
    }
    cur.push(w);
    chars += (chars ? 1 : 0) + w.text.length;
  }
  if (cur.length) phrases.push(cur);
  return phrases;
}

function sealCueEdges(cues: Cue[]): Cue[] {
  if (cues.length < 2) return cues;
  const out = cues.map((c) => ({ ...c }));
  for (let i = 0; i < out.length - 1; i++) {
    const gap = out[i + 1].start - out[i].end;
    if (gap < 0) {
      // חפיפה — קוצרים את הקודם
      out[i].end = out[i + 1].start;
    } else if (gap > 0 && gap < 0.35) {
      // פער קטן — מאריכים כדי שמילים לא "יברחו" בין כתוביות
      out[i].end = out[i + 1].start;
    }
    if (out[i].end <= out[i].start) out[i].end = out[i].start + 0.12;
  }
  const last = out[out.length - 1];
  if (last.end <= last.start) last.end = last.start + 0.25;
  return out;
}

/**
 * חשיפה מצטברת לפי קצב דיבור: בתוך ביטוי מופיעה מילה נוספת כשהיא נאמרת.
 * בין ביטויים (פאוזה/פיסוק) מתחילים מחדש.
 */
export function progressiveCues(words: TimedTok[], maxChars: number, maxGap: number): Cue[] {
  const phrases = splitPhrases(words, maxChars, maxGap);
  const cues: Cue[] = [];
  for (const phrase of phrases) {
    for (let i = 0; i < phrase.length; i++) {
      const start = phrase[i].start;
      const end = i + 1 < phrase.length
        ? Math.max(start + 0.08, phrase[i + 1].start)
        : Math.max(start + 0.25, phrase[i].end + 0.12);
      cues.push({
        start,
        end,
        text: RLM + phrase.slice(0, i + 1).map((w) => w.text).join(" "),
      });
    }
  }
  return sealCueEdges(cues);
}

/** בלוק שלם לכל ביטוי (ללא חשיפה מילה-מילה). */
export function phraseCues(words: TimedTok[], maxChars: number, maxGap: number): Cue[] {
  const phrases = splitPhrases(words, maxChars, maxGap);
  const cues: Cue[] = phrases.map((p) => ({
    start: p[0].start,
    end: Math.max(p[0].start + 0.2, p[p.length - 1].end + 0.08),
    text: RLM + p.map((w) => w.text).join(" "),
  }));
  return sealCueEdges(cues);
}

function timedToCues(words: TimedTok[], maxChars: number, opts?: CaptionBuildOpts): Cue[] {
  if (!words.length) return [];
  const gap = opts?.maxGap ?? DEFAULT_MAX_GAP;
  const mode = opts?.mode ?? "progressive";
  return mode === "phrase"
    ? phraseCues(words, maxChars, gap)
    : progressiveCues(words, maxChars, gap);
}

export function edlToCues(clips: Clip[], getWords: WordsBySource, maxChars = DEFAULT_MAX_CHARS, opts?: CaptionBuildOpts): Cue[] {
  return timedToCues(assembledWords(clips, getWords), maxChars, opts);
}

/**
 * מיישר תמלול-ASR לסקריפט נקי (LCS): משאיר תזמונים מה-ASR, מחליף טקסט בסקריפט.
 * כך "טיפרת"/"קשר" וכו' הופכים לטקסט שהמשתמש כתב ("תפארת"/"כשר").
 */
export function edlToCuesWithScript(
  clips: Clip[],
  getWords: WordsBySource,
  scriptText: string,
  maxChars = DEFAULT_MAX_CHARS,
  opts?: CaptionBuildOpts,
): Cue[] {
  const asr = assembledWords(clips, getWords);
  const scriptToks = scriptText.split(/\s+/).map((t) => t.trim()).filter(Boolean)
    .map((raw) => ({ raw, norm: normalizeHebrew(raw) })).filter((t) => t.norm);
  if (!asr.length || !scriptToks.length) return edlToCues(clips, getWords, maxChars, opts);

  const asrNorm = asr.map((w) => normalizeHebrew(w.text));
  const scriptNorm = scriptToks.map((t) => t.norm);
  const ops = getOpcodes(asrNorm, scriptNorm);
  const polished: TimedTok[] = [];

  for (const op of ops) {
    if (op.tag === "equal" || op.tag === "replace") {
      const asrSlice = asr.slice(op.a1, op.a2);
      const scriptSlice = scriptToks.slice(op.b1, op.b2);
      if (!scriptSlice.length) continue; // מחיקת זבל ASR שלא בסקריפט
      if (!asrSlice.length) {
        const t = polished.length ? polished[polished.length - 1].end : 0;
        for (const s of scriptSlice) polished.push({ text: s.raw, start: t, end: t + 0.18 });
        continue;
      }
      const t0 = asrSlice[0].start;
      const t1 = Math.max(t0 + 0.05, asrSlice[asrSlice.length - 1].end);
      const n = scriptSlice.length;
      for (let i = 0; i < n; i++) {
        // פיזור אחיד רק כשיש אי-התאמת ספירה; אחרת שומרים זמן ASR 1:1
        if (n === asrSlice.length) {
          polished.push({
            text: scriptSlice[i].raw,
            start: asrSlice[i].start,
            end: Math.max(asrSlice[i].start + 0.05, asrSlice[i].end),
          });
        } else {
          const s = t0 + ((t1 - t0) * i) / n;
          const e = t0 + ((t1 - t0) * (i + 1)) / n;
          polished.push({ text: scriptSlice[i].raw, start: s, end: Math.max(s + 0.05, e) });
        }
      }
    } else if (op.tag === "insert") {
      const scriptSlice = scriptToks.slice(op.b1, op.b2);
      const anchor = polished.length
        ? polished[polished.length - 1].end
        : (asr[Math.min(op.a1, asr.length - 1)]?.start ?? 0);
      // מחלקים את משך ה"חור" הבא אם אפשר, אחרת 0.18 שנ' למילה
      const nextAsr = asr[Math.min(op.a2, asr.length - 1)];
      const slot = nextAsr && nextAsr.start > anchor
        ? Math.max(0.12, (nextAsr.start - anchor) / Math.max(1, scriptSlice.length))
        : 0.18;
      let t = anchor;
      for (const s of scriptSlice) {
        polished.push({ text: s.raw, start: t, end: t + slot });
        t += slot;
      }
    }
    // delete = מילות ASR עודפות — נזרקות
  }
  return polished.length ? timedToCues(polished, maxChars, opts) : edlToCues(clips, getWords, maxChars, opts);
}

export function edlToSrt(clips: Clip[], getWords: WordsBySource, maxChars = DEFAULT_MAX_CHARS, opts?: CaptionBuildOpts): string {
  return buildSrt(edlToCues(clips, getWords, maxChars, opts));
}

/**
 * לצריבת PNG: אם יש יותר מדי cues מצטברים — מקפלים לביטוי סופי (הטקסט המלא של כל שרשרת).
 * התצוגה המקדימה ו-SRT נשארים progressive.
 */
export function collapseProgressiveForBurn(subs: Sub[], maxCues = 200): Sub[] {
  if (subs.length <= maxCues) return subs;
  const strip = (t: string) => t.replace(/\u200F/g, "").trim();
  const out: Sub[] = [];
  let i = 0;
  while (i < subs.length) {
    let j = i;
    while (
      j + 1 < subs.length &&
      strip(subs[j + 1].text).startsWith(strip(subs[j].text)) &&
      strip(subs[j + 1].text).length > strip(subs[j].text).length
    ) {
      j++;
    }
    // קח את הכתובית האחרונה בשרשרת (טקסט מלא) עם טווח מההתחלה
    out.push({
      id: subs[j].id,
      start: subs[i].start,
      end: Math.max(subs[i].start + 0.2, subs[j].end),
      text: subs[j].text,
    });
    i = j + 1;
  }
  if (out.length <= maxCues) return out;
  // עדיין יותר מדי — דגימה אחידה
  const step = Math.ceil(out.length / maxCues);
  return out.filter((_, k) => k % step === 0).slice(0, maxCues);
}

export { clipDur };
