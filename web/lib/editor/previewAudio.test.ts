import { describe, expect, it } from "vitest";
import { previewAudioGain } from "./previewAudio";

describe("previewAudioGain", () => {
  it("multiplies transport and per-clip gain, including boosts", () => {
    expect(previewAudioGain(0.5, 1.5)).toBe(0.75);
    expect(previewAudioGain(1, 2)).toBe(2);
  });

  it("clamps persisted values and honors mute", () => {
    expect(previewAudioGain(4, 9)).toBe(2);
    expect(previewAudioGain(-1, -2)).toBe(0);
    expect(previewAudioGain(1, 2, true)).toBe(0);
    expect(previewAudioGain(Number.NaN, Number.NaN)).toBe(1);
  });
});
