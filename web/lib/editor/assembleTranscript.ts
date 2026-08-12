// מיפוי תמלול ממקורות → ציר-זמן ערוך (assembled / EDL).
// אחרי חיתוך/סידור מחדש הזמנים במקור כבר לא תואמים לנגן —
// כאן בונים מחדש רשימת מילים על הציר הסופי בלי תמלול חוזר.

import { isSpeechWord, Word } from "@/lib/models";
import { Clip, assembledStart, clipDur, clipEnabled } from "./model";
import { isGapClip } from "./timelineOps";

export type WordsBySource = (sourceId: string) => Word[] | null | undefined;

export interface AssembleOpts {
  /** כולל גם audio_event / spacing (ברירת מחדל: מילות דיבור בלבד) */
  includeNonSpeech?: boolean;
  /** דילוג על קליפים מושבתים (ברירת מחדל true) */
  skipDisabled?: boolean;
}

/**
 * ממפה מילים מתמלולי המקורות אל ציר ה-EDL הערוך.
 * רווחים (gap) מקדמים את הזמן בלי מילים.
 * קליפים מושבתים מדולגים (כמו ברינדור).
 */
export function assembleTranscript(
  clips: Clip[],
  getWords: WordsBySource,
  opts: AssembleOpts = {},
): Word[] {
  const skipDisabled = opts.skipDisabled !== false;
  const includeNonSpeech = !!opts.includeNonSpeech;
  const out: Word[] = [];

  // צריך assembledStart על הרשימה המלאה כפי שהנגן רואה,
  // אבל קליפים מושבתים לא נכללים ברינדור — לכן בונים רשימת "פעילים".
  const active = clips.filter((c) => {
    if (skipDisabled && !clipEnabled(c)) return false;
    return true;
  });

  active.forEach((c, ci) => {
    const base = assembledStart(active, ci);
    if (isGapClip(c)) return; // שקט על הציר — אין מילים
    const raw = getWords(c.sourceId) || [];
    // שיוך לפי אמצע המילה: הקליפים אינם חופפים, ולכן כל מילה שייכת לקליפ אחד
    // בדיוק. הכלה מלאה (start≥ ו-end≤) הפילה מילים כשגבול החיתוך מוקם לפי
    // מדידה אקוסטית ולא לפי חותמת התמלול — מילה שהמנוע תיארך רחב מדי נעלמה.
    const ws = (includeNonSpeech ? raw : raw.filter(isSpeechWord))
      .filter((w) => {
        const middle = (w.start + w.end) / 2;
        return middle >= c.start - 0.02 && middle <= c.end + 0.02;
      })
      .sort((a, b) => a.start - b.start);
    const clipEnd = base + clipDur(c);
    for (const w of ws) {
      // מילה ששייכת לקליפ אך גולשת מעבר לגבולותיו נחתכת לתחום הקליפ,
      // אחרת הכתובית תופיע לפני שהקליפ מתחיל או אחרי שהוא נגמר.
      const start = Math.max(base, base + (w.start - c.start));
      const end = Math.min(clipEnd, base + (w.end - c.start));
      if (end <= start) continue;
      out.push({
        text: w.text,
        start,
        end,
        type: w.type,
        speakerId: w.speakerId,
      });
    }
  });
  return out;
}

/** משך הציר הפעיל (כמו בנגן, בלי קליפים מושבתים). */
export function assembledDuration(clips: Clip[]): number {
  return clips.filter(clipEnabled).reduce((s, c) => s + clipDur(c), 0);
}

/** פורמט תצוגה לסוכן: שורות עם חותמות זמן על הציר הנתון. */
export function formatTranscriptLines(words: Word[], maxWordsPerLine = 12): string {
  const speech = words.filter(isSpeechWord);
  const lines: string[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (!cur.length) return;
    lines.push(
      `[${cur[0].start.toFixed(1)}–${cur[cur.length - 1].end.toFixed(1)}s] ${cur.map((w) => w.text).join(" ")}`,
    );
    cur = [];
  };
  for (const w of speech) {
    if (cur.length && (w.start - cur[cur.length - 1].end > 0.8 || cur.length >= maxWordsPerLine)) flush();
    cur.push(w);
  }
  flush();
  return lines.join("\n");
}
