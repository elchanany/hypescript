// פעולות סינון/מחיקה המוניות על EDL — כדי שהסוכן לא ימחק עשרות קליפים אחד-אחד.

import { speechWords, Word } from "@/lib/models";
import { Clip, uid } from "./model";

export const TIGHT_SPEECH_GAP_SEC = 0.22;
export const TIGHT_CUT_PADDING_SEC = 0.04;

/**
 * Normalizes only machine-generated cuts. Manual timeline edits may repeat source
 * ranges intentionally, so callers must opt into this invariant.
 *
 * Consecutive clips on the same source/track may touch, but never replay the
 * same source time. A fully covered or tiny remainder is dropped.
 */
export function normalizeGeneratedCuts(clips: Clip[], minClipSec = 0.05): Clip[] {
  const out: Clip[] = [];
  for (const raw of clips) {
    if (!Number.isFinite(raw.start) || !Number.isFinite(raw.end) || raw.end <= raw.start) continue;
    const clip = { ...raw };
    const previous = out[out.length - 1];
    if (
      previous
      && previous.sourceId === clip.sourceId
      && (previous.trackId || "") === (clip.trackId || "")
      && clip.start < previous.end
    ) {
      clip.start = previous.end;
    }
    if (clip.end - clip.start >= minClipSec) out.push(clip);
  }
  return out;
}

