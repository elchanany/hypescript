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

  // שיוך לפי *חפיפה* ולא לפי אמצע המילה.
  //
  // אמצע המילה נכשל בשני כיוונים כשנקודת החיתוך מוקמה לפי מדידה אקוסטית ולא
  // לפי חותמת התמלול: מילה שאמצעה נפל בתוך הפער שהוסר לא שויכה לאף קליפ
  // ונמחקה בשקט, ומילה שאמצעה נפל בדיוק על הגבול שויכה לשני הקליפים והוקראה
  // פעמיים. שתי התוצאות נראות כמו באג בחיתוך, והן באג במיפוי.
  //
  // כאן: מילה שנשמעת ברובה בקליפ שייכת לו (וכך קטע משוכפל עדיין מקבל את
  // מילותיו פעמיים), ומילה שלא עברה את הרוב באף קליפ הולכת לקליפ שבו היא
  // נשמעת הכי הרבה — פעם אחת בלבד.
  interface Candidate { word: Word; clipIndex: number; overlap: number; }
  const fallback = new Map<string, Candidate>();
  const settled = new Set<string>();

  active.forEach((c, ci) => {
    if (isGapClip(c)) return; // שקט על הציר — אין מילים
    const base = assembledStart(active, ci);
    const raw = getWords(c.sourceId) || [];
    const words = includeNonSpeech ? raw : raw.filter(isSpeechWord);

    words.forEach((w, wi) => {
      const overlap = Math.min(w.end, c.end) - Math.max(w.start, c.start);
      if (overlap <= 0) return; // נאמרה כולה בקטע שנחתך
      const key = `${c.sourceId}:${wi}`;
      const duration = Math.max(1e-6, w.end - w.start);

      if (overlap / duration > 0.5) {
        settled.add(key);
        out.push(placeWord(w, c, base));
        return;
      }
      const prior = fallback.get(key);
      if (!prior || overlap > prior.overlap) fallback.set(key, { word: w, clipIndex: ci, overlap });
    });
  });

  for (const [key, candidate] of fallback) {
    if (settled.has(key)) continue;
    const c = active[candidate.clipIndex];
    out.push(placeWord(candidate.word, c, assembledStart(active, candidate.clipIndex)));
  }

  return out.sort((a, b) => a.start - b.start);
}

/** ממקם מילה על הציר וחותך אותה לגבולות הקליפ. */
function placeWord(w: Word, c: Clip, base: number): Word {
  const clipEnd = base + clipDur(c);
  const start = Math.min(clipEnd, Math.max(base, base + (w.start - c.start)));
  let end = Math.min(clipEnd, base + (w.end - c.start));
  if (end <= start) end = start + 0.02;
  return { text: w.text, start, end, type: w.type, speakerId: w.speakerId };
}

/** משך הציר הפעיל (כמו בנגן, בלי קליפים מושבתים). */
export function assembledDuration(clips: Clip[]): number {
  return clips.filter(clipEnabled).reduce((s, c) => s + clipDur(c), 0);
}

/** תווית דובר קצרה לתצוגה (speaker_0 → דובר 0). */
export function formatSpeakerLabel(speakerId: string | undefined | null): string {
  const raw = String(speakerId || "").trim();
  if (!raw) return "";
  const m = raw.match(/(\d+)\s*$/);
  if (m) return `דובר ${m[1]}`;
  return raw;
}

/** פורמט תצוגה לסוכן: שורות עם חותמות זמן + תווית דובר כשיש diarization. */
export function formatTranscriptLines(words: Word[], maxWordsPerLine = 12): string {
  const speech = words.filter(isSpeechWord);
  const lines: string[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (!cur.length) return;
    const speaker = formatSpeakerLabel(cur[0].speakerId);
    const prefix = speaker ? `${speaker} · ` : "";
    lines.push(
      `[${cur[0].start.toFixed(1)}–${cur[cur.length - 1].end.toFixed(1)}s] ${prefix}${cur.map((w) => w.text).join(" ")}`,
    );
    cur = [];
  };
  for (const w of speech) {
    const speakerChanged = !!cur.length && String(cur[0].speakerId || "") !== String(w.speakerId || "");
    if (cur.length && (speakerChanged || w.start - cur[cur.length - 1].end > 0.8 || cur.length >= maxWordsPerLine)) {
      flush();
    }
    cur.push(w);
  }
  flush();
  return lines.join("\n");
}

/** מסנן מילים לפי מזהה דובר (התאמה חלקית: "0" ↔ "speaker_0"). */
export function filterWordsBySpeaker(words: Word[], speaker: string | null | undefined): Word[] {
  const want = String(speaker || "").trim().toLowerCase();
  if (!want) return words;
  return words.filter((w) => {
    const id = String(w.speakerId || "").trim().toLowerCase();
    if (!id) return false;
    return id === want || id.endsWith(want) || id.includes(want) || want.includes(id);
  });
}
