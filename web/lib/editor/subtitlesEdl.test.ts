import { describe, it, expect } from "vitest";
import { edlToCues, edlToCuesWithScript } from "./subtitlesEdl";

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

describe("edlToCuesWithScript", () => {
  it("replaces ASR gibberish with clean script text while keeping timing", () => {
    const clips = [{ id: "a", sourceId: "s1", start: 0, end: 10 }];
    const asr = [
      { text: "הגברת", start: 0.2, end: 0.6 },
      { text: "טיפרת", start: 0.7, end: 1.1 },
      { text: "עתר", start: 1.2, end: 1.5 },
      { text: "אדם", start: 2.0, end: 2.3 },
      { text: "קשר", start: 2.4, end: 2.8 },
    ];
    const script = "הגברת תפארת עטר אדם כשר";
    const cues = edlToCuesWithScript(clips, () => asr, script, 80);
    const text = cues.map((c) => c.text).join(" ");
    expect(text).toContain("תפארת");
    expect(text).toContain("כשר");
    expect(text).not.toContain("טיפרת");
    expect(text).not.toContain("קשר");
    expect(cues[0].start).toBeGreaterThanOrEqual(0);
  });
});
