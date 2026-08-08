import { describe, expect, it } from "vitest";
import type { Word } from "@/lib/models";
import type { Clip } from "./model";
import { buildTimelineEvidence, evidenceCounts } from "./semanticTimeline";

describe("semantic timeline evidence", () => {
  it("maps speech, provider events, and explicit gaps without semantic guessing", () => {
    const clips: Clip[] = [
      { id: "c1", sourceId: "m", start: 10, end: 12 },
      { id: "g", sourceId: "__gap__", start: 0, end: 0.5 },
      { id: "c2", sourceId: "m", start: 20, end: 21 },
    ];
    const words: Word[] = [
      { text: "שלום", start: 10.1, end: 10.4, type: "word", speakerId: "A" },
      { text: "עולם", start: 10.5, end: 10.8, type: "word", speakerId: "A" },
      { text: "[cough]", start: 11, end: 11.25, type: "audio_event" },
      { text: " ", start: 11.3, end: 11.4, type: "spacing" },
      { text: "סוף", start: 20.2, end: 20.5, type: "word" },
    ];
    const spans = buildTimelineEvidence(clips, (sourceId) => sourceId === "m" ? words : []);
    expect(spans.map((span) => span.kind)).toEqual(["speech", "audio_event", "gap", "speech"]);
    expect(spans[0]).toMatchObject({ text: "שלום עולם", evidence: "transcript_word" });
    expect(spans[0].start).toBeCloseTo(0.1, 8);
    expect(spans[0].end).toBeCloseTo(0.8, 8);
    expect(spans[1]).toMatchObject({ text: "[cough]", evidence: "provider_audio_event" });
    expect(spans[2]).toMatchObject({ start: 2, end: 2.5, evidence: "explicit_timeline_gap" });
    expect(spans[3]).toMatchObject({ text: "סוף" });
    expect(spans[3].start).toBeCloseTo(2.7, 8);
    expect(spans[3].end).toBeCloseTo(3, 8);
    expect(evidenceCounts(spans)).toEqual({ speech: 2, audio_event: 1, gap: 1 });
    expect(spans.some((span) => /breath|laugh/i.test(span.text || ""))).toBe(false);
  });

  it("skips disabled clips and never converts transcript absence into a gap", () => {
    const clips: Clip[] = [
      { id: "off", sourceId: "m", start: 0, end: 1, enabled: false },
      { id: "on", sourceId: "m", start: 2, end: 4 },
    ];
    expect(buildTimelineEvidence(clips, () => [])).toEqual([]);
  });
});
