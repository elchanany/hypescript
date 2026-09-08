import { describe, expect, it } from "vitest";
import { filterWordsBySpeaker, formatSpeakerLabel, formatTranscriptLines } from "./assembleTranscript";
import type { Word } from "@/lib/models";

const w = (text: string, start: number, end: number, speakerId?: string): Word => ({
  text, start, end, type: "word", speakerId,
});

describe("formatTranscriptLines — דוברים", () => {
  it("מציג תווית דובר ושובר שורה בהחלפת דובר", () => {
    const lines = formatTranscriptLines([
      w("שלום", 0, 0.4, "speaker_0"),
      w("עולם", 0.4, 0.8, "speaker_0"),
      w("מה", 1.0, 1.2, "speaker_1"),
      w("נשמע", 1.2, 1.6, "speaker_1"),
    ]);
    expect(lines).toContain("דובר 0");
    expect(lines).toContain("דובר 1");
    expect(lines.split("\n")).toHaveLength(2);
  });

  it("filterWordsBySpeaker מתאים גם למספר בלבד", () => {
    const words = [w("א", 0, 0.2, "speaker_0"), w("ב", 0.2, 0.4, "speaker_1")];
    expect(filterWordsBySpeaker(words, "0").map((x) => x.text)).toEqual(["א"]);
    expect(formatSpeakerLabel("speaker_2")).toBe("דובר 2");
  });
});
