import { describe, expect, it } from "vitest";
import { audioFadeFactor, previewAudioGain } from "./previewAudio";

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

  it("computes linear clip-edge fades without exceeding unity", () => {
    expect(audioFadeFactor(0, 10, 2, 3)).toBe(0);
    expect(audioFadeFactor(1, 10, 2, 3)).toBe(0.5);
    expect(audioFadeFactor(5, 10, 2, 3)).toBe(1);
    expect(audioFadeFactor(8.5, 10, 2, 3)).toBe(0.5);
    expect(audioFadeFactor(10, 10, 2, 3)).toBe(0);
    expect(previewAudioGain(1, 2, false, 0.25)).toBe(0.5);
  });
});
