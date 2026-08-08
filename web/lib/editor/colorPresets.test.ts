import { describe, expect, it } from "vitest";
import { CLIP_COLOR_PRESETS, colorPreset, matchingColorPreset } from "./colorPresets";

describe("clip color presets", () => {
  it("contains only values supported by the shared color pipeline", () => {
    for (const preset of CLIP_COLOR_PRESETS) {
      expect(preset.contrast).toBeGreaterThanOrEqual(0.5);
      expect(preset.contrast).toBeLessThanOrEqual(2);
      expect(preset.saturation).toBeGreaterThanOrEqual(0);
      expect(preset.saturation).toBeLessThanOrEqual(3);
    }
  });

  it("resolves ids and Hebrew labels and detects custom values", () => {
    expect(colorPreset("mono")).toMatchObject({ saturation: 0 });
    expect(colorPreset("שחור-לבן")?.id).toBe("mono");
    expect(matchingColorPreset(1.1, 1.35)).toBe("vivid");
    expect(matchingColorPreset(1.02, 1)).toBe("custom");
  });
});
