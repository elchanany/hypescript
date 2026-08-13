// אכיפת חוזה הקטלוג מ-docs/CREATIVE_LIBRARY_ARCHITECTURE.md:
// פריט קיים רק אם יש לו מזהה יציב, שם בעברית, ושני מימושים — Preview וייצוא.
// בלי זה נוצרים כפתורים שמדמים עריכה במקום לבצע אותה.

import { describe, expect, it } from "vitest";
import {
  EFFECT_CATEGORIES, VISUAL_EFFECTS, effectById, effectsByCategory, scaleEffect, searchEffects,
} from "./effects";
import {
  BLOCKED_XFADE, TRANSITIONS, TRANSITION_CATEGORIES, safeTransitionDuration, searchTransitions,
  transitionById, transitionsByCategory, xfadeFilter,
} from "./transitions";
import { TEXT_CATEGORIES, TEXT_PRESETS, searchTextPresets, textPresetById, textPresetsByCategory } from "./textPresets";

/** רשימת xfade המלאה כפי ש-FFmpeg מדווח עליה (בלי custom, שדורש שיידר). */
const FFMPEG_XFADE = `fade wipeleft wiperight wipeup wipedown slideleft slideright slideup slidedown
circlecrop rectcrop distance fadeblack fadewhite radial smoothleft smoothright smoothup smoothdown
circleopen circleclose vertopen vertclose horzopen horzclose dissolve pixelize diagtl diagtr diagbl
diagbr hlslice hrslice vuslice vdslice hblur fadegrays wipetl wipetr wipebl wipebr squeezeh squeezev
zoomin fadefast fadeslow hlwind hrwind vuwind vdwind coverleft coverright coverup coverdown
revealleft revealright revealup revealdown`.split(/\s+/).filter(Boolean);

describe("קטלוג אפקטים", () => {
  it("גדול מספיק כדי להיות שימושי", () => {
    expect(VISUAL_EFFECTS.length).toBeGreaterThanOrEqual(40);
  });

  it("לכל אפקט יש מזהה ייחודי ושם בעברית", () => {
    const ids = new Set<string>();
    for (const effect of VISUAL_EFFECTS) {
      expect(effect.id, "מזהה ריק").toBeTruthy();
      expect(ids.has(effect.id), `מזהה כפול: ${effect.id}`).toBe(false);
      ids.add(effect.id);
      expect(effect.labelHe, `${effect.id}: אין שם`).toBeTruthy();
      expect(/[א-ת]/.test(effect.labelHe), `${effect.id}: השם אינו בעברית`).toBe(true);
    }
  });

  it("לכל אפקט שני מימושים — Preview וייצוא", () => {
    for (const effect of VISUAL_EFFECTS) {
      if (effect.id === "none") continue;
      expect(effect.css, `${effect.id}: אין מימוש Preview`).toBeTruthy();
      expect(effect.css).not.toBe("none");
      expect(effect.ffmpeg, `${effect.id}: אין מימוש ייצוא`).toBeTruthy();
    }
  });

  it("שרשראות ה-FFmpeg תקינות מבנית", () => {
    for (const effect of VISUAL_EFFECTS) {
      if (!effect.ffmpeg) continue;
      expect(effect.ffmpeg.startsWith(","), `${effect.id}: פסיק מוביל`).toBe(false);
      expect(effect.ffmpeg.endsWith(","), `${effect.id}: פסיק בסוף`).toBe(false);
      expect(effect.ffmpeg).not.toContain(",,");
      expect(effect.ffmpeg).not.toContain(" ");
      for (const part of effect.ffmpeg.split(",")) {
        expect(part.length, `${effect.id}: קטע ריק`).toBeGreaterThan(0);
      }
    }
  });

  it("כל קטגוריה מיוצגת ואין אפקט יתום", () => {
    const known = new Set(EFFECT_CATEGORIES.map((c) => c.id));
    for (const effect of VISUAL_EFFECTS) {
      expect(known.has(effect.category), `${effect.id}: קטגוריה לא מוכרת`).toBe(true);
    }
    for (const category of EFFECT_CATEGORIES) {
      expect(effectsByCategory(category.id).length, `${category.id} ריקה`).toBeGreaterThan(0);
    }
  });

  it("אפשר לאתר אפקט לפי מזהה ולפי שם עברי", () => {
    expect(effectById("teal_orange")?.labelHe).toBe("טיל-אורנג'");
    expect(effectById("שחור-לבן")?.id).toBe("mono");
    expect(effectById("לא קיים")).toBeUndefined();
  });

  it("חיפוש מחזיר תוצאות בעברית", () => {
    expect(searchTransitions("").length).toBe(TRANSITIONS.length);
    expect(searchEffects("וינטג'").length).toBeGreaterThan(0);
    expect(searchEffects("warm").length).toBeGreaterThan(0);
  });

  it("עוצמה 0 מנטרלת, 1 משאירה, ואמצע מזיז לכיוון הנייטרלי", () => {
    const vivid = effectById("vivid")!;
    expect(scaleEffect(vivid, 0).ffmpeg).toBe("");
    expect(scaleEffect(vivid, 1).ffmpeg).toBe(vivid.ffmpeg);
    const half = scaleEffect(vivid, 0.5).ffmpeg;
    // saturation=1.350 במלא → אמצע הדרך אל 1
    expect(half).toContain("saturation=1.175");
    expect(half).toContain("contrast=1.050");
  });

  it("עוצמה חלקית שומרת על אותם מספרים ב-CSS וב-FFmpeg", () => {
    const scaled = scaleEffect(effectById("vivid")!, 0.5);
    expect(scaled.css).toContain("saturate(1.175)");
    expect(scaled.ffmpeg).toContain("saturation=1.175");
  });
});

