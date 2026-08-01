// ייצור כתוביות SRT מ-EDL (על ציר-הזמן הסופי), בלי צריבה לסרטון — כדי להכניס
// ל-CapCut ולשנות גופן/מיקום שם. תומך בסדר/חזרות של הקליפים.

import { Word } from "@/lib/models";
import { Clip, assembledStart, clipDur, uid } from "./model";
import { buildSrt, Cue } from "@/lib/subtitles";

const RLM = "‏";

// כתובית הניתנת לעריכה (על ציר-הזמן הסופי).
export interface Sub { id: string; start: number; end: number; text: string; }

export function edlToSubs(words: Word[], clips: Clip[], maxChars = 42): Sub[] {
  return edlToCues(words, clips, maxChars).map((c) => ({ id: uid("s"), ...c }));
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

export function edlToCues(words: Word[], clips: Clip[], maxChars = 42): Cue[] {
  const cues: Cue[] = [];
  clips.forEach((c, ci) => {
    const base = assembledStart(clips, ci);
    const ws = words
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

export function edlToSrt(words: Word[], clips: Clip[], maxChars = 42): string {
  return buildSrt(edlToCues(words, clips, maxChars));
}

export { clipDur };
