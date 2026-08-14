import { describe, expect, it } from "vitest";
import { renamedMediaName } from "./naming";

describe("media display names", () => {
  it("keeps the original extension when the user omits it", () => {
    expect(renamedMediaName("camera-original.mp4", "ראיון ראשי")).toBe("ראיון ראשי.mp4");
  });

  it("accepts an explicit new extension and sanitizes invalid filename characters", () => {
    expect(renamedMediaName("voice.wav", "קריינות:סיום.mp3")).toBe("קריינות-סיום.mp3");
  });
});

