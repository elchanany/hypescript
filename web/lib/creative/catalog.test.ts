// אכיפת חוזה הקטלוג מ-docs/CREATIVE_LIBRARY_ARCHITECTURE.md:
// פריט קיים רק אם יש לו מזהה יציב, שם בעברית, ושני מימושים — Preview וייצוא.
// בלי זה נוצרים כפתורים שמדמים עריכה במקום לבצע אותה.

import { describe, expect, it } from "vitest";
import {
  EFFECT_CATEGORIES, VISUAL_EFFECTS, effectById, effectsByCategory, scaleEffect, searchEffects,
} from "./effects";
import {
  FILTER_CATEGORIES, VIDEO_FILTERS, filterById, filterToImplementation, searchFilters,
} from "./filters";
import {
  BLOCKED_XFADE, TRANSITIONS, TRANSITION_CATEGORIES, safeTransitionDuration, searchTransitions,
  transitionById, transitionsByCategory, xfadeFilter,
} from "./transitions";
import {
  ANIMATION_CATEGORIES, CLIP_ANIMATIONS, animationById, animationsByKind, searchAnimations,
} from "./animations";
import { TEXT_CATEGORIES, TEXT_PRESETS, searchTextPresets, textPresetById, textPresetsByCategory } from "./textPresets";
import { TEXT_ANIM_KINDS, TEXT_ANIMATIONS, searchTextAnimations, textAnimationById } from "./textAnimations";
import { CAPTION_PRESET_CATEGORIES, CAPTION_PRESETS, captionPresetById, searchCaptionPresets } from "./captionStyles";
import { CURATED_FONTS, searchCuratedFonts } from "./fonts";
import { GIPHY_CATEGORIES, STARTER_STICKERS } from "./giphy";
import { CURATED_VECTOR_ELEMENTS, ICON_CATEGORIES, searchVectorElements } from "./iconify";
import { SHAPE_CATEGORIES, VECTOR_SHAPES, searchShapes } from "./shapes";
import { CURATED_MOTION_ASSETS, MOTION_CATEGORIES } from "./motionAssets";

/** רשימת xfade המלאה כפי ש-FFmpeg מדווח עליה (בלי custom, שדורש שיידר). */
const FFMPEG_XFADE = `fade wipeleft wiperight wipeup wipedown slideleft slideright slideup slidedown
circlecrop rectcrop distance fadeblack fadewhite radial smoothleft smoothright smoothup smoothdown
circleopen circleclose vertopen vertclose horzopen horzclose dissolve pixelize diagtl diagtr diagbl
diagbr hlslice hrslice vuslice vdslice hblur fadegrays wipetl wipetr wipebl wipebr squeezeh squeezev
zoomin fadefast fadeslow hlwind hrwind vuwind vdwind coverleft coverright coverup coverdown
revealleft revealright revealup revealdown`.split(/\s+/).filter(Boolean);

describe("קטלוג אפקטים", () => {
  it("גדול מספיק ועשיר (80+ פריטים)", () => {
    expect(VISUAL_EFFECTS.length).toBeGreaterThanOrEqual(80);
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
    expect(effectById("שחור-לבן נקי")?.id).toBe("mono");
    expect(effectById("לא קיים")).toBeUndefined();
  });

  it("חיפוש מחזיר תוצאות בעברית", () => {
    expect(searchEffects("וינטג'").length).toBeGreaterThan(0);
    expect(searchEffects("warm").length).toBeGreaterThan(0);
  });

  it("עוצמה 0 מנטרלת, 1 משאירה, ואמצע מזיז לכיוון הנייטרלי", () => {
    const vivid = effectById("vivid")!;
    expect(scaleEffect(vivid, 0).ffmpeg).toBe("");
    expect(scaleEffect(vivid, 1).ffmpeg).toBe(vivid.ffmpeg);
    const half = scaleEffect(vivid, 0.5).ffmpeg;
    expect(half).toContain("saturation=1.175");
    expect(half).toContain("contrast=1.050");
  });
});

