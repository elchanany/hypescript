// כתוביות SRT על ציר-הזמן הערוך, עם RTL (U+200F) — פורט של subtitles.py.

import { KeepInterval, Word, intervalDuration } from "./models";

const RLM = "‏";
const SENTENCE_END = [".", "?", "!", "׃", "…"];

export interface Cue {
  start: number;
  end: number;
  text: string;
}

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

export function buildCues(
  words: Word[],
  keeps: KeepInterval[],
  maxChars = 42,
  maxLines = 2,
  maxGap = 0.7,
  maxDuration = 5.0,
): Cue[] {
  const sorted = [...words].sort((a, b) => a.start - b.start);
  const cues: Cue[] = [];
  const budget = maxChars * maxLines;

  let cur: Word[] = [];
  let curChars = 0;
  let prev: Word | null = null;

  const flush = () => {
    if (cur.length === 0) return;
    const start = mapToEdited(cur[0].start, keeps);
    const end = mapToEdited(cur[cur.length - 1].end, keeps);
    cues.push({ start, end, text: formatCueText(cur.map((w) => w.text), maxChars, maxLines) });
  };

  for (const w of sorted) {
    if (cur.length > 0 && prev) {
      const gap = w.start - prev.end;
      const newChars = curChars + 1 + w.text.length;
      const editedSpan = mapToEdited(w.end, keeps) - mapToEdited(cur[0].start, keeps);
      if (gap > maxGap || newChars > budget || editedSpan > maxDuration) {
        flush();
        cur = [];
        curChars = 0;
      }
    }
    cur.push(w);
    curChars += curChars === 0 ? w.text.length : 1 + w.text.length;
    prev = w;
    if (endsSentence(w.text) && curChars >= maxChars / 2) {
      flush();
      cur = [];
      curChars = 0;
    }
  }
  flush();
  return cues;
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
