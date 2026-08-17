import { describe, it, expect } from "vitest";
import {
  AUDIO_BYTES_PER_SEC,
  DEFAULT_CHUNK_SEC,
  MAX_CHUNK_SEC,
  MAX_UPLOAD_BYTES,
  mergeWordChunks,
  planChunkOffsets,
  shiftWords,
  wordsFromProviderPayload,
} from "./chunking";

describe("transcribe chunking", () => {
  it("returns a single offset for short audio", () => {
    expect(planChunkOffsets(60)).toEqual([0]);
    expect(planChunkOffsets(DEFAULT_CHUNK_SEC)).toEqual([0]);
  });

  it("splits long audio into contiguous offsets", () => {
    expect(planChunkOffsets(700, 300)).toEqual([0, 300, 600]);
    expect(planChunkOffsets(600, 300)).toEqual([0, 300]);
  });

  // הבאג שהיה: וידאו של 1093 שניות נכנס לקטע אחד של ~6.5MB, ו-Vercel
  // ענה "Request Entity Too Large" כטקסט — מה שנראה כמו תקלת ספק תמלול.
  it("keeps every chunk under the Vercel body limit", () => {
    for (const duration of [1093, 2500, 7200]) {
      const offsets = planChunkOffsets(duration);
      const longest = offsets.length > 1 ? offsets[1] - offsets[0] : duration;
      expect(longest * AUDIO_BYTES_PER_SEC).toBeLessThan(MAX_UPLOAD_BYTES);
    }
  });

  it("clamps a caller that asks for oversized chunks", () => {
    expect(planChunkOffsets(1093, 1200)).not.toEqual([0]);
    const offsets = planChunkOffsets(5000, 1200);
    expect(offsets[1] - offsets[0]).toBeLessThanOrEqual(MAX_CHUNK_SEC);
  });

  it("shifts and merges word chunks", () => {
    const a = [{ text: "שלום", start: 0.1, end: 0.4 }];
    const b = shiftWords([{ text: "עולם", start: 0.2, end: 0.5 }], 1200);
    const merged = mergeWordChunks([a, b]);
    expect(merged).toHaveLength(2);
    expect(merged[1].start).toBeCloseTo(1200.2, 5);
  });

  it("normalizes provider payloads", () => {
    const ws = wordsFromProviderPayload({
      words: [
        { word: "היי", start: 1, end: 1.2 },
        { text: "[מוזיקה]", start: 2, end: 3, type: "audio_event" },
        { word: "x", start: null, end: 1 },
      ],
    });
    expect(ws).toHaveLength(2);
    expect(ws[1].type).toBe("audio_event");
  });
});
