import { describe, expect, it } from "vitest";
import { normalizeElevenLabsStt, toCompatResponse } from "./normalize";
import { defaultModelFor, resolveTranscribeProvider } from "./prefs";
import { isSpeechWord, speechWords } from "@/lib/models";

describe("normalizeElevenLabsStt", () => {
  it("maps words, audio events and speakers", () => {
    const norm = normalizeElevenLabsStt(
      {
        text: "שלום",
        language_code: "he",
        words: [
          { text: "שלום", start: 0.1, end: 0.5, type: "word", speaker_id: "speaker_0" },
          { text: "[laughter]", start: 0.6, end: 0.9, type: "audio_event" },
          { text: " ", start: 0.5, end: 0.55, type: "spacing" },
        ],
      },
      "scribe_v2",
    );

    expect(norm.words).toHaveLength(3);
    expect(norm.words[0].speakerId).toBe("speaker_0");
    expect(norm.words[1].type).toBe("audio_event");
    expect(speechWords(norm.words)).toHaveLength(1);
    expect(isSpeechWord(norm.words[1])).toBe(false);

    const compat = toCompatResponse(norm);
    expect(compat.words[0].word).toBe("שלום");
    expect(compat.provider).toBe("elevenlabs");
  });
});

describe("resolveTranscribeProvider", () => {
  it("prefers elevenlabs in auto mode when configured", () => {
    expect(resolveTranscribeProvider("auto", { elevenlabs: true, groq: true })).toBe("elevenlabs");
    expect(resolveTranscribeProvider("auto", { elevenlabs: false, groq: true })).toBe("groq");
    expect(resolveTranscribeProvider("groq", { elevenlabs: true, groq: true })).toBe("groq");
    expect(resolveTranscribeProvider("elevenlabs", { elevenlabs: false, groq: true })).toBe(null);
  });

  it("returns default models per provider", () => {
    expect(defaultModelFor("elevenlabs")).toBe("scribe_v2");
    expect(defaultModelFor("groq")).toBe("whisper-large-v3");
  });
});
