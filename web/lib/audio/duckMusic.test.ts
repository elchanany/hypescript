import { describe, expect, it } from "vitest";
import { mergeSpeechWindows, planMusicDuck } from "./duckMusic";

describe("duckMusic", () => {
  it("בלי דיבור — מקטע אחד בעוצמה מלאה", () => {
    const segs = planMusicDuck({
      musicStart: 0,
      musicDuration: 10,
      speechSpans: [],
      fullVolume: 0.5,
    });
    expect(segs).toEqual([{ offset: 0, duration: 10, volume: 0.5, ducked: false }]);
  });

  it("מנמיך תחת חלון דיבור ומאחד חפיפות", () => {
    const windows = mergeSpeechWindows(
      [{ start: 2, end: 3 }, { start: 2.5, end: 4 }],
      0,
      10,
      0.1,
    );
    expect(windows).toHaveLength(1);
    expect(windows[0]!.start).toBeCloseTo(1.9, 5);
    expect(windows[0]!.end).toBeCloseTo(4.1, 5);

    const segs = planMusicDuck({
      musicStart: 0,
      musicDuration: 10,
      speechSpans: [{ start: 2, end: 4 }],
      fullVolume: 0.6,
      duckedVolume: 0.1,
      padSec: 0,
    });
    expect(segs.some((s) => s.ducked && s.volume === 0.1)).toBe(true);
    expect(segs.some((s) => !s.ducked && s.volume === 0.6)).toBe(true);
    const total = segs.reduce((a, s) => a + s.duration, 0);
    expect(total).toBeCloseTo(10, 5);
  });
});
