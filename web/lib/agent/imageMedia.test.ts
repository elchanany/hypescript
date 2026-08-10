// בדיקות generate_image: בריף מותג מוגבל (טקסט בלבד, בלי קבצים/URL/ids),
// רישום מדיה דרך גבול הדפדפן, @media:<id> יציב + artifact + הנחיה מדויקת,
// use_brand=false / ללא ערכה, ושגיאות מפתח/עליון ברורות — בלי רשת אמיתית.

import { beforeAll, describe, expect, it, vi } from "vitest";
import { ensureBuiltinCommands } from "@/lib/editor/commands.builtin";
import type { EditorApi } from "@/lib/editor/commands";
import type { Clip, MediaAsset } from "@/lib/editor/model";
import type { TrackMeta } from "@/lib/editor/project";
import type { Sub } from "@/lib/editor/subtitlesEdl";
import type { Overlay } from "@/lib/editor/overlay";
import type { CaptionStyle } from "@/lib/editor/captionStyle";
import type { BrandKit } from "@/lib/brand/kit";
import { buildImagePrompt, formatImageResult, TOOL_BY_NAME, type AgentContext } from "./tools";

beforeAll(() => ensureBuiltinCommands());

function makeHarness(): { ctx: AgentContext; media: () => MediaAsset[] } {
  let currentMedia: MediaAsset[] = [];
  let currentClips: Clip[] = [];
  let currentTracks: TrackMeta[] = [
    { id: "video-1", name: "וידאו", type: "video", order: 0, height: 64, locked: false, muted: false },
    { id: "audio-1", name: "אודיו", type: "audio", order: 1, height: 56, locked: false, muted: false },
  ];
  let currentSubs: Sub[] = [];
  let currentOverlays: Overlay[] = [];
  let currentCaptionStyle: CaptionStyle = { fontSize: 4.5, color: "#ffffff", bold: true, position: "bottom", bg: "soft" };
  const api: EditorApi = {
    getClips: () => currentClips,
    setClips: (next) => { currentClips = next || []; },
    getOverlays: () => currentOverlays,
    setOverlays: (next) => { currentOverlays = next; },
    updateOverlay: () => undefined,
    removeOverlay: () => undefined,
    addOverlay: () => undefined,
    updateClip: () => undefined,
    getMedia: () => currentMedia,
    addMediaAsset: (asset) => { currentMedia = [...currentMedia, asset]; },
    getSubs: () => currentSubs,
    setSubs: (next) => { currentSubs = next || []; },
    getTracks: () => currentTracks,
    setTracks: (next) => { currentTracks = next; },
    getCanvas: () => ({ width: 1280, height: 720 }),
    selectClip: () => undefined,
    selectOverlay: () => undefined,
    seek: () => undefined,
    getPlayhead: () => 0,
    getCaptionStyle: () => currentCaptionStyle,
    setCaptionStyle: (next) => { currentCaptionStyle = next; },
  };
  const ctx = {
    media: currentMedia, duration: 0, words: null, transcripts: {}, clips: currentClips, subs: currentSubs,
    overlays: currentOverlays, tracks: currentTracks,
    canvas: { width: 1280, height: 720 }, lastRender: null, editorApi: api,
    askUser: async () => "",
  } satisfies AgentContext;
  return { ctx, media: () => currentMedia };
}

const brandKitWithLogo = (): BrandKit => ({
  version: 1,
  id: "kit-1",
  organization: "עמותת המבחן",
  tagline: "שיעורים בכל שבוע",
  writingGuidelines: "לכתוב בעברית פשוטה",
  colors: ["#1a2b3c", "#ffcc00"],
  assets: [
    { id: "ba-logo", name: "logo.png", role: "logo", mime: "image/png", width: 400, height: 120, blob: new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }) },
  ],
  createdAt: 1,
  updatedAt: 1,
});

const pngResponse = () => new Response(
  new Blob([new Uint8Array([137, 80, 78, 71, 1, 2, 3])], { type: "image/png" }),
  { status: 200, headers: { "X-Image-Model": "gpt-image-1", "X-Image-Size": "1024x1024" } },
);

