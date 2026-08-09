import { describe, it, expect } from "vitest";
import {
  deleteClipRange,
  deleteClipsAt,
  auditCutQuality,
  intersectClipsWithSpeech,
  keepSourceRange,
  normalizeGeneratedCuts,
  protectSpokenWordEdges,
  snapSpeechToWords,
  tightSpeechFromWords,
} from "./clipFilter";
import { Clip } from "./model";

const c = (id: string, start: number, end: number, sourceId = "v1"): Clip => ({ id, sourceId, start, end });

describe("keepSourceRange", () => {
  it("keeps and trims overlapping clips", () => {
    const clips = [c("a", 0, 10), c("b", 20, 40), c("c", 50, 60)];
    const r = keepSourceRange(clips, 5, 25);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ start: 5, end: 10 });
    expect(r[1]).toMatchObject({ start: 20, end: 25 });
  });
});

describe("deleteClipsAt / deleteClipRange", () => {
  it("deletes many indices in one shot", () => {
    const clips = [c("a", 0, 1), c("b", 1, 2), c("c", 2, 3), c("d", 3, 4)];
    expect(deleteClipsAt(clips, [2, 4]).map((x) => x.id)).toEqual(["a", "c"]);
    expect(deleteClipRange(clips, 2, 4).map((x) => x.id)).toEqual(["a"]);
  });
});

describe("intersectClipsWithSpeech", () => {
  it("cuts silence only inside existing selection", () => {
    const clips = [c("sel", 0, 10)];
    const speech = [c("s1", 1, 3), c("s2", 5, 7), c("s3", 20, 30)];
    const r = intersectClipsWithSpeech(clips, speech, "v1");
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ start: 1, end: 3 });
    expect(r[1]).toMatchObject({ start: 5, end: 7 });
  });

  it("cannot reintroduce repeated source time from overlapping EDL selections", () => {
    const selected = [c("first", 20, 29.8), c("second", 29.7, 35)];
    const speech = [c("speech", 20, 35)];
    const result = intersectClipsWithSpeech(selected, speech, "v1");
    expect(result.map((clip) => [clip.start, clip.end])).toEqual([
      [20, 29.8],
      [29.8, 35],
    ]);
  });
});

describe("normalizeGeneratedCuts", () => {
  it("clamps 29.7 after 29.8 without changing intentional cross-track overlap", () => {
    const sameTrack = normalizeGeneratedCuts([c("a", 10, 29.8), c("b", 29.7, 31)]);
    expect(sameTrack[1].start).toBe(29.8);

    const crossTrack = normalizeGeneratedCuts([
      { ...c("a", 10, 29.8), trackId: "v1" },
      { ...c("b", 29.7, 31), trackId: "v2" },
    ]);
    expect(crossTrack[1].start).toBe(29.7);
  });

  it("drops a generated range fully covered by the previous clip", () => {
    expect(normalizeGeneratedCuts([c("a", 10, 20), c("b", 19.9, 19.95)])).toHaveLength(1);
  });
});

describe("tightSpeechFromWords", () => {
  it("places a jump cut inside the measured quiet valley instead of trusting coarse ASR edges", () => {
    const db = new Float32Array(100).fill(-12);
    // 1.40-1.58 is the measured valley (20ms hops).
    for (let i = 70; i < 79; i++) db[i] = -55;
    const energy = { hop: 0.02, db, duration: 2, floorDb: -55, peakDb: -12 };
    const result = tightSpeechFromWords([
      { text: "מילה", start: 1.0, end: 1.3 },
      { text: "הבאה", start: 1.7, end: 1.95 },
    ], "v1", 2, { minGapSec: 0.14, paddingSec: 0.02, energy, energyThresholdDb: -40, minQuietSec: 0.04 });
    expect(result).toHaveLength(2);
    expect(result[0].end).toBeCloseTo(1.42, 6);
    expect(result[1].start).toBeCloseTo(1.56, 6);
  });

  it("cuts a 230ms non-speech gap with short handles for promotional pacing", () => {
    const result = tightSpeechFromWords([
      { text: "שלום", start: 1, end: 1.4 },
      { text: "וברכה", start: 1.63, end: 2 },
    ], "v1", 5);
    expect(result).toHaveLength(2);
    expect(result[0].start).toBeCloseTo(0.975, 6);
    expect(result[0].end).toBeCloseTo(1.425, 6);
    expect(result[1].start).toBeCloseTo(1.605, 6);
    expect(result[1].end).toBeCloseTo(2.025, 6);
  });

  it("cuts explicit provider audio events even when the gap is short", () => {
    const result = tightSpeechFromWords([
      { text: "שלום", start: 1, end: 1.4, type: "word" },
      { text: "(breath)", start: 1.42, end: 1.5, type: "audio_event" },
      { text: "וברכה", start: 1.52, end: 1.9, type: "word" },
    ], "v1", 5);
    expect(result).toHaveLength(2);
    expect(result[0].end).toBeLessThanOrEqual(1.42);
    expect(result[1].start).toBeGreaterThanOrEqual(1.5);
  });
});