/** Builds aggressive word-timestamp speech islands for short-form pacing. */
export function tightSpeechFromWords(
  words: Word[],
  sourceId: string,
  duration: number,
  opts?: { minGapSec?: number; paddingSec?: number },
): Clip[] {
  const minGap = Math.max(0.08, opts?.minGapSec ?? TIGHT_SPEECH_GAP_SEC);
  const padding = Math.max(0, Math.min(minGap / 2 - 0.001, opts?.paddingSec ?? TIGHT_CUT_PADDING_SEC));
  const list = speechWords(words)
    .filter((word) => Number.isFinite(word.start) && Number.isFinite(word.end) && word.end > word.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  if (!list.length) return [];
  const events = words
    .filter((word) => word.type === "audio_event" && Number.isFinite(word.start) && Number.isFinite(word.end))
    .sort((a, b) => a.start - b.start);

  const clips: Clip[] = [];
  let start = Math.max(0, list[0].start - padding);
  let end = list[0].end;
  for (const word of list.slice(1)) {
    const gap = word.start - end;
    const event = events.find((item) => item.start >= end - 0.01 && item.end <= word.start + 0.01);
    if (gap > minGap || event) {
      const previousEnd = event ? Math.min(event.start, end + padding) : end + padding;
      clips.push({ id: uid(), sourceId, start, end: Math.min(duration, previousEnd) });
      start = Math.max(0, event ? Math.max(event.end, word.start - padding) : word.start - padding);
      end = word.end;
    } else {
      end = Math.max(end, word.end);
    }
  }
  clips.push({ id: uid(), sourceId, start, end: Math.min(duration, end + padding) });
  return normalizeGeneratedCuts(clips);
}

/** משאיר רק חפיפה עם [start,end] בזמן-מקור (ומקצץ גבולות). מקורות אחרים נשארים כמו שהם אם sourceId ניתן. */
export function keepSourceRange(clips: Clip[], start: number, end: number, sourceId?: string): Clip[] {
  if (!(end > start)) return [];
  const out: Clip[] = [];
  for (const c of clips) {
    if (sourceId && c.sourceId !== sourceId) {
      out.push(c);
      continue;
    }
    const s = Math.max(c.start, start);
    const e = Math.min(c.end, end);
    if (e - s > 0.05) out.push({ ...c, id: uid(), start: s, end: e });
  }
  return out;
}

/** מוחק לפי אינדקסים 1-based (בבת אחת, בלי תלות בסדר). */
export function deleteClipsAt(clips: Clip[], indices1based: number[]): Clip[] {
  const drop = new Set(indices1based.map((i) => (i | 0) - 1).filter((i) => i >= 0));
  return clips.filter((_, i) => !drop.has(i));
}

/** מוחק טווח אינדקסים כולל (1-based). */
export function deleteClipRange(clips: Clip[], from1: number, to1: number): Clip[] {
  const a = Math.min(from1, to1) | 0;
  const b = Math.max(from1, to1) | 0;
  const indices: number[] = [];
  for (let i = a; i <= b; i++) indices.push(i);
  return deleteClipsAt(clips, indices);
}

/**
 * חותך שתיקות *בתוך* קליפים קיימים: חיתוך בין קטעי-דיבור לבין ה-EDL הנוכחי.
 * לא מחליף את כל הציר בסרטון המלא.
 */
export function intersectClipsWithSpeech(clips: Clip[], speech: Clip[], sourceId: string): Clip[] {
  const out: Clip[] = [];
  for (const c of clips) {
    if (c.sourceId !== sourceId) {
      out.push(c);
      continue;
    }
    for (const s of speech) {
      if (s.sourceId !== sourceId) continue;
      const start = Math.max(c.start, s.start);
      const end = Math.min(c.end, s.end);
      if (end - start > 0.05) out.push({ ...c, id: uid(), sourceId, start, end });
    }
  }
  return normalizeGeneratedCuts(out);
}

/**
 * מרחיב קטעי-דיבור (מזיהוי עוצמה) לגבולות מילים מהתמלול.
 * מונע חיתוך מילת פתיחה רכה כמו "שלום" שנחשבה בטעות כשקט.
 */
export function snapSpeechToWords(
  speech: Clip[],
  words: Word[] | null | undefined,
  opts?: { maxSnapSec?: number; padSec?: number },
): Clip[] {
  const list = speechWords(words || []);
  if (!list.length) return speech;
  const maxSnap = opts?.maxSnapSec ?? 0.45;
  const pad = opts?.padSec ?? 0.04;

  const expanded = speech.map((seg) => {
    let start = seg.start;
    let end = seg.end;
    for (const w of list) {
      // מילה שמתחילה מעט לפני תחילת הדיבור שזוהה — כלול אותה
      if (w.start < seg.start && w.end > seg.start - 0.08 && seg.start - w.start <= maxSnap) {
        start = Math.min(start, w.start);
      }
      // מילה שמסתיימת מעט אחרי סוף הדיבור שזוהה
      if (w.end > seg.end && w.start < seg.end + 0.08 && w.end - seg.end <= maxSnap) {
        end = Math.max(end, w.end);
      }
    }
    start = Math.max(0, start - pad);
    end = end + pad;
    if (!(end > start)) return seg;
    return { ...seg, start, end };
  });

  // ההרחבה נעשתה לכל קטע בנפרד ויכולה ליצור חפיפות/נגיעות בין קטעים;
  // מאחדים קטעים מאותו מקור שנוגעים או חופפים — כך שלא נותרות חפיפות לפני חיתוך מאוחר יותר.
  return mergeOverlappingSameSource(expanded);
}

/** מאחד מקטעים מאותו מקור שנוגעים או חופפים (אחרי snap/הרחבה) לרצף בלי חפיפות. */
function mergeOverlappingSameSource(clips: Clip[]): Clip[] {
  if (clips.length < 2) return clips;
  const sorted = [...clips].sort((a, b) => a.start - b.start || a.end - b.end);
  const out: Clip[] = [];
  for (const c of sorted) {
    const last = out[out.length - 1];
    // סובלנות זעירה לנקודה צפה — pad (0.04) אינו מדויק בינארית
    if (last && last.sourceId === c.sourceId && c.start <= last.end + 1e-6) {
      if (c.end > last.end) last.end = c.end;
    } else {
      out.push({ ...c });
    }
  }
  return out;
}