describe("buildImagePrompt — בריף מותג מוגבל", () => {
  it("מצרף ארגון/סלוגן/צבעים/ניסוח בלבד — בלי Blob/URL/תוכן או id של נכסים", () => {
    const prompt = buildImagePrompt("כרזה לשיעור", brandKitWithLogo(), true);
    expect(prompt).toContain("כרזה לשיעור");
    expect(prompt).toContain("עמותת המבחן");
    expect(prompt).toContain("שיעורים בכל שבוע");
    expect(prompt).toContain("#1a2b3c");
    expect(prompt).toContain("לכתוב בעברית פשוטה");
    // בלי בינארי/URL/נכסים
    expect(prompt).not.toContain("blob:");
    expect(prompt).not.toContain("data:");
    expect(prompt).not.toContain("ba-logo");
    expect(prompt).not.toContain("logo.png");
    expect(prompt).not.toContain("image/png");
    // הוראה מפורשת לא לצייר לוגו
    expect(prompt).toContain("אל תצייר");
    expect(prompt).toContain("use_brand_asset");
  });

  it("use_brand=false → ה-prompt המקורי בלבד", () => {
    const prompt = buildImagePrompt("כרזה לשיעור", brandKitWithLogo(), false);
    expect(prompt).toBe("כרזה לשיעור");
    expect(prompt).not.toContain("עמותת המבחן");
  });

  it("ללא ערכה פעילה → ה-prompt המקורי בלבד", () => {
    const prompt = buildImagePrompt("כרזה לשיעור", null, true);
    expect(prompt).toBe("כרזה לשיעור");
  });
});

describe("formatImageResult — reference יציב @media:<id>", () => {
  it("מחזיר @media:<id> עם הנחיה מדויקת (add_image_overlay / add_clip)", () => {
    const asset: MediaAsset = {
      id: "img-xyz",
      name: "generated_1024_1024.png",
      kind: "image",
      file: new File(["x"], "generated_1024_1024.png", { type: "image/png" }),
      duration: 4,
      url: "blob:mock",
    };
    const text = formatImageResult({ asset, model: "gpt-image-1", size: "1024x1024" });
    expect(text).toContain("@media:img-xyz");
    expect(text).toContain('add_image_overlay(source="@media:img-xyz"');
    expect(text).toContain('add_clip(source="@media:img-xyz"');
    expect(text).toContain("gpt-image-1");
  });
});

