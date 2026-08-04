// כתוביות SRT על ציר-הזמן הערוך, עם RTL (U+200F) — פורט של subtitles.py.
// ברירת מחדל: חשיפה מצטברת לפי קצב דיבור (לא בלוק מילים מראש).

import { KeepInterval, Word, intervalDuration, isSpeechWord } from "./models";

const RLM = "‏";
const SENTENCE_END = [".", "?", "!", "׃", "…"];
const PHRASE_END = /[.?!…׃:,،;]$/;

export interface Cue {
  start: number;
  end: number;
  text: string;
}

export type CaptionMode = "progressive" | "phrase";

export function mapToEdited(t: number, keeps: KeepInterval[]): number {
  let elapsed = 0;
  for (const iv of keeps) {
    if (t < iv.start) return elapsed;
    if (t <= iv.end) return elapsed + (t - iv.start);
    elapsed += intervalDuration(iv);
  }
  return elapsed;
}

function endsSentence(text: string): boolean {
  const t = text.trimEnd();
  return SENTENCE_END.some((p) => t.endsWith(p));
}

function endsPhrase(text: string): boolean {
  return PHRASE_END.test(text.trimEnd());
}

function formatCueText(wordTexts: string[], maxChars: number, maxLines: number): string {
  const lines: string[] = [];
  let cur = "";
  for (const wt of wordTexts) {
    const candidate = `${cur} ${wt}`.trim();
    if (!cur || candidate.length <= maxChars || lines.length === maxLines - 1) {
      cur = candidate;
    } else {
      lines.push(cur);
      cur = wt;
    }
  }
  if (cur) lines.push(cur);
  return lines.map((ln) => RLM + ln).join("\n");
}

type Timed = { text: string; start: number; end: number };

function toEditedWords(words: Word[], keeps: KeepInterval[]): Timed[] {
  return [...words]
    .filter(isSpeechWord)
    .sort((a, b) => a.start - b.start)
    .map((w) => ({
      text: w.text,
      start: mapToEdited(w.start, keeps),
      end: mapToEdited(w.end, keeps),
    }));
}

function splitPhrases(words: Timed[], maxChars: number, maxGap: number): Timed[][] {
  const phrases: Timed[][] = [];
  let cur: Timed[] = [];
  let chars = 0;
  for (const w of words) {
    const gap = cur.length ? w.start - cur[cur.length - 1].end : 0;
    const over = cur.length > 0 && chars + 1 + w.text.length > maxChars;
    if (cur.length && (gap > maxGap || endsPhrase(cur[cur.length - 1].text) || over)) {
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

function seal(cues: Cue[]): Cue[] {
  if (cues.length < 2) return cues;
  const out = cues.map((c) => ({ ...c }));
  for (let i = 0; i < out.length - 1; i++) {
    const gap = out[i + 1].start - out[i].end;
    if (gap < 0 || (gap > 0 && gap < 0.35)) out[i].end = out[i + 1].start;
    if (out[i].end <= out[i].start) out[i].end = out[i].start + 0.12;
  }
  const last = out[out.length - 1];
  if (last.end <= last.start) last.end = last.start + 0.25;
  return out;
}

/** חשיפה מצטברת לפי קצב דיבור. */
function progressiveFromPhrases(phrases: Timed[][]): Cue[] {
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
        text: formatCueText(phrase.slice(0, i + 1).map((w) => w.text), 42, 2),
      });
    }
  }
  return seal(cues);
}

function phraseBlocks(phrases: Timed[][], maxChars: number, maxLines: number): Cue[] {
  return seal(phrases.map((p) => ({
    start: p[0].start,
    end: Math.max(p[0].start + 0.2, p[p.length - 1].end + 0.08),
    text: formatCueText(p.map((w) => w.text), maxChars, maxLines),
  })));
}

/**
 * מקבץ מילים לכתוביות על הציר הערוך.
 * mode=progressive (ברירת מחדל): מילה נוספת מופיעה כשהיא נאמרת.
 * mode=phrase: בלוק שלם לכל ביטוי.
 */
export function buildCues(
  words: Word[],
  keeps: KeepInterval[],
  maxChars = 28,
  maxLines = 2,
  maxGap = 0.45,
  maxDuration = 5.0,
  mode: CaptionMode = "progressive",
): Cue[] {
  const edited = toEditedWords(words, keeps);
  if (!edited.length) return [];

  // תאימות לאחור: אם מבקשים phrase עם maxDuration הישן — שומרים גם שבירת משך
  const budget = maxChars * maxLines;
  const phrases = splitPhrases(edited, budget, maxGap).flatMap((p) => {
    if (mode !== "phrase") return [p];
    // פיצול נוסף אם הביטוי ארוך מדי בזמן
    const out: Timed[][] = [];
    let cur: Timed[] = [];
    for (const w of p) {
      if (cur.length && w.end - cur[0].start > maxDuration) {
        out.push(cur);
        cur = [];
      }
      cur.push(w);
      if (endsSentence(w.text) && cur.reduce((s, x) => s + x.text.length + 1, 0) >= maxChars / 2) {
        out.push(cur);
        cur = [];
      }
    }
    if (cur.length) out.push(cur);
    return out;
  });

  return mode === "phrase"
    ? phraseBlocks(phrases, maxChars, maxLines)
    : progressiveFromPhrases(phrases);
}

function formatTimestamp(seconds: number): string {
  let ms = Math.round(Math.max(0, seconds) * 1000);
  const h = Math.floor(ms / 3_600_000); ms %= 3_600_000;
  const m = Math.floor(ms / 60_000); ms %= 60_000;
  const s = Math.floor(ms / 1000); ms %= 1000;
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(h)}:${p(m)}:${p(s)},${p(ms, 3)}`;
}

export function buildSrt(cues: Cue[]): string {
  const out: string[] = [];
  cues.forEach((c, i) => {
    const end = c.end <= c.start ? c.start + 0.5 : c.end;
    out.push(String(i + 1));
    out.push(`${formatTimestamp(c.start)} --> ${formatTimestamp(end)}`);
    out.push(c.text);
    out.push("");
  });
  return out.join("\n");
}
