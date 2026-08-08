import { describe, expect, it } from "vitest";
import { makeTitlePopup } from "./overlay";

describe("title popup presets", () => {
  it("creates distinct source, speaker, and dedication cards with exportable styling", () => {
    const source = makeTitlePopup(1920, 1080, [], "מתוך שיעור", 0, 3, "source_popup");
    const speaker = makeTitlePopup(1920, 1080, [], "הרב פלוני\nראש הישיבה", 1, 5, "speaker_card");
    const dedication = makeTitlePopup(1920, 1080, [], "לעילוי נשמת\nפלוני", 2, 7, "dedication_card");
    expect(source.transform.y).toBeGreaterThan(700);
    expect(speaker.transform.w).toBeLessThan(source.transform.w);
    expect(speaker.borderColor).toBe("#16d9e3");
    expect(dedication.transform.y).toBeLessThan(source.transform.y);
    expect(dedication).toMatchObject({ borderColor: "#d6ad55", background: "rgba(13,25,48,0.94)" });
  });
});
