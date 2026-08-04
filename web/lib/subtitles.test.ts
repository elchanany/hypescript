import { describe, it, expect } from "vitest";
import { buildCues } from "./subtitles";

describe("buildCues progressive", () => {
  const keeps = [{ start: 0, end: 10 }];
  const words = [
    { text: "שלום", start: 0.0, end: 0.3 },
    { text: "וברכה", start: 0.35, end: 0.7 },
    { text: "אני", start: 1.5, end: 1.7 },
    { text: "רוצה", start: 1.75, end: 2.05 },
  ];

  it("defaults to progressive reveal by speech rhythm", () => {
    const cues = buildCues(words, keeps);
    expect(cues[0].text).toContain("שלום");
    expect(cues[0].text).not.toContain("וברכה");
    expect(cues.some((c) => c.text.includes("וברכה"))).toBe(true);
  });

  it("phrase mode groups by pause", () => {
    const cues = buildCues(words, keeps, 28, 2, 0.45, 5, "phrase");
    expect(cues.length).toBe(2);
    expect(cues[0].text).toMatch(/שלום/);
    expect(cues[1].text).toMatch(/אני/);
  });
});
