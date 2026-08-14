// אכיפת פאריטי בפועל: לוק שמוחל על קליפ חייב להגיע גם לתצוגה המקדימה
// וגם לפקודת ה-FFmpeg של הייצוא. בלי הבדיקה הזו אפשר "להחיל" אפקט שנראה
// בעורך ונעלם בקובץ הסופי — בדיוק סוג הכפתור שהחוזה אוסר.

import { beforeAll, describe, expect, it } from "vitest";
import { ensureBuiltinCommands } from "@/lib/editor/commands.builtin";
import { runCommand, type EditorApi } from "@/lib/editor/commands";
import type { Clip, MediaAsset } from "@/lib/editor/model";
import { buildConcatGraph } from "@/lib/render/graph";
import { VISUAL_EFFECTS, effectById } from "./effects";
import { clipLook, hasLook } from "./clipLook";

beforeAll(() => ensureBuiltinCommands());

const asset: MediaAsset = {
  id: "src", name: "lesson.mp4", kind: "video",
  file: { name: "lesson.mp4" } as unknown as File, duration: 30, url: "blob:x",
};

const baseClip = (patch: Partial<Clip> = {}): Clip =>
  ({ id: "c1", sourceId: "src", start: 1, end: 4, ...patch });

function graphFor(clip: Clip): string {
  return buildConcatGraph([clip], [asset]).filterComplex;
}

describe("מפריד יחיד לתצוגה ולייצוא", () => {
  it("בלי לוק — אין עיבוד צבע בשום מסלול", () => {
    const clip = baseClip();
    expect(clipLook(clip)).toEqual({ css: "none", ffmpeg: "" });
    expect(hasLook(clip)).toBe(false);
    expect(graphFor(clip)).not.toContain("eq=");
  });

  it("לוק מהקטלוג מגיע לפקודת הייצוא", () => {
    const clip = baseClip({ effectId: "vivid" });
    const look = clipLook(clip);
    expect(look.ffmpeg).toBe(effectById("vivid")!.ffmpeg);
    expect(graphFor(clip)).toContain(look.ffmpeg);
  });

  it("לוק מהקטלוג מגיע גם לתצוגה המקדימה", () => {
    const look = clipLook(baseClip({ effectId: "teal_orange" }));
    expect(look.css).toContain("saturate");
    expect(look.css).not.toBe("none");
  });

  it("עוצמה חלקית משנה את שני המסלולים באותה מידה", () => {
    const half = clipLook(baseClip({ effectId: "vivid", effectAmount: 0.5 }));
    expect(half.ffmpeg).toContain("saturation=1.175");
    expect(half.css).toContain("saturate(1.175)");
    expect(graphFor(baseClip({ effectId: "vivid", effectAmount: 0.5 }))).toContain("saturation=1.175");
  });

  it("עוצמה 0 מנטרלת לגמרי", () => {
    const clip = baseClip({ effectId: "vivid", effectAmount: 0 });
    expect(clipLook(clip).ffmpeg).toBe("");
    expect(graphFor(clip)).not.toContain("eq=");
  });

  it("כיוונון ידני מוחל אחרי הלוק, בשני המסלולים", () => {
    const clip = baseClip({ effectId: "mono", contrast: 1.3, saturation: 0.5 });
    const look = clipLook(clip);
    const parts = look.ffmpeg.split(",");
    expect(parts[parts.length - 1]).toBe("eq=contrast=1.300:saturation=0.500");
    expect(look.css.endsWith("contrast(1.300) saturate(0.500)")).toBe(true);
    expect(graphFor(clip)).toContain("eq=contrast=1.300:saturation=0.500");
  });

  it("כיוונון ידני לבדו עדיין עובד (תאימות לאחור)", () => {
    const clip = baseClip({ contrast: 1.15, saturation: 1.1 });
    expect(clipLook(clip).ffmpeg).toBe("eq=contrast=1.150:saturation=1.100");
    expect(graphFor(clip)).toContain("eq=contrast=1.150:saturation=1.100");
  });

  it("כל לוק בקטלוג מייצר פקודת ייצוא תקינה", () => {
    for (const effect of VISUAL_EFFECTS) {
      if (effect.id === "none") continue;
      const complex = graphFor(baseClip({ effectId: effect.id }));
      expect(complex, `${effect.id}: לא הגיע לייצוא`).toContain(effect.ffmpeg);
      expect(complex).not.toContain(",,");
      expect(complex).not.toContain(",[");
    }
  });
});

describe("פקודת clip.setEffect", () => {
  function api() {
    let clips: Clip[] = [baseClip()];
    const editor = {
      getClips: () => clips,
      setClips: (next: Clip[]) => { clips = next || []; },
      updateClip: (id: string, patch: Partial<Clip>) => {
        clips = clips.map((c) => (c.id === id ? { ...c, ...patch } : c));
      },
      getOverlays: () => [], setOverlays: () => undefined, updateOverlay: () => undefined,
      removeOverlay: () => undefined, addOverlay: () => undefined,
      getMedia: () => [asset], addMediaAsset: () => undefined,
      getSubs: () => [], setSubs: () => undefined,
      getTracks: () => [], setTracks: () => undefined,
      getCanvas: () => ({ width: 1280, height: 720 }),
      selectClip: () => undefined, selectOverlay: () => undefined,
      seek: () => undefined, getPlayhead: () => 0,
      getCaptionStyle: () => null, setCaptionStyle: () => undefined,
    } as unknown as EditorApi;
    return { editor, clips: () => clips };
  }

  it("מחיל לוק מוכר", () => {
    const h = api();
    const result = runCommand("clip.setEffect", h.editor, { id: "c1", effectId: "vintage", amount: 0.8 });
    expect(result.ok).toBe(true);
    expect(h.clips()[0].effectId).toBe("vintage");
    expect(h.clips()[0].effectAmount).toBeCloseTo(0.8, 5);
  });

  it("דוחה מזהה שאינו בקטלוג במקום לשמור אותו בשקט", () => {
    const h = api();
    const result = runCommand("clip.setEffect", h.editor, { id: "c1", effectId: "לא-קיים" });
    expect(result.ok).toBe(false);
    expect(h.clips()[0].effectId).toBeUndefined();
  });

  it("none מסיר את הלוק", () => {
    const h = api();
    runCommand("clip.setEffect", h.editor, { id: "c1", effectId: "vivid" });
    runCommand("clip.setEffect", h.editor, { id: "c1", effectId: "none" });
    expect(h.clips()[0].effectId).toBeUndefined();
    expect(clipLook(h.clips()[0]).ffmpeg).toBe("");
  });

  it("עוצמה נחתכת לטווח 0..1", () => {
    const h = api();
    runCommand("clip.setEffect", h.editor, { id: "c1", effectId: "vivid", amount: 5 });
    expect(h.clips()[0].effectAmount).toBe(1);
    runCommand("clip.setEffect", h.editor, { id: "c1", effectId: "vivid", amount: -2 });
    expect(h.clips()[0].effectAmount).toBe(0);
  });
});
