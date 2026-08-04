import { describe, it, expect } from "vitest";
import {
  DEFAULT_CHUNK_SEC,
  mergeWordChunks,
  planChunkOffsets,
  shiftWords,
  wordsFromProviderPayload,
} from "./chunking";

describe("transcribe chunking", () => {
  it("returns a single offset for short audio", () => {
    expect(planChunkOffsets(600)).toEqual([0]);
    expect(planChunkOffsets(DEFAULT_CHUNK_SEC)).toEqual([0]);
  });

  it("splits long audio into contiguous offsets", () => {
    expect(planChunkOffsets(2500, 1200)).toEqual([0, 1200, 2400]);
    expect(planChunkOffsets(2400, 1200)).toEqual([0, 1200]);
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
