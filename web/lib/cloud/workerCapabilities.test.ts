import { describe, expect, it } from "vitest";
import { NO_CAPABILITIES, parseWorkerCapabilities } from "./workerCapabilities";

describe("parseWorkerCapabilities", () => {
  it("treats an old worker that reports nothing as having no new capabilities", () => {
    // זה המקרה החשוב: עובד שנפרס לפני שהיכולת נוספה. אסור שהאתר ישלח לו
    // כתוביות, כי הוא יתעלם מהן ויחזיר וידאו "מוצלח" בלי כתוביות.
    expect(parseWorkerCapabilities(undefined).subtitles).toBe(false);
    expect(parseWorkerCapabilities({}).subtitles).toBe(false);
    expect(parseWorkerCapabilities(null)).toEqual(NO_CAPABILITIES);
  });

  it("accepts only a literal true, never a truthy string", () => {
    expect(parseWorkerCapabilities({ subtitles: "yes" }).subtitles).toBe(false);
    expect(parseWorkerCapabilities({ subtitles: 1 }).subtitles).toBe(false);
    expect(parseWorkerCapabilities({ subtitles: true }).subtitles).toBe(true);
  });

  it("keeps the capabilities the worker always had, even when unreported", () => {
    const caps = parseWorkerCapabilities({});
    expect(caps.imageOverlays).toBe(true);
    expect(caps.audioMix).toBe(true);
  });

  it("reads a full modern report", () => {
    expect(parseWorkerCapabilities({ subtitles: true, imageOverlays: true, textOverlays: false, audioMix: true }))
      .toEqual({ subtitles: true, imageOverlays: true, textOverlays: false, audioMix: true });
  });

  it("does not enable text overlays just because the worker mentioned them", () => {
    expect(parseWorkerCapabilities({ textOverlays: "planned" }).textOverlays).toBe(false);
  });
});
