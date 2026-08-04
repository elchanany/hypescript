// מבני נתונים משותפים — מקבילים ל-models.py בגרסה המקומית.

export type WordType = "word" | "spacing" | "audio_event";

export interface Word {
  text: string;
  start: number; // שניות, ציר הזמן המקורי
  end: number;
  /** סוג טוקן מ-ElevenLabs Scribe (אופציונלי; חסר = מילה רגילה) */
  type?: WordType;
  /** מזהה דובר כשיש diarization */
  speakerId?: string;
}

/** מילות דיבור בלבד — ללא רווחים/אירועי שמע (צחוק, מחיאות וכו'). */
export function isSpeechWord(w: Word): boolean {
  if (w.type && w.type !== "word") return false;
  const t = (w.text || "").trim();
  if (!t) return false;
  return true;
}

export function speechWords(words: Word[]): Word[] {
  return words.filter(isSpeechWord);
}

export interface KeepInterval {
  start: number;
  end: number;
}

export function intervalDuration(iv: KeepInterval): number {
  return Math.max(0, iv.end - iv.start);
}

export function keptDuration(keeps: KeepInterval[]): number {
  return keeps.reduce((s, iv) => s + intervalDuration(iv), 0);
}
