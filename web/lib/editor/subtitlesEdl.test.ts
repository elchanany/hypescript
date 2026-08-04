import { describe, it, expect } from "vitest";
import {
  edlToCues,
  edlToCuesWithScript,
  progressiveCues,
  phraseCues,
  collapseProgressiveForBurn,
} from "./subtitlesEdl";

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

  it("skips audio_event tokens so they never appear as captions", () => {
    const dirty = [
      { text: "שלום", start: 0.1, end: 0.4 },
      { text: "(laughs)", start: 0.45, end: 0.7, type: "audio_event" },
      { text: "עולם", start: 0.8, end: 1.1 },
    ];
    const cues = edlToCues([{ id: "a", sourceId: "s1", start: 0, end: 2 }], () => dirty as any, 42);
    const text = cues.map((c) => c.text).join(" ");
    expect(text).toContain("שלום");
    expect(text).toContain("עולם");
    expect(text).not.toContain("laughs");
  });
});

describe("progressive speech-synced captions", () => {
  const words = [
    { text: "שלום", start: 0.0, end: 0.35 },
    { text: "וברכה", start: 0.4, end: 0.75 },
    // pause > 0.45 → new phrase
    { text: "אני", start: 1.4, end: 1.6 },
    { text: "רוצה", start: 1.65, end: 1.95 },
    { text: "לדבר", start: 2.0, end: 2.35 },
    { text: "על", start: 2.4, end: 2.6 },
  ];

  it("reveals words cumulatively within a phrase (not all at once)", () => {
    const cues = progressiveCues(words, 28, 0.45);
    // first phrase: שלום → שלום וברכה
    expect(cues[0].text).toContain("שלום");
    expect(cues[0].text).not.toContain("וברכה");
    expect(cues[1].text).toContain("שלום");
    expect(cues[1].text).toContain("וברכה");
    // second phrase starts fresh after pause
    const secondPhrase = cues.find((c) => c.text.includes("אני") && !c.text.includes("שלום"))!;
    expect(secondPhrase).toBeTruthy();
    expect(secondPhrase.start).toBeGreaterThanOrEqual(1.3);
  });

  it("phrase mode keeps full phrase as one cue", () => {
    const cues = phraseCues(words, 28, 0.45);
    expect(cues.length).toBe(2);
    expect(cues[0].text).toMatch(/שלום.*וברכה/);
    expect(cues[1].text).toMatch(/אני.*רוצה.*לדבר.*על/);
  });

  it("does not leave gaps that make words 'flee' between adjacent cues", () => {
    const cues = progressiveCues(words, 28, 0.45);
    for (let i = 0; i < cues.length - 1; i++) {
      const gap = cues[i + 1].start - cues[i].end;
      // within a continuous phrase the gap must be ~0; between phrases can be larger
      if (gap > 0 && gap < 0.35) {
        expect(gap).toBe(0);
      }
    }
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

  it("uses 1:1 ASR timing when script word count matches", () => {
    const clips = [{ id: "a", sourceId: "s1", start: 0, end: 5 }];
    const asr = [
      { text: "שלופ", start: 0.1, end: 0.4 },
      { text: "וברכה", start: 0.5, end: 0.9 },
    ];
    const cues = edlToCuesWithScript(clips, () => asr, "שלום וברכה", 28, { mode: "phrase" });
    expect(cues[0].text).toContain("שלום");
    expect(cues[0].text).not.toContain("שלופ");
    expect(cues[0].start).toBeCloseTo(0.1, 1);
  });
});

describe("collapseProgressiveForBurn", () => {
  it("collapses cumulative chains into phrase-final cues when over cap", () => {
    const subs = [
      { id: "1", start: 0, end: 0.3, text: "‏שלום" },
      { id: "2", start: 0.3, end: 0.6, text: "‏שלום וברכה" },
      { id: "3", start: 1.0, end: 1.3, text: "‏אני" },
      { id: "4", start: 1.3, end: 1.6, text: "‏אני רוצה" },
    ];
    const collapsed = collapseProgressiveForBurn(subs, 2);
    expect(collapsed.length).toBeLessThanOrEqual(2);
    expect(collapsed.some((c) => c.text.includes("וברכה"))).toBe(true);
  });
});
