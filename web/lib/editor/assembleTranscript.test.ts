import { describe, it, expect } from "vitest";
import { assembleTranscript, assembledDuration, formatTranscriptLines } from "./assembleTranscript";
import { GAP_SOURCE } from "./timelineOps";

describe("assembleTranscript", () => {
  const words: Record<string, any[]> = {
    s1: [
      { text: "שלום", start: 1.0, end: 1.3 },
      { text: "עולם", start: 1.4, end: 1.8 },
      { text: "ביי", start: 5.0, end: 5.3 },
    ],
    s2: [
      { text: "ערב", start: 0.2, end: 0.5 },
      { text: "טוב", start: 0.6, end: 0.9 },
    ],
  };

  it("remaps source words onto assembled timeline after cuts/reorder", () => {
    const clips = [
      { id: "a", sourceId: "s1", start: 1.0, end: 2.0 }, // 1s of s1 → assembled 0..1
      { id: "b", sourceId: "s2", start: 0.0, end: 1.0 }, // 1s of s2 → assembled 1..2
    ];
    const out = assembleTranscript(clips, (sid) => words[sid]);
    expect(out.map((w) => w.text)).toEqual(["שלום", "עולם", "ערב", "טוב"]);
    expect(out[0].start).toBeCloseTo(0.0, 2); // 1.0 - 1.0
    expect(out[2].start).toBeCloseTo(1.2, 2); // 1 + (0.2 - 0)
    expect(out.some((w) => w.text === "ביי")).toBe(false); // outside kept range
  });

  it("advances time across gaps without emitting words", () => {
    const clips = [
      { id: "a", sourceId: "s1", start: 1.0, end: 2.0 },
      { id: "g", sourceId: GAP_SOURCE, start: 0, end: 0.5 },
      { id: "b", sourceId: "s2", start: 0.0, end: 1.0 },
    ];
    const out = assembleTranscript(clips, (sid) => words[sid]);
    expect(out[0].text).toBe("שלום");
    const erev = out.find((w) => w.text === "ערב")!;
    expect(erev.start).toBeCloseTo(1.5 + 0.2, 2); // after 1s clip + 0.5 gap
    expect(assembledDuration(clips)).toBeCloseTo(2.5, 2);
  });

  it("skips disabled clips", () => {
    const clips = [
      { id: "a", sourceId: "s1", start: 1.0, end: 2.0, enabled: false },
      { id: "b", sourceId: "s2", start: 0.0, end: 1.0 },
    ];
    const out = assembleTranscript(clips, (sid) => words[sid]);
    expect(out.map((w) => w.text)).toEqual(["ערב", "טוב"]);
    expect(out[0].start).toBeCloseTo(0.2, 2);
  });

  it("formatTranscriptLines shows assembled timestamps", () => {
    const clips = [{ id: "a", sourceId: "s1", start: 1.0, end: 2.0 }];
    const out = assembleTranscript(clips, (sid) => words[sid]);
    const text = formatTranscriptLines(out);
    expect(text).toContain("שלום");
    expect(text).toMatch(/\[0\./);
  });
});
