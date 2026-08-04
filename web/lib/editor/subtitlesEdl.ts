// ייצור כתוביות SRT מ-EDL (על ציר-הזמן הסופי), בלי צריבה לסרטון — כדי להכניס
// ל-CapCut ולשנות גופן/מיקום שם. תומך בסדר/חזרות של הקליפים.

import { Word } from "@/lib/models";
import { getOpcodes, normalizeHebrew } from "@/lib/align";
import { Clip, assembledStart, clipDur, uid } from "./model";
import { buildSrt, Cue } from "@/lib/subtitles";

const RLM = "‏";

// כתובית הניתנת לעריכה (על ציר-הזמן הסופי).
export interface Sub { id: string; start: number; end: number; text: string; }

export function edlToSubs(clips: Clip[], getWords: WordsBySource, maxChars = 42): Sub[] {
  return edlToCues(clips, getWords, maxChars).map((c) => ({ id: uid("s"), ...c }));
}

/** כתוביות עם טקסט נקי מסקריפט המשתמש + תזמונים מהתמלול (מתקן שיבושי ASR). */
export function edlToSubsWithScript(
  clips: Clip[],
  getWords: WordsBySource,
  scriptText: string,
  maxChars = 42,
): Sub[] {
  return edlToCuesWithScript(clips, getWords, scriptText, maxChars).map((c) => ({ id: uid("s"), ...c }));
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
export type WordsBySource = (sourceId: string) => Word[] | null | undefined;

export function edlToCues(clips: Clip[], getWords: WordsBySource, maxChars = 42): Cue[] {
  const cues: Cue[] = [];
  clips.forEach((c, ci) => {
    const base = assembledStart(clips, ci);
    const ws = (getWords(c.sourceId) || [])
      .filter((w) => w.start >= c.start - 0.05 && w.end <= c.end + 0.05)
      .sort((a, b) => a.start - b.start);
    let cur: Word[] = [];
    let chars = 0;
    const flush = () => {
      if (!cur.length) return;
      const s = base + (cur[0].start - c.start);
      const e = base + (cur[cur.length - 1].end - c.start);
      cues.push({ start: s, end: e, text: RLM + cur.map((w) => w.text).join(" ") });
      cur = [];
      chars = 0;
    };
    for (const w of ws) {
      if (cur.length && (chars + w.text.length > maxChars || w.start - cur[cur.length - 1].end > 0.6)) flush();
      cur.push(w);
      chars += w.text.length + 1;
    }
    flush();
  });
  return cues;
}

type TimedTok = { text: string; start: number; end: number };

function assembledWords(clips: Clip[], getWords: WordsBySource): TimedTok[] {
  const out: TimedTok[] = [];
  clips.forEach((c, ci) => {
    const base = assembledStart(clips, ci);
    const ws = (getWords(c.sourceId) || [])
      .filter((w) => w.start >= c.start - 0.05 && w.end <= c.end + 0.05)
      .sort((a, b) => a.start - b.start);
    for (const w of ws) {
      out.push({
        text: w.text,
        start: base + (w.start - c.start),
        end: base + (w.end - c.start),
      });
    }
  });
  return out;
}

function chunkTimed(words: TimedTok[], maxChars: number): Cue[] {
  const cues: Cue[] = [];
  let cur: TimedTok[] = [];
  let chars = 0;
  const flush = () => {
    if (!cur.length) return;
    cues.push({
      start: cur[0].start,
      end: Math.max(cur[0].start + 0.2, cur[cur.length - 1].end),
      text: RLM + cur.map((w) => w.text).join(" "),
    });
    cur = [];
    chars = 0;
  };
  for (const w of words) {
    if (cur.length && (chars + w.text.length > maxChars || w.start - cur[cur.length - 1].end > 0.6)) flush();
    cur.push(w);
    chars += w.text.length + 1;
  }
  flush();
  return cues;
}

/**
 * מיישר תמלול-ASR לסקריפט נקי (LCS): משאיר תזמונים מה-ASR, מחליף טקסט בסקריפט.
 * כך "טיפרת"/"קשר" וכו' הופכים לטקסט שהמשתמש כתב ("תפארת"/"כשר").
 */
export function edlToCuesWithScript(
  clips: Clip[],
  getWords: WordsBySource,
  scriptText: string,
  maxChars = 42,
): Cue[] {
  const asr = assembledWords(clips, getWords);
  const scriptToks = scriptText.split(/\s+/).map((t) => t.trim()).filter(Boolean)
    .map((raw) => ({ raw, norm: normalizeHebrew(raw) })).filter((t) => t.norm);
  if (!asr.length || !scriptToks.length) return edlToCues(clips, getWords, maxChars);

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
        for (const s of scriptSlice) polished.push({ text: s.raw, start: t, end: t + 0.12 });
        continue;
      }
      const t0 = asrSlice[0].start;
      const t1 = Math.max(t0 + 0.05, asrSlice[asrSlice.length - 1].end);
      const n = scriptSlice.length;
      for (let i = 0; i < n; i++) {
        const s = t0 + ((t1 - t0) * i) / n;
        const e = t0 + ((t1 - t0) * (i + 1)) / n;
        polished.push({ text: scriptSlice[i].raw, start: s, end: Math.max(s + 0.05, e) });
      }
    } else if (op.tag === "insert") {
      const scriptSlice = scriptToks.slice(op.b1, op.b2);
      const t = polished.length ? polished[polished.length - 1].end : (asr[Math.min(op.a1, asr.length - 1)]?.start ?? 0);
      for (const s of scriptSlice) polished.push({ text: s.raw, start: t, end: t + 0.12 });
    }
    // delete = מילות ASR עודפות — נזרקות
  }
  return polished.length ? chunkTimed(polished, maxChars) : edlToCues(clips, getWords, maxChars);
}

export function edlToSrt(clips: Clip[], getWords: WordsBySource, maxChars = 42): string {
  return buildSrt(edlToCues(clips, getWords, maxChars));
}

export { clipDur };
