import { describe, expect, it } from "vitest";
import {
  serviceLabelFor,
  timeoutError,
  toolTimeoutMs,
  withTimeout,
  withTimeoutSignal,
} from "./timeout";

describe("agent timeout helpers", () => {
  it("uses longer ceiling for transcription tools", () => {
    expect(toolTimeoutMs("transcribe_video")).toBeGreaterThan(toolTimeoutMs("list_clips"));
    expect(toolTimeoutMs("unknown_tool")).toBe(180_000);
  });

  it("labels STT/TTS services in Hebrew-friendly English names", () => {
    expect(serviceLabelFor("elevenlabs", "scribe_v2")).toBe("ElevenLabs · scribe_v2");
    expect(serviceLabelFor("groq")).toBe("Groq");
  });

  it("withTimeout rejects with Hebrew reason", async () => {
    await expect(withTimeout(new Promise(() => {}), 20, "תמלול", "בדיקה")).rejects.toThrow(/נעצר/);
  });

  it("withTimeoutSignal aborts immediately when already aborted", async () => {
    const c = new AbortController();
    c.abort();
    await expect(withTimeoutSignal(Promise.resolve(1), 1000, "פעולה", c.signal)).rejects.toThrow(/בוטל/);
  });

  it("timeoutError mentions the phase detail", () => {
    expect(timeoutError("תמלול", 60_000, "חילוץ אודיו").message).toMatch(/חילוץ אודיו/);
  });
});
