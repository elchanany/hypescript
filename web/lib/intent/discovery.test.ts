// מנוע הכוונה נבדק על התרחישים האמיתיים שהמשתמש תיאר, לא על מקרים תיאורטיים.

import { describe, expect, it } from "vitest";
import type { MediaAsset } from "@/lib/editor/model";
import { GOALS, collectSignals, isConfident, scoreGoals } from "./signals";
import { MAX_QUESTIONS, buildBrief, describeBrief, planQuestions } from "./questions";
import { CAPTION_STYLES, activeHighlight, assWordTags, captionStyleById, highlightSpans } from "@/lib/captions/styles";

const asset = (id: string, kind: MediaAsset["kind"], duration: number): MediaAsset => ({
  id, name: `${id}.${kind === "image" ? "jpg" : kind === "audio" ? "mp3" : "mp4"}`,
  kind, file: null as unknown as File, duration, url: `blob:${id}`,
});

const photos = (n: number) => Array.from({ length: n }, (_, i) => asset(`p${i}`, "image", 4));

function analyze(media: MediaAsset[], text = "", extra: Parameters<typeof collectSignals>[0] extends infer T ? Partial<Omit<T & object, "media">> : never = {}) {
  const signals = collectSignals({ media, ...extra });
  const ranked = scoreGoals(signals, text);
  return { signals, ranked };
}

describe("אותות מהמדיה", () => {
  it("מזהה אוסף תמונות", () => {
    const { signals } = analyze(photos(9));
    expect(signals.shape).toBe("photos_only");
    expect(signals.imageCount).toBe(9);
  });

  it("מבחין בין וידאו קצר לארוך", () => {
    expect(analyze([asset("v", "video", 300)]).signals.shape).toBe("single_short_video");
    expect(analyze([asset("v", "video", 7200)]).signals.shape).toBe("single_long_video");
  });

  it("מזהה אודיו בלבד ותערובת", () => {
    expect(analyze([asset("a", "audio", 3600)]).signals.shape).toBe("audio_only");
    expect(analyze([asset("v", "video", 60), asset("p", "image", 4)]).signals.shape).toBe("mixed");
  });

  it("מסיק יחס מסך מהמקורות", () => {
    const signals = collectSignals({ media: [asset("v", "video", 60)], aspectByAsset: { v: 0.5625 } });
    expect(signals.aspect).toBe("portrait");
  });
});

describe("דירוג יעדים — התרחישים שתוארו", () => {
  it("תמונות של דירת שותפים לפייסבוק → פוסט מתמונות", () => {
    const { ranked } = analyze(photos(8), "רוצה סרטון לפייסבוק כדי למצוא שותפה לחדר");
    expect(ranked[0].goal).toBe("photo_promo");
    expect(ranked[0].reasonsHe.join(" ")).toContain("דירה");
  });

  it("אותן תמונות, אבל אמא עושה מצגת למשפחה → מצגת משפחתית", () => {
    const { ranked } = analyze(photos(8), "אמא שלי עושה מצגות כאלה למשפחה, צריך מעברים יפים ושיר");
    expect(ranked[0].goal).toBe("family_slideshow");
  });

  it("פודקאסט של שעתיים → עריכת תוכן ארוך", () => {
    const { ranked } = analyze([asset("v", "video", 7200)], "יש לי פרק פודקאסט לערוך");
    expect(ranked[0].goal).toBe("podcast_edit");
  });

  it("שורט מתוך תוכן ארוך → shorts_from_long", () => {
    const { ranked } = analyze([asset("v", "video", 7200)], "רוצה להוציא מזה קליפ לטיקטוק");
    expect(ranked[0].goal).toBe("shorts_from_long");
  });

  it("שיעור עם טקסט מוגדר → חיתוך לפי סקריפט", () => {
    const { ranked } = analyze([asset("v", "video", 355)], "שיעור של רב, תשאיר רק את הטקסט הזה",
      { hasScript: true } as never);
    expect(ranked[0].goal).toBe("lecture_cut");
  });

  it("מצגת עסקית", () => {
    const { ranked } = analyze(photos(12), "מצגת עסקית למשקיעים");
    expect(ranked[0].goal).toBe("business_deck");
  });

  it("כל יעד מדורג מגיע עם סיבה", () => {
    const { ranked } = analyze(photos(6), "פוסט לאינסטגרם");
    for (const entry of ranked) expect(entry.reasonsHe.length).toBeGreaterThan(0);
  });

  it("בלי מדיה ובלי טקסט — לא מנחש", () => {
    const { ranked } = analyze([]);
    expect(isConfident(ranked)).toBe(false);
  });
});