describe("cut quality guard", () => {
  it("expands a drifting edge to keep the whole spoken word and reports no clipping", () => {
    const words = [{ text: "שלום", start: 1, end: 1.4 }];
    const repaired = protectSpokenWordEdges([c("a", 1.1, 2)], words, "v1", 0.02);
    expect(repaired[0].start).toBeCloseTo(0.98, 6);
    expect(auditCutQuality(repaired, words, "v1")).toEqual({ repeatedSourceSec: 0, clippedWords: [], invalidClips: 0 });
  });

  it("measures repeated source time at an accidental 29.8/29.7 join", () => {
    const report = auditCutQuality([c("a", 20, 29.8), c("b", 29.7, 35)], [], "v1");
    expect(report.repeatedSourceSec).toBeCloseTo(0.1, 6);
  });
});

describe("snapSpeechToWords", () => {
  it("expands soft opening word cut by energy detection", () => {
    // energy said speech starts at 1.7; transcript has "שלום" at 1.5
    const speech = [c("s", 1.7, 5.0)];
    const words = [
      { text: "שלום", start: 1.5, end: 1.9 },
      { text: "וברכה", start: 2.0, end: 2.5 },
    ];
    const r = snapSpeechToWords(speech, words, { maxSnapSec: 0.5, padSec: 0 });
    expect(r[0].start).toBeLessThanOrEqual(1.5);
    expect(r[0].end).toBeGreaterThanOrEqual(5.0);
  });

  it("is no-op without transcript", () => {
    const speech = [c("s", 1.7, 5.0)];
    expect(snapSpeechToWords(speech, null)[0].start).toBe(1.7);
  });

  it("merges speech segments that overlap after snapping and padding", () => {
    // שני קטעים מפורדים (1.7–2.0, 2.1–2.6) — אחרי הצמדה למילים + pad
    // הם מתרחבים לחפיפה (1.45–2.35, 1.95–2.75) ומאוחדים לקטע אחד בלי חפיפה.
    const speech = [c("s1", 1.7, 2.0), c("s2", 2.1, 2.6)];
    const words = [
      { text: "שלום", start: 1.5, end: 1.9 },
      { text: "וברכה", start: 2.0, end: 2.3 },
      { text: "המשך", start: 2.4, end: 2.7 },
    ];
    const r = snapSpeechToWords(speech, words, { maxSnapSec: 0.5, padSec: 0.05 });
    expect(r).toHaveLength(1);
    expect(r[0].start).toBeCloseTo(1.45, 5);
    expect(r[0].end).toBeCloseTo(2.75, 5);
  });

  it("never leaves overlapping or touching same-source segments", () => {
    // רצף קטעים קרובים שמתרחבים עד לנגיעה/חפיפה — הפלט חייב להיות בלי חפיפות.
    const speech = [c("s1", 1.7, 2.0), c("s2", 2.1, 2.6), c("s3", 2.7, 3.2)];
    const words = [
      { text: "שלום", start: 1.5, end: 1.9 },
      { text: "וברכה", start: 2.0, end: 2.3 },
      { text: "המשך", start: 2.4, end: 2.7 },
      { text: "השיעור", start: 2.8, end: 3.1 },
    ];
    const r = snapSpeechToWords(speech, words, { maxSnapSec: 0.5, padSec: 0.05 });
    for (let i = 1; i < r.length; i++) {
      expect(r[i].start).toBeGreaterThan(r[i - 1].end - 1e-6);
    }
    expect(r.every((s) => s.end > s.start)).toBe(true);
  });
});