describe("קטלוג מעברים", () => {
  it("מכסה את כל המעברים ש-FFmpeg תומך בהם, למעט חסומים מפורשות", () => {
    const covered = new Set(TRANSITIONS.map((t) => t.xfade));
    const missing = FFMPEG_XFADE.filter((name) => !covered.has(name) && !(name in BLOCKED_XFADE));
    expect(missing, `חסרים מהקטלוג: ${missing.join(", ")}`).toEqual([]);
    expect(TRANSITIONS.length).toBe(FFMPEG_XFADE.length - Object.keys(BLOCKED_XFADE).length);
  });

  it("מעבר חסום לעולם אינו מוצע — הוא מקריס את הייצוא", () => {
    for (const blocked of Object.keys(BLOCKED_XFADE)) {
      expect(transitionById(blocked), `${blocked} חזר לקטלוג`).toBeUndefined();
      expect(TRANSITIONS.some((t) => t.xfade === blocked)).toBe(false);
      expect(BLOCKED_XFADE[blocked], `${blocked}: אין נימוק`).toBeTruthy();
    }
  });

  it("אינו ממציא מעברים ש-FFmpeg לא מכיר", () => {
    const known = new Set(FFMPEG_XFADE);
    for (const transition of TRANSITIONS) {
      expect(known.has(transition.xfade), `${transition.xfade} אינו קיים ב-xfade`).toBe(true);
    }
  });

  it("לכל מעבר מזהה ייחודי, שם עברי ותיאור לתצוגה", () => {
    const ids = new Set<string>();
    for (const transition of TRANSITIONS) {
      expect(ids.has(transition.id), `מזהה כפול: ${transition.id}`).toBe(false);
      ids.add(transition.id);
      expect(/[א-ת]/.test(transition.labelHe), `${transition.id}: השם אינו בעברית`).toBe(true);
      expect(transition.preview, `${transition.id}: אין מימוש Preview`).toBeTruthy();
      expect(transition.preview.kind).toBeTruthy();
      expect(transition.defaultDuration).toBeGreaterThan(0);
      expect(transition.defaultDuration).toBeLessThanOrEqual(1.5);
    }
  });

  it("כל קטגוריה מיוצגת", () => {
    const known = new Set(TRANSITION_CATEGORIES.map((c) => c.id));
    for (const transition of TRANSITIONS) expect(known.has(transition.category)).toBe(true);
    for (const category of TRANSITION_CATEGORIES) {
      expect(transitionsByCategory(category.id).length, `${category.id} ריקה`).toBeGreaterThan(0);
    }
  });

  it("בונה קטע xfade תקין", () => {
    const filter = xfadeFilter(transitionById("wipeleft")!, 0.5, 3.25);
    expect(filter).toBe("xfade=transition=wipeleft:duration=0.500:offset=3.250");
  });

  it("מעבר לעולם אינו בולע יותר משליש מהקליפ הקצר", () => {
    // xfade *חופף* קליפים; מעבר ארוך מדי מוחק דיבור
    expect(safeTransitionDuration(2, 0.9, 5)).toBeCloseTo(0.3, 5);
    expect(safeTransitionDuration(0.5, 10, 10)).toBeCloseTo(0.5, 5);
    expect(safeTransitionDuration(5, 0.06, 0.06)).toBeCloseTo(0.05, 5);
  });

  it("משך המעבר לעולם חיובי", () => {
    for (const clip of [0.05, 0.2, 1, 4, 30]) {
      expect(safeTransitionDuration(0.5, clip, clip)).toBeGreaterThan(0);
    }
  });
});

