import type { Word } from "@/lib/models";

/** טוקן גולמי מתשובת Speech-to-Text של ElevenLabs */
export interface ElevenLabsWordRaw {
  text?: string;
  start?: number;
  end?: number;
  type?: string;
  speaker_id?: string;
  logprob?: number;
}

export interface ElevenLabsSttRaw {
  text?: string;
  language_code?: string;
  words?: ElevenLabsWordRaw[];
}

export interface NormalizedTranscript {
  text: string;
  language: string;
  words: Word[];
  provider: "elevenlabs";
  model: string;
}

/** ממיר תשובת Scribe לפורמט Word הפנימי (כולל audio_event / speaker). */
export function normalizeElevenLabsStt(raw: ElevenLabsSttRaw, model: string): NormalizedTranscript {
  const words: Word[] = (raw.words || [])
    .filter((w) => w.start != null && w.end != null && (w.text != null && String(w.text).length > 0))
    .map((w) => {
      const type = mapTokenType(w.type, String(w.text));
      const word: Word = {
        text: String(w.text).trim(),
        start: +w.start!,
        end: +w.end!,
      };
      if (type) word.type = type;
      if (w.speaker_id) word.speakerId = String(w.speaker_id);
      return word;
    });

  return {
    text: String(raw.text || words.filter((w) => !w.type || w.type === "word").map((w) => w.text).join(" ")),
    language: String(raw.language_code || "he"),
    words,
    provider: "elevenlabs",
    model,
  };
}

function mapTokenType(raw: string | undefined, text: string): Word["type"] | undefined {
  const t = (raw || "").toLowerCase();
  if (t === "word" || t === "spacing" || t === "audio_event") return t;
  // לפעמים אירועים מגיעים כטקסט בסוגריים בלי type
  if (/^\[[^\]]+\]$/.test(text.trim())) return "audio_event";
  return undefined;
}

/** פורמט תואם-Groq שהכלי הקיים מצפה לו, עם שדות נוספים */
export function toCompatResponse(norm: NormalizedTranscript) {
  return {
    text: norm.text,
    language: norm.language,
    words: norm.words.map((w) => ({
      word: w.text,
      text: w.text,
      start: w.start,
      end: w.end,
      type: w.type || "word",
      speaker_id: w.speakerId,
    })),
    provider: norm.provider,
    model: norm.model,
  };
}