describe("שאלות פתיחה", () => {
  it("לא יותר משלוש שאלות, לעולם", () => {
    const { signals, ranked } = analyze(photos(8));
    expect(planQuestions(signals, ranked).length).toBeLessThanOrEqual(MAX_QUESTIONS);
    const empty = analyze([]);
    expect(planQuestions(empty.signals, empty.ranked).length).toBeLessThanOrEqual(MAX_QUESTIONS);
  });

  it("לא שואל על המטרה כשהיא חד-משמעית", () => {
    const { signals, ranked } = analyze([asset("v", "video", 355)], "שיעור של רב, תשאיר רק את הטקסט",
      { hasScript: true } as never);
    expect(isConfident(ranked)).toBe(true);
    expect(planQuestions(signals, ranked).some((q) => q.id === "goal")).toBe(false);
  });

  it("שואל על המטרה כשיש שני מועמדים קרובים", () => {
    const { signals, ranked } = analyze(photos(8));
    expect(planQuestions(signals, ranked).some((q) => q.id === "goal")).toBe(true);
  });

  it("לא שואל על פלטפורמה בחיתוך שיעור — היא לא משנה שם", () => {
    const { signals, ranked } = analyze([asset("v", "video", 355)], "שיעור", { hasScript: true } as never);
    expect(planQuestions(signals, ranked).some((q) => q.id === "platform")).toBe(false);
  });

  it("לכל שאלה יש ברירת מחדל לדילוג ולפחות שתי אפשרויות", () => {
    const { signals, ranked } = analyze(photos(8));
    for (const q of planQuestions(signals, ranked)) {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.skipDefault).toBeTruthy();
      expect(q.promptHe).toMatch(/[א-ת]/);
      expect(q.options.some((o) => o.id === q.skipDefault) || q.id === "goal").toBe(true);
    }
  });

  it("לא חוזר על שאלה שכבר נענתה", () => {
    const { signals, ranked } = analyze(photos(8));
    const asked = planQuestions(signals, ranked, { goal: "photo_promo", platform: "tiktok" });
    expect(asked.some((q) => q.id === "goal" || q.id === "platform")).toBe(false);
  });

  it("שואל על אורך רק בתוכן ארוך", () => {
    const long = analyze([asset("v", "video", 7200)]);
    const short = analyze([asset("v", "video", 60)]);
    const longIds = planQuestions(long.signals, long.ranked, { goal: "podcast_edit", platform: "youtube", tone: "clean" }).map((q) => q.id);
    const shortIds = planQuestions(short.signals, short.ranked, { goal: "social_promo", platform: "tiktok", tone: "clean" }).map((q) => q.id);
    expect(longIds).toContain("length");
    expect(shortIds).not.toContain("length");
  });
});

