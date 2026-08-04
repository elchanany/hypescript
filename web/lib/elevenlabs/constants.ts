/** ברירות מחדל ומזהים ידועים ל-ElevenLabs — מפרט: docs/ElevenLabs_API_HypeScript_2026-08-04.md */

export const ELEVENLABS_API_BASE = "https://api.elevenlabs.io";

/** מודל תמלול מומלץ (Scribe v2) — עברית, word timestamps, אירועי שמע */
export const DEFAULT_STT_MODEL = "scribe_v2";

/** מודלי STT מוכרים (fallback כש-GET /v1/models לא מחזיר STT) */
export const KNOWN_STT_MODELS = [
  { id: "scribe_v2", name: "Scribe v2", descriptionHe: "תמלול מדויק עם חותמות-מילה, עברית, אירועי שמע והפרדת דוברים" },
  { id: "scribe_v1", name: "Scribe v1", descriptionHe: "דור קודם של Scribe" },
] as const;

/** מודל קריינות מומלץ */
export const DEFAULT_TTS_MODEL = "eleven_v3";

export const KNOWN_TTS_MODELS = [
  { id: "eleven_v3", name: "Eleven v3", descriptionHe: "הכי אקספרסיבי; תומך בתגיות [laughs]/[whispers] וכו'" },
  { id: "eleven_multilingual_v2", name: "Multilingual v2", descriptionHe: "יציב לקריינות ארוכה" },
  { id: "eleven_flash_v2_5", name: "Flash v2.5", descriptionHe: "מהיר וזול יותר" },
] as const;

/** הגדרות STT מומלצות ל-HypeScript */
export const DEFAULT_STT_OPTIONS = {
  language_code: "he",
  tag_audio_events: true,
  diarize: true,
  timestamps_granularity: "word",
  no_verbatim: false,
} as const;
