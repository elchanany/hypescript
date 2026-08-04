/** העדפות תמלול בצד-לקוח (לא סודיות). */

export type TranscribeProviderId = "elevenlabs" | "groq";
export type TranscribeProviderPref = "auto" | TranscribeProviderId;

export const DEFAULT_TRANSCRIBE_PREF: TranscribeProviderPref = "auto";

export interface TranscribeConfigured {
  elevenlabs: boolean;
  groq: boolean;
}

/** בוחר ספק תמלול בפועל לפי העדפה + מה שמוגדר ב-env. */
export function resolveTranscribeProvider(
  pref: TranscribeProviderPref,
  configured: TranscribeConfigured,
): TranscribeProviderId | null {
  if (pref === "elevenlabs") return configured.elevenlabs ? "elevenlabs" : null;
  if (pref === "groq") return configured.groq ? "groq" : null;
  // auto: ElevenLabs קודם (איכות גבוהה יותר), אחרת Groq
  if (configured.elevenlabs) return "elevenlabs";
  if (configured.groq) return "groq";
  return null;
}

export function defaultModelFor(provider: TranscribeProviderId): string {
  return provider === "elevenlabs" ? "scribe_v2" : "whisper-large-v3";
}
