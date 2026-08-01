import { describe, it, expect } from "vitest";
import { edlToCues } from "./subtitlesEdl";

describe("edlToCues (multi-source)", () => {
  const words: Record<string, any[]> = {
    s1: [{ text: "שלום", start: 0.1, end: 0.5 }, { text: "עולם", start: 0.6, end: 1.0 }],
    s2: [{ text: "ערב", start: 0.1, end: 0.5 }, { text: "טוב", start: 0.6, end: 1.0 }],
  };
  const clips = [
    { id: "a", sourceId: "s1", start: 0, end: 2 }, // assembled 0..2
    { id: "b", sourceId: "s2", start: 0, end: 2 }, // assembled 2..4
  ];

  it("captions each clip from its OWN source transcript, mapped to assembled time", () => {
    const cues = edlToCues(clips, (sid) => words[sid], 42);
    const text = cues.map((c) => c.text).join(" | ");
    expect(text).toContain("שלום");
    expect(text).toContain("ערב"); // second source is NOT dropped/duplicated
    // the second-source cue sits after the first clip (assembled offset >= 2)
    const second = cues.find((c) => c.text.includes("ערב"))!;
    expect(second.start).toBeGreaterThanOrEqual(2);
  });

  it("returns nothing for a source with no transcript (no crash)", () => {
    const cues = edlToCues(clips, (sid) => (sid === "s1" ? words.s1 : null), 42);
    expect(cues.some((c) => c.text.includes("שלום"))).toBe(true);
    expect(cues.some((c) => c.text.includes("ערב"))).toBe(false);
  });
});