describe("בריף", () => {
  it("תשובה מפורשת גוברת על הסקה", () => {
    const { signals, ranked } = analyze(photos(8), "מצגת למשפחה");
    const brief = buildBrief(signals, ranked, { goal: "photo_promo", platform: "tiktok" });
    expect(brief.goal).toBe("photo_promo");
    expect(brief.aspect).toBe("portrait");
  });

  it("הטון קובע קצב וסגנון כתוביות", () => {
    const { signals, ranked } = analyze(photos(6));
    expect(buildBrief(signals, ranked, { tone: "energetic" }).captions).toBe("karaoke");
    expect(buildBrief(signals, ranked, { tone: "serious" }).pacing).toBe("broadcast");
  });

  it("כל החלטה מתועדת", () => {
    const { signals, ranked } = analyze(photos(8), "פוסט לפייסבוק לחיפוש שותפה");
    const brief = buildBrief(signals, ranked, { platform: "tiktok", tone: "energetic" });
    expect(brief.derivedHe.length).toBeGreaterThanOrEqual(3);
    expect(describeBrief(brief)).toContain("יעד:");
  });

  it("דילוג מלא נותן בריף תקין", () => {
    const { signals, ranked } = analyze(photos(8));
    const brief = buildBrief(signals, ranked, {});
    expect(GOALS[brief.goal]).toBeTruthy();
    expect(brief.steps.length).toBeGreaterThan(0);
    expect(["portrait", "landscape", "square"]).toContain(brief.aspect);
  });

  it("שיעור מקבל קצב שמרני ובלי מוזיקה", () => {
    const { signals, ranked } = analyze([asset("v", "video", 355)], "שיעור", { hasScript: true } as never);
    const brief = buildBrief(signals, ranked, {});
    expect(brief.pacing).toBe("broadcast");
    expect(brief.music).toBe("none");
    expect(brief.captions).toBe("lecture");
  });
});

describe("סגנונות כתוביות", () => {
  it("טיקטוק מדגיש מילה, הרצאה לא", () => {
    expect(CAPTION_STYLES.karaoke.look.highlight).not.toBe("none");
    expect(CAPTION_STYLES.lecture.look.highlight).toBe("none");
  });

  it("סגנון אגרסיבי מקבל פחות מילים בפעימה", () => {
    expect(CAPTION_STYLES.karaoke.policy.targetWords!)
      .toBeLessThan(CAPTION_STYLES.lecture.policy.targetWords!);
  });

  it("קצב הקריאה מחמיר ככל שהכתובית ארוכה יותר", () => {
    expect(CAPTION_STYLES.lecture.policy.maxCps!).toBeLessThan(CAPTION_STYLES.karaoke.policy.maxCps!);
  });

  it("איתור סגנון לפי מזהה ולפי שם", () => {
    expect(captionStyleById("karaoke")?.id).toBe("karaoke");
    expect(captionStyleById("הרצאה — משפט שלם")?.id).toBe("lecture");
    expect(captionStyleById("לא קיים")).toBeUndefined();
  });

  it("ההדגשה מכסה את כל הכתובית בלי חורים", () => {
    const words = [
      { text: "שלום", start: 0, end: 0.4 },
      { text: "וברכה", start: 0.6, end: 1.0 },
      { text: "לכולם", start: 1.1, end: 1.5 },
    ];
    const spans = highlightSpans(words, 2.0);
    expect(spans).toHaveLength(3);
    // אין רגע בין ההתחלה לסוף שבו שום מילה אינה מודגשת
    for (let t = 0; t < 2.0; t += 0.05) {
      expect(activeHighlight(spans, t), `t=${t.toFixed(2)}`).toBeGreaterThanOrEqual(0);
    }
    expect(spans[2].end).toBeCloseTo(2.0, 5);
  });

  it("ההדגשה מתקדמת לפי הזמן", () => {
    const spans = highlightSpans([
      { text: "א", start: 0, end: 0.3 },
      { text: "ב", start: 0.5, end: 0.8 },
    ], 1.2);
    expect(activeHighlight(spans, 0.1)).toBe(0);
    expect(activeHighlight(spans, 0.6)).toBe(1);
    expect(activeHighlight(spans, 1.1)).toBe(1);
  });

  it("תגי ASS צובעים רק את המילה הפעילה", () => {
    const tags = assWordTags(CAPTION_STYLES.karaoke.look, ["אחת", "שתיים", "שלוש"], 1);
    const accent = tags.split("שתיים")[0].slice(-11);
    expect(accent).toContain("&H00");
    expect(tags.split("{").length - 1).toBe(3);
  });

  it("בלי הדגשה — כל המילים באותו צבע", () => {
    const tags = assWordTags(CAPTION_STYLES.lecture.look, ["אחת", "שתיים"], 0);
    const colors = [...tags.matchAll(/&H00[0-9A-F]{6}/g)].map((m) => m[0]);
    expect(new Set(colors).size).toBe(1);
  });
});
