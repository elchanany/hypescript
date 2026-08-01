// ייצור כתוביות SRT מ-EDL (על ציר-הזמן הסופי), בלי צריבה לסרטון — כדי להכניס
// ל-CapCut ולשנות גופן/מיקום שם. תומך בסדר/חזרות של הקליפים.

import { Word } from "@/lib/models";
import { Clip, assembledStart, clipDur } from "./model";
import { buildSrt, Cue } from "@/lib/subtitles";

const RLM = "‏";

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
