import { describe, it, expect } from "vitest";
import { elevenLabsFallbackReason } from "./fallbackReason";
import { fallbackMessageHe } from "./client";

// Regression guard for a real user-facing bug: when the premium engine (ElevenLabs)
// failed, the API silently fell back to Groq and the user only experienced
// "inaccurate transcription". The real cause in production was an exhausted free-tier
// quota. The reason must now be captured AND explained.

describe("elevenLabsFallbackReason", () => {
  it("maps auth failures", () => {
    expect(elevenLabsFallbackReason(401)).toBe("elevenlabs_key_rejected");
    expect(elevenLabsFallbackReason(403)).toBe("elevenlabs_key_rejected");
  });
  it("maps quota exhaustion — the production root cause", () => {
    expect(elevenLabsFallbackReason(429)).toBe("elevenlabs_quota_exhausted");
  });
  it("maps payload too large", () => {
    expect(elevenLabsFallbackReason(413)).toBe("elevenlabs_file_too_large");
  });
  it("maps every 5xx to unavailable", () => {
    for (const s of [500, 502, 503, 504]) expect(elevenLabsFallbackReason(s)).toBe("elevenlabs_unavailable");
  });
  it("falls back to a status-tagged reason for unmapped codes", () => {
    expect(elevenLabsFallbackReason(418)).toBe("elevenlabs_http_418");
  });
});

describe("fallbackMessageHe", () => {
  const GENERIC = fallbackMessageHe(null);

  it("has a sensible default for null / unknown reasons", () => {
    expect(GENERIC).toBeTruthy();
    expect(fallbackMessageHe("something_unrecognised")).toBe(GENERIC);
  });

  it("quota message states BOTH that the quota ran out and that a fallback engine was used", () => {
    const msg = fallbackMessageHe("elevenlabs_quota_exhausted");
    expect(msg).toContain("מכסת");        // quota
    expect(msg).toContain("גיבוי");        // fallback engine
    expect(msg).not.toBe(GENERIC);        // must not silently regress to vague text
  });

  it("every reason the API can emit has its own explanation (the two stay in sync)", () => {
    const reasons = [401, 403, 429, 413, 500, 503].map(elevenLabsFallbackReason);
    reasons.push("elevenlabs_not_configured");
    for (const r of new Set(reasons)) {
      const msg = fallbackMessageHe(r);
      expect(msg, `reason "${r}" fell through to the generic message`).not.toBe(GENERIC);
      expect(msg.trim().length).toBeGreaterThan(10);
    }
  });
});
