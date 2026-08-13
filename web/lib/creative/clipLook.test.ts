// הבדיקה שמקיימת את חוזה הפאריטי בפועל: התצוגה המקדימה והייצוא קוראים
// לאותה פונקציה, ולכן אי-אפשר שאחד ישתנה בלי השני.

import { describe, expect, it } from "vitest";
import type { Clip } from "@/lib/editor/model";
import { buildConcatGraph } from "@/lib/render/graph";
import { VISUAL_EFFECTS, effectById } from "./effects";
import { clipLook, hasLook } from "./clipLook";

const clip = (patch: Partial<Clip> = {}): Clip =>
  ({ id: "c1", sourceId: "m1", start: 0, end: 2, ...patch });

const media = [{
  id: "m1", name: "lesson.mp4", kind: "video" as const,
  file: { name: "lesson.mp4" } as File, duration: 10, url: "blob:x",
}];

describe("מראה הקליפ", () => {
  it("קליפ בלי לוק אינו מוסיף שום פילטר", () => {
    expect(clipLook(clip())).toEqual({ css: "none", ffmpeg: "" });
    expect(hasLook(clip())).toBe(false);
  });

  it("לוק מהקטלוג מגיע לשני המסלולים", () => {
    const look = clipLook(clip({ effectId: "vivid" }));
    expect(look.ffmpeg).toBe(effectById("vivid")!.ffmpeg);
    expect(look.css).toBe(effectById("vivid")!.css);
  });

  it("עוצמה חלקית מזיזה את אותם מספרים בשני המסלולים", () => {
    const look = clipLook(clip({ effectId: "vivid", effectAmount: 0.5 }));
    expect(look.ffmpeg).toContain("saturation=1.175");
    expect(look.css).toContain("saturate(1.175)");
  });

  it("עוצמה 0 מבטלת את הלוק", () => {
    expect(clipLook(clip({ effectId: "vivid", effectAmount: 0 }))).toEqual({ css: "none", ffmpeg: "" });
  });

  it("כיוונון ידני מוחל אחרי הלוק, בשני המסלולים", () => {
    const look = clipLook(clip({ effectId: "mono", contrast: 1.3, saturation: 0.5 }));
    const monoIndex = look.ffmpeg.indexOf(effectById("mono")!.ffmpeg);
    const manualIndex = look.ffmpeg.indexOf("eq=contrast=1.300:saturation=0.500");
    expect(monoIndex).toBeGreaterThanOrEqual(0);
    expect(manualIndex).toBeGreaterThan(monoIndex);
    expect(look.css).toContain("contrast(1.300) saturate(0.500)");
  });

  it("לוק לא מוכר אינו מפיל ואינו ממציא פילטר", () => {
    expect(clipLook(clip({ effectId: "לא-קיים" })).ffmpeg).toBe("");
  });

  it("מזהה לוק אינו שובר את גרף הרינדור, ומופיע בו", () => {
    const graph = buildConcatGraph([clip({ effectId: "teal_orange" })], media);
    expect(graph.filterComplex).toContain(effectById("teal_orange")!.ffmpeg);
    expect(graph.filterComplex).not.toContain(",,");
  });

  it("כל לוק בקטלוג מייצר גרף רינדור תקין", () => {
    for (const effect of VISUAL_EFFECTS) {
      const graph = buildConcatGraph([clip({ effectId: effect.id })], media);
      expect(graph.filterComplex, `${effect.id}: פסיק כפול`).not.toContain(",,");
      expect(graph.filterComplex, `${effect.id}: רווח בשרשרת`).not.toMatch(/,\s+[a-z]/);
      if (effect.ffmpeg) expect(graph.filterComplex).toContain(effect.ffmpeg);
    }
  });

  it("ללא לוק הגרף נשאר בדיוק כפי שהיה", () => {
    const before = buildConcatGraph([clip()], media).filterComplex;
    expect(before).toContain("scale=1280:720");
    expect(before).not.toContain("eq=");
  });
});