describe("קטלוג לוקים ופילטרים (Filters)", () => {
  it("מכיל 50+ פילטרים בקטגוריות שונות", () => {
    expect(VIDEO_FILTERS.length).toBeGreaterThanOrEqual(50);
  });

  it("לכל פילטר יש מזהה ייחודי, שם עברי ותיאור", () => {
    const ids = new Set<string>();
    for (const filter of VIDEO_FILTERS) {
      expect(ids.has(filter.id), `מזהה כפול בפילטר: ${filter.id}`).toBe(false);
      ids.add(filter.id);
      expect(/[א-ת]/.test(filter.labelHe), `${filter.id}: אין שם בעברית`).toBe(true);
      expect(filter.descriptionHe).toBeTruthy();
    }
  });

  it("פילטר מתרגם למימוש CSS ו-FFmpeg תקינים", () => {
    for (const filter of VIDEO_FILTERS) {
      const impl = filterToImplementation(filter, 1);
      expect(impl.css).toBeTruthy();
      expect(impl.ffmpeg).toBeTruthy();
      expect(impl.ffmpeg.startsWith(",")).toBe(false);
      expect(impl.ffmpeg.endsWith(",")).toBe(false);
    }
  });

  it("חיפוש פילטרים עובד", () => {
    expect(searchFilters("קולנוע").length).toBeGreaterThan(0);
    expect(searchFilters("פורטרט").length).toBeGreaterThan(0);
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

  it("בונה קטע xfade תקין", () => {
    const filter = xfadeFilter(transitionById("wipeleft")!, 0.5, 3.25);
    expect(filter).toBe("xfade=transition=wipeleft:duration=0.500:offset=3.250");
  });

  it("מעבר לעולם אינו בולע יותר משליש מהקליפ הקצר", () => {
    expect(safeTransitionDuration(2, 0.9, 5)).toBeCloseTo(0.3, 5);
    expect(safeTransitionDuration(0.5, 10, 10)).toBeCloseTo(0.5, 5);
    expect(safeTransitionDuration(5, 0.06, 0.06)).toBeCloseTo(0.05, 5);
  });
});

describe("קטלוג אנימציות קליפים ושכבות (Animations)", () => {
  it("מכיל 45+ אנימציות בכל הסוגים: In, Out, Combo", () => {
    expect(CLIP_ANIMATIONS.length).toBeGreaterThanOrEqual(45);
    expect(animationsByKind("in").length).toBeGreaterThanOrEqual(15);
    expect(animationsByKind("out").length).toBeGreaterThanOrEqual(15);
    expect(animationsByKind("combo").length).toBeGreaterThanOrEqual(15);
  });

  it("לכל אנימציה מזהה ייחודי, שם עברי ו-CSS Keyframe תקין", () => {
    const ids = new Set<string>();
    for (const anim of CLIP_ANIMATIONS) {
      expect(ids.has(anim.id), `מזהה אנימציה כפול: ${anim.id}`).toBe(false);
      ids.add(anim.id);
      expect(/[א-ת]/.test(anim.labelHe), `${anim.id}: אין שם עברי`).toBe(true);
      expect(anim.cssKeyframe).toBeTruthy();
      expect(anim.defaultDuration).toBeGreaterThan(0);
    }
  });

  it("חיפוש אנימציות עובד", () => {
    expect(searchAnimations("זום").length).toBeGreaterThan(0);
    expect(searchAnimations("החלקה").length).toBeGreaterThan(0);
  });
});

describe("תבניות טקסט ואנימציות טקסט", () => {
  it("מכילות 30+ תבניות טקסט מעוצבות", () => {
    expect(TEXT_PRESETS.length).toBeGreaterThanOrEqual(30);
    for (const category of TEXT_CATEGORIES) {
      expect(textPresetsByCategory(category.id).length, `${category.id} ריקה`).toBeGreaterThan(0);
    }
  });

  it("כל תבנית נשארת בתוך גבולות הקנבס", () => {
    for (const preset of TEXT_PRESETS) {
      const { x, y, width, height } = preset.box;
      expect(x, `${preset.id}: x שלילי`).toBeGreaterThanOrEqual(0);
      expect(y, `${preset.id}: y שלילי`).toBeGreaterThanOrEqual(0);
      expect(x + width, `${preset.id}: חורג ברוחב`).toBeLessThanOrEqual(100);
      expect(y + height, `${preset.id}: חורג בגובה`).toBeLessThanOrEqual(100);
    }
  });

  it("מכילות 20+ אנימציות טקסט", () => {
    expect(TEXT_ANIMATIONS.length).toBeGreaterThanOrEqual(20);
    for (const anim of TEXT_ANIMATIONS) {
      expect(anim.cssKeyframe).toBeTruthy();
      expect(/[א-ת]/.test(anim.labelHe)).toBe(true);
    }
  });
});

describe("סגנונות כתוביות (Caption Styles)", () => {
  it("מכיל 18+ סגנונות ויראליים מוכנים", () => {
    expect(CAPTION_PRESETS.length).toBeGreaterThanOrEqual(18);
  });

  it("לכל סגנון יש צבע, פוזיציה והגדרות טיפוגרפיה תקינות", () => {
    for (const preset of CAPTION_PRESETS) {
      expect(preset.style.color).toBeTruthy();
      expect(preset.style.fontSize).toBeGreaterThan(0);
      expect(["bottom", "center", "top"]).toContain(preset.style.position);
      expect(["none", "soft", "box"]).toContain(preset.style.bg);
    }
  });
});

describe("קטלוג גופנים (Fonts)", () => {
  it("גופנים עבריים בעדיפות עליונה", () => {
    const hebrew = CURATED_FONTS.filter((f) => f.hebrew);
    expect(hebrew.length).toBeGreaterThanOrEqual(15);
    expect(hebrew.some((f) => f.family === "Heebo")).toBe(true);
    expect(hebrew.some((f) => f.family === "Assistant")).toBe(true);
    expect(hebrew.some((f) => f.family === "Frank Ruhl Libre")).toBe(true);
  });

  it("חיפוש גופנים עובד", () => {
    expect(searchCuratedFonts("Heebo").length).toBe(1);
    expect(searchCuratedFonts("", "all", true).length).toBeGreaterThanOrEqual(15);
  });
});

describe("סטיקרים ו-GIFs (GIPHY)", () => {
  it("ערכת סטיקרים מובנית פעילה ומוגדרת", () => {
    expect(STARTER_STICKERS.length).toBeGreaterThanOrEqual(10);
    expect(GIPHY_CATEGORIES.length).toBeGreaterThanOrEqual(6);
    for (const s of STARTER_STICKERS) {
      expect(s.previewUrl).toBeTruthy();
      expect(s.fullUrl).toBeTruthy();
    }
  });
});

describe("אייקונים וקטוריים (Iconify)", () => {
  it("אלמנטים וקטוריים מובנים עם מידע רישוי", () => {
    expect(CURATED_VECTOR_ELEMENTS.length).toBeGreaterThanOrEqual(16);
    for (const el of CURATED_VECTOR_ELEMENTS) {
      expect(el.svgPath).toBeTruthy();
      expect(el.license).toBeTruthy();
      expect(el.viewBox).toBeTruthy();
    }
  });
});

describe("צורות וקטוריות ו-Motion Assets", () => {
  it("צורות גיאומטריות תקינות עם SVG", () => {
    expect(VECTOR_SHAPES.length).toBeGreaterThanOrEqual(15);
    for (const shape of VECTOR_SHAPES) {
      expect(shape.svgContent).toBeTruthy();
      expect(shape.viewBox).toBeTruthy();
    }
  });

  it("נכסי תנועה מונפשים (Motion Assets) תקינים", () => {
    expect(CURATED_MOTION_ASSETS.length).toBeGreaterThanOrEqual(8);
    for (const motion of CURATED_MOTION_ASSETS) {
      expect(motion.animatedSvgMarkup).toBeTruthy();
      expect(motion.defaultDuration).toBeGreaterThan(0);
      expect(motion.viewBox).toBeTruthy();
    }
  });
});
