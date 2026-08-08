import { describe, it, expect } from "vitest";
import { scriptToClips } from "./scriptClips";

describe("scriptToClips", () => {
  it("follows script order without jumping to a distant false match", () => {
    const words = [
      { text: "שלום", start: 1.0, end: 1.3 },
      { text: "וברכה", start: 1.4, end: 1.8 },
      { text: "השיעור", start: 2.0, end: 2.4 },
      { text: "הזה", start: 2.5, end: 2.8 },
      // later unrelated repeat of early words
      { text: "שלום", start: 117.0, end: 117.3 },
      { text: "וברכה", start: 117.4, end: 117.8 },
      { text: "משהו", start: 118.0, end: 118.4 },
    ];
    const script = "שלום וברכה השיעור הזה";
    const clips = scriptToClips(words, script, "v1");
    expect(clips.length).toBeGreaterThan(0);
    expect(clips[0].start).toBeLessThan(10);
    expect(clips.every((c) => c.start < 20)).toBe(true);
  });

  it("does not insert a mid-script jump to a distant echo", () => {
    const words = [
      { text: "הקדשה", start: 1.0, end: 1.4 },
      { text: "ראשונה", start: 1.5, end: 2.0 },
      { text: "המשך", start: 5.0, end: 5.4 },
      { text: "רגיל", start: 5.5, end: 5.9 },
      // false echo of a rare mangled token much later
      { text: "מילה", start: 117.0, end: 117.4 },
      { text: "נדירה", start: 117.5, end: 118.0 },
    ];
    // "מילה נדירה" appears only at 117; after matching early text we must not jump there
    // when looking for something that doesn't match locally — skip rather than jump
    const script = "הקדשה ראשונה המשך רגיל מילה נדירה";
    const clips = scriptToClips(words, script, "v1", { maxJumpSec: 40 });
    // early parts matched; distant pair may be included only if within jump window from last end (~5.9+40)
    // 117 is beyond 5.9+40=45.9 — must NOT appear
    expect(clips.every((c) => c.start < 50)).toBe(true);
    expect(clips.some((c) => c.start > 100)).toBe(false);
  });

  it("supports intentional repeats later in the script", () => {
    const words = [
      { text: "אמן", start: 1.0, end: 1.2 },
      { text: "ואמן", start: 1.3, end: 1.5 },
      { text: "המשך", start: 5.0, end: 5.4 },
      // מספיק מילים זרות כדי לשבור התאמה רעבתנית (gapTol=3)
      { text: "א", start: 6.0, end: 6.1 },
      { text: "ב", start: 6.2, end: 6.3 },
      { text: "ג", start: 6.4, end: 6.5 },
      { text: "ד", start: 6.6, end: 6.7 },
      { text: "אמן", start: 10.0, end: 10.2 },
      { text: "ואמן", start: 10.3, end: 10.5 },
    ];
    const script = "אמן ואמן המשך אמן ואמן";
    const clips = scriptToClips(words, script, "v1");
    expect(clips.length).toBeGreaterThanOrEqual(2);
    expect(clips[clips.length - 1].start).toBeGreaterThanOrEqual(9);
  });

  it("drops tiny false-match clips", () => {
    const words = [
      { text: "שלום", start: 1.0, end: 1.5 },
      { text: "וברכה", start: 1.6, end: 2.2 },
      { text: "שלום", start: 3.0, end: 3.05 }, // too short match noise
    ];
    const script = "שלום וברכה";
    const clips = scriptToClips(words, script, "v1", { minClipSec: 0.2 });
    expect(clips.every((c) => c.end - c.start >= 0.2)).toBe(true);
  });

  it("clamps tolerated tiny backward overlap to the previous emitted end", () => {
    // וברכה מסתיימת רחב (1.9) וקובעת את lastEndTime; הרץ הבא מתחיל 0.1s לפניו
    // (בתוך חלון ה-lookback הקטן שנסבל) — ההידוק נוהק את ההתחלה לסוף הקליפ הקודם.
    // הטוקנים הזרים (א–ד), שתחילתותיהן בתוך חותם הזמן הרחב, שוברים את הרצף
    // (gapTol=3) ומכריחים שני רצים נפרדים.
    const words = [
      { text: "שלום", start: 1.0, end: 1.2 },
      { text: "וברכה", start: 1.3, end: 1.9 }, // סיום רחב — קובע lastEndTime
      { text: "א", start: 1.4, end: 1.5 },
      { text: "ב", start: 1.5, end: 1.6 },
      { text: "ג", start: 1.6, end: 1.7 },
      { text: "ד", start: 1.7, end: 1.8 },
      { text: "שלום", start: 1.8, end: 1.9 }, // מתחיל 0.1s לפני lastEndTime
      { text: "המשך", start: 2.1, end: 2.3 },
    ];
    const script = "שלום וברכה שלום המשך";
    const clips = scriptToClips(words, script, "v1", { gapTol: 3 });
    expect(clips.map((c) => [c.start, c.end])).toEqual([
      [1.0, 1.9],
      [1.9, 2.3],
    ]);
    for (let i = 1; i < clips.length; i++) {
      expect(clips[i].start).toBeGreaterThanOrEqual(clips[i - 1].end);
    }
  });

  it("drops clips whose clamped remainder falls below minClipSec", () => {
    // אותו מבנה, אבל הרץ החופף קצר: אחרי ההידוק נשאר 0.15s — מתחת ל-minClipSec.
    // בקוד הישן הוא היה נפלט כחפיפה (0.25s ≥ minClipSec); עכשיו הוא נזרק.
    const words = [
      { text: "שלום", start: 1.0, end: 1.2 },
      { text: "וברכה", start: 1.3, end: 1.9 }, // סיום רחב — קובע lastEndTime
      { text: "א", start: 1.4, end: 1.5 },
      { text: "ב", start: 1.5, end: 1.6 },
      { text: "ג", start: 1.6, end: 1.7 },
      { text: "ד", start: 1.7, end: 1.8 },
      { text: "שלום", start: 1.8, end: 2.05 }, // חופף 0.1s; אחרי ההידוק 0.15s
    ];
    const script = "שלום וברכה שלום";
    const clips = scriptToClips(words, script, "v1", { gapTol: 3, minClipSec: 0.2 });
    expect(clips.map((c) => [c.start, c.end])).toEqual([[1.0, 1.9]]);
    for (let i = 1; i < clips.length; i++) {
      expect(clips[i].start).toBeGreaterThanOrEqual(clips[i - 1].end);
    }
  });
});