describe("תבניות טקסט", () => {
  it("מכסות את כל סוגי הכרטיסים שהמוצר צריך", () => {
    expect(TEXT_PRESETS.length).toBeGreaterThanOrEqual(15);
    for (const category of TEXT_CATEGORIES) {
      expect(textPresetsByCategory(category.id).length, `${category.id} ריקה`).toBeGreaterThan(0);
    }
  });

  it("כל תבנית נשארת בתוך הקנבס", () => {
    for (const preset of TEXT_PRESETS) {
      const { x, y, width, height } = preset.box;
      expect(x, `${preset.id}: x שלילי`).toBeGreaterThanOrEqual(0);
      expect(y, `${preset.id}: y שלילי`).toBeGreaterThanOrEqual(0);
      expect(x + width, `${preset.id}: חורג ברוחב`).toBeLessThanOrEqual(100);
      expect(y + height, `${preset.id}: חורג בגובה`).toBeLessThanOrEqual(100);
    }
  });

  it("גודל הגופן קריא במובייל ולא חורג", () => {
    for (const preset of TEXT_PRESETS) {
      expect(preset.style.fontSize, `${preset.id}: קטן מדי`).toBeGreaterThanOrEqual(3);
      expect(preset.style.fontSize, `${preset.id}: גדול מדי`).toBeLessThanOrEqual(12);
    }
  });

  it("טקסט לדוגמה בעברית וכל מזהה ייחודי", () => {
    const ids = new Set<string>();
    for (const preset of TEXT_PRESETS) {
      expect(ids.has(preset.id), `מזהה כפול: ${preset.id}`).toBe(false);
      ids.add(preset.id);
      expect(/[א-ת]/.test(preset.sampleHe), `${preset.id}: דוגמה אינה בעברית`).toBe(true);
      expect(/[א-ת]/.test(preset.labelHe)).toBe(true);
    }
  });

  it("ה-fade אינו ארוך מהמשך המומלץ", () => {
    for (const preset of TEXT_PRESETS) {
      expect(preset.fade.in + preset.fade.out, `${preset.id}: fade ארוך מדי`)
        .toBeLessThan(preset.suggestedDuration);
    }
  });

  it("אפשר לאתר תבנית לפי מזהה ולפי שם", () => {
    expect(textPresetById("dedication_card")?.category).toBe("dedication");
    expect(textPresetById("פס CTA")?.id).toBe("cta_bar");
    expect(searchTextPresets("הקדש").length).toBeGreaterThan(0);
  });
});
