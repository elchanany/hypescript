import { describe, expect, it } from "vitest";
import { clampOverlayTransform, imageOverlayGeometry, makeTitlePopup } from "./overlay";

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

  it("preserves image ratio and keeps logo geometry fully inside the canvas", () => {
    const logo = imageOverlayGeometry(1080, 1920, { width: 1000, height: 400 }, "logo_top_left");
    expect(logo.w / logo.h).toBeCloseTo(2.5, 5);
    expect(logo.x - logo.w / 2).toBeGreaterThanOrEqual(0);
    expect(logo.y - logo.h / 2).toBeGreaterThanOrEqual(0);
    const clamped = clampOverlayTransform({ ...logo, x: -500, y: 4000 }, 1080, 1920);
    expect(clamped.x - clamped.w / 2).toBeGreaterThanOrEqual(0);
    expect(clamped.y + clamped.h / 2).toBeLessThanOrEqual(1920);
  });

  it("fits a full end-card image without cropping or leaving the canvas", () => {
    const fit = imageOverlayGeometry(1920, 1080, { width: 800, height: 1200 }, "fit_canvas");
    expect(fit.w / fit.h).toBeCloseTo(2 / 3, 5);
    expect(fit.h).toBe(1080);
    expect(fit.x).toBe(960);
    expect(fit.y).toBe(540);
  });
});