describe("generate_image — בלי רשת OpenAI אמיתית", () => {
  it("רושם את התמונה דרך גבול המדיה ומחזיר @media:<id> + artifact + הנחיה", async () => {
    const h = makeHarness();
    h.ctx.brandKit = brandKitWithLogo();
    h.ctx.askUser = async () => "מאשר שימוש ב-OpenAI תמונות (GPT Image)";
    const original = h.ctx.media;
    const fetchMock = vi.fn(async () => pngResponse());
    vi.stubGlobal("fetch", fetchMock);
    const originalCreateObjectURL = URL.createObjectURL;
    (URL as unknown as { createObjectURL: (u: Blob) => string }).createObjectURL = () => "blob:mock";
    try {
      const result = await TOOL_BY_NAME.generate_image.run(
        { prompt: "כרזה לשיעור", size: "1024x1024", quality: "high", background: "opaque" },
        h.ctx,
        () => undefined,
      );
      const text = typeof result === "string" ? result : result.text;
      const idMatch = text.match(/@media:([a-z0-9]+)/i);
      expect(idMatch).toBeTruthy();
      const id = idMatch![1];
      // reference יציב + הנחיה מדויקת
      expect(text).toContain(`add_image_overlay(source="@media:${id}"`);
      expect(text).toContain(`add_clip(source="@media:${id}"`);
      // נשמר בפרויקט דרך הגבול — ctx.media מסונכרן מ-getMedia, בלי מוטציה
      expect(h.media()).toHaveLength(1);
      expect(h.media()[0].id).toBe(id);
      expect(h.media()[0].kind).toBe("image");
      expect(h.ctx.media).toBe(h.media());
      expect(h.ctx.media).not.toBe(original);
      // artifact
      if (typeof result !== "string") {
        expect(result.artifacts).toHaveLength(1);
        expect(result.artifacts![0].kind).toBe("image");
        expect(result.artifacts![0].name).toBe(h.media()[0].name);
      }
      // ה-prompt שנשלח כולל בריף מותג (טקסט בלבד)
      const sentBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
      expect(sentBody.prompt).toContain("עמותת המבחן");
      expect(sentBody.prompt).not.toContain("ba-logo");
      expect(sentBody.prompt).not.toContain("blob:");
      expect(sentBody.size).toBe("1024x1024");
      expect(sentBody.quality).toBe("high");
      expect(sentBody.background).toBe("opaque");
    } finally {
      vi.unstubAllGlobals();
      (URL as unknown as { createObjectURL: (u: Blob) => string }).createObjectURL = originalCreateObjectURL;
    }
  });

  it("use_brand=false שולח prompt בלי בריף מותג", async () => {
    const h = makeHarness();
    h.ctx.brandKit = brandKitWithLogo();
    h.ctx.askUser = async () => "מאשר שימוש ב-OpenAI תמונות (GPT Image)";
    const fetchMock = vi.fn(async () => pngResponse());
    vi.stubGlobal("fetch", fetchMock);
    const originalCreateObjectURL = URL.createObjectURL;
    (URL as unknown as { createObjectURL: (u: Blob) => string }).createObjectURL = () => "blob:mock";
    try {
      await TOOL_BY_NAME.generate_image.run({ prompt: "כרזה", use_brand: false }, h.ctx, () => undefined);
      const sentBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
      expect(sentBody.prompt).toBe("כרזה");
      expect(sentBody.prompt).not.toContain("עמותת המבחן");
    } finally {
      vi.unstubAllGlobals();
      (URL as unknown as { createObjectURL: (u: Blob) => string }).createObjectURL = originalCreateObjectURL;
    }
  });

  it("ללא ערכה פעילה שולח prompt בלי בריף מותג", async () => {
    const h = makeHarness();
    h.ctx.brandKit = null;
    h.ctx.askUser = async () => "מאשר שימוש ב-OpenAI תמונות (GPT Image)";
    const fetchMock = vi.fn(async () => pngResponse());
    vi.stubGlobal("fetch", fetchMock);
    const originalCreateObjectURL = URL.createObjectURL;
    (URL as unknown as { createObjectURL: (u: Blob) => string }).createObjectURL = () => "blob:mock";
    try {
      await TOOL_BY_NAME.generate_image.run({ prompt: "כרזה" }, h.ctx, () => undefined);
      const sentBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
      expect(sentBody.prompt).toBe("כרזה");
    } finally {
      vi.unstubAllGlobals();
      (URL as unknown as { createObjectURL: (u: Blob) => string }).createObjectURL = originalCreateObjectURL;
    }
  });

  it("מחזיר שגיאה ברורה כשהשרת מחזיר חסר מפתח — בלי רישום מדיה", async () => {
    const h = makeHarness();
    h.ctx.brandKit = null;
    h.ctx.askUser = async () => "מאשר שימוש ב-OpenAI תמונות (GPT Image)";
    const fetchMock = vi.fn(async () => new Response(
      JSON.stringify({ error: "חסר OPENAI_API_KEY. הגדר אותו ב-Vercel או ב-web/.env.local." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetchMock);
    try {
      await expect(TOOL_BY_NAME.generate_image.run({ prompt: "כרזה" }, h.ctx, () => undefined))
        .rejects.toThrow(/OPENAI_API_KEY/);
      expect(h.media()).toHaveLength(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("מחזיר שגיאה ברורה על כשל עליון (upstream)", async () => {
    const h = makeHarness();
    h.ctx.brandKit = null;
    h.ctx.askUser = async () => "מאשר שימוש ב-OpenAI תמונות (GPT Image)";
    const fetchMock = vi.fn(async () => new Response(
      JSON.stringify({ error: "תקלה זמנית ב-OpenAI Images (500)." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetchMock);
    try {
      await expect(TOOL_BY_NAME.generate_image.run({ prompt: "כרזה" }, h.ctx, () => undefined))
        .rejects.toThrow(/תקלה זמנית/);
      expect(h.media()).toHaveLength(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("מחזיר שגיאה בלי prompt — בלי קריאת רשת", async () => {
    const h = makeHarness();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    try {
      const result = await TOOL_BY_NAME.generate_image.run({}, h.ctx, () => undefined);
      expect(result).toContain("prompt");
      expect(fetchMock).not.toHaveBeenCalled();
      expect(h.media()).toHaveLength(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});