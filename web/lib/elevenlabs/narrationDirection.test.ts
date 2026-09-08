import { describe, expect, it } from "vitest";
import {
  applyDirectionTag,
  buildDirectedNarrationText,
  hasLeadingDirectionTag,
  splitNarrationBeats,
} from "./narrationDirection";
import { campaignVoiceScore, filterAndRankVoices, type VoiceRow } from "./voicesFilter";

describe("narrationDirection", () => {
  it("מזהה תגית קיימת ולא מכפיל", () => {
    expect(hasLeadingDirectionTag("[controlled] שלום")).toBe(true);
    expect(applyDirectionTag("[firm] כבר יש", "quiet")).toBe("[firm] כבר יש");
  });

  it("מזריק תגית מפריסט רגש", () => {
    const r = buildDirectedNarrationText("הממשלה יציבה.", { emotion: "restrained_critical" });
    expect(r.text.startsWith("[controlled]")).toBe(true);
    expect(r.applied).toBe("controlled");
    expect(r.stability).toBeLessThan(0.5);
  });

  it("direction_tag גובר על emotion", () => {
    const r = buildDirectedNarrationText("די.", { emotion: "firm", direction_tag: "disappointed" });
    expect(r.text).toBe("[disappointed] די.");
    expect(r.applied).toBe("disappointed");
  });

  it("מפצל קריינות לשורות", () => {
    const beats = splitNarrationBeats("שורה אחת.\nשורה שתיים.\nשורה שלוש.");
    expect(beats).toEqual(["שורה אחת.", "שורה שתיים.", "שורה שלוש."]);
  });
});

describe("voicesFilter", () => {
  const voices: VoiceRow[] = [
    {
      voice_id: "a",
      name: "Laura Playful",
      description: "quirky cute energetic",
      labels: { gender: "female", language: "en" },
    },
    {
      voice_id: "b",
      name: "Brian",
      description: "Deep resonant narrative mature",
      labels: { gender: "male", accent: "american" },
      high_quality_base_model_ids: ["eleven_v3"],
    },
    {
      voice_id: "c",
      name: "Avraham",
      description: "Israeli Hebrew narrator",
      labels: { gender: "male", language: "he" },
    },
  ];

  it("לא מחזיר רשימה ריקה כשאין תווית hebrew — מחזיר מדורג עם הערה", () => {
    const onlyEn = voices.filter((v) => v.voice_id !== "c");
    const { voices: out, noteHe } = filterAndRankVoices(onlyEn, {
      language: "he",
      preferCampaign: true,
      gender: "male",
    });
    expect(out.length).toBeGreaterThan(0);
    expect(noteHe).toMatch(/לא נמצאו קולות עם תווית/);
    expect(out[0].voice_id).toBe("b");
  });

  it("מעדיף קול עם תווית עברית כשיש", () => {
    const { voices: out } = filterAndRankVoices(voices, { language: "he", preferCampaign: true });
    expect(out[0].voice_id).toBe("c");
  });

  it("מנקד קמפיין גבוה יותר ל-narrative מאשר ל-cute", () => {
    expect(campaignVoiceScore(voices[1]!)).toBeGreaterThan(campaignVoiceScore(voices[0]!));
  });
});
