// פעולות סינון/מחיקה המוניות על EDL — כדי שהסוכן לא ימחק עשרות קליפים אחד-אחד.

import { speechWords, Word } from "@/lib/models";
import { Clip, uid } from "./model";

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
      if (end - start > 0.05) out.push({ id: uid(), sourceId, start, end });
    }
  }
  return out;
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

  return speech.map((seg) => {
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
}
