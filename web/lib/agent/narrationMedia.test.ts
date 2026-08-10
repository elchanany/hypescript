// בדיקות רישום מדיה שנוצרה (קריינות/תמונה) דרך גבול ה-EditorApi של הדפדפן —
// בלי קריאות רשת ל-ElevenLabs. מכסות: התמדה בפרויקט, אי-מוטציה, מניעת כפילות,
// fallback ללא EditorApi, ו-reference יציב @media:<id> כולל הנחיית add_clip.
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ensureBuiltinCommands } from "@/lib/editor/commands.builtin";
import type { EditorApi } from "@/lib/editor/commands";
import type { Clip, MediaAsset } from "@/lib/editor/model";
import type { TrackMeta } from "@/lib/editor/project";
import type { Sub } from "@/lib/editor/subtitlesEdl";
import type { Overlay } from "@/lib/editor/overlay";
import type { CaptionStyle } from "@/lib/editor/captionStyle";
import { formatNarrationResult, registerMediaAsset, TOOL_BY_NAME, type AgentContext } from "./tools";

beforeAll(() => ensureBuiltinCommands());

function makeHarness(): { ctx: AgentContext; api: EditorApi; media: () => MediaAsset[]; clips: () => Clip[]; seed: (asset: MediaAsset) => void } {
  let currentMedia: MediaAsset[] = [];
  let currentClips: Clip[] = [];
  let currentTracks: TrackMeta[] = [
    { id: "video-1", name: "וידאו", type: "video", order: 0, height: 64, locked: false, muted: false },
    { id: "audio-1", name: "אודיו", type: "audio", order: 1, height: 56, locked: false, muted: false },
  ];
  let currentSubs: Sub[] = [];
  let currentOverlays: Overlay[] = [];
  let currentCaptionStyle: CaptionStyle = { fontSize: 4.5, color: "#ffffff", bold: true, position: "bottom", bg: "soft" };
  // מדמה את הרף/state של הדף: addMediaAsset מחליף את האוסף (לא דוחף לתוכו),
  // ו-getMedia מחזיר את האוסף החדש — בדיוק כמו הממשק האמיתי בדף.
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
  // זורע מדיה קיימת גם בגבול (כמו mediaRef של הדף) וגם ב-ctx — כדי לבדוק אי-מוטציה
  const seed = (asset: MediaAsset) => {
    currentMedia = [...currentMedia, asset];
    ctx.media = currentMedia;
  };
  return { ctx, api, media: () => currentMedia, clips: () => currentClips, seed };
}

const audioAsset = (id: string, name = "קריינות_CTA.mp3", bytes = "same-bytes"): MediaAsset => ({
  id,
  name,
  kind: "audio",
  file: new File([bytes], name, { type: "audio/mpeg" }),
  duration: 3.2,
  url: "blob:mock",
});

describe("registerMediaAsset — גבול המדיה של הדפדפן", () => {
  it("רושם דרך addMediaAsset ומסנכרן את ctx.media מ-getMedia (התמדה בפרויקט)", () => {
    const h = makeHarness();
    const original = h.ctx.media;
    const { asset, reused } = registerMediaAsset(h.ctx, audioAsset("a1"));
    expect(reused).toBe(false);
    expect(asset.id).toBe("a1");
    // נשמר בפרויקט — getMedia של הדף רואה אותו
    expect(h.media()).toHaveLength(1);
    expect(h.media()[0].id).toBe("a1");
    expect(h.media()[0].kind).toBe("audio");
    // ctx.media מסונכרן מהגבול — אוסף חדש, בלי מוטציה של המערך המקורי
    expect(h.ctx.media).toBe(h.media());
    expect(h.ctx.media).not.toBe(original);
    expect(original).toHaveLength(0);
  });

  it("לא ממוטט מערכים קיימים — האוסף המקורי נשאר ללא שינוי", () => {
    const h = makeHarness();
    const existing = audioAsset("m0", "מקור.mp4", "video-bytes");
    existing.kind = "video";
    h.seed(existing);
    const original = h.ctx.media;
    registerMediaAsset(h.ctx, audioAsset("a1"));
    expect(original).toHaveLength(1);
    expect(original[0].id).toBe("m0");
    expect(h.ctx.media).not.toBe(original);
    expect(h.ctx.media).toHaveLength(2);
  });

  it("מסיר כפילות לפי id", () => {
    const h = makeHarness();
    registerMediaAsset(h.ctx, audioAsset("a1"));
    const second = registerMediaAsset(h.ctx, audioAsset("a1"));
    expect(second.reused).toBe(true);
    expect(second.asset.id).toBe("a1");
    expect(h.media()).toHaveLength(1);
  });

  it("מסיר כפילות לפי אותו שם קובץ וגודל", () => {
    const h = makeHarness();
    registerMediaAsset(h.ctx, audioAsset("a1"));
    const second = registerMediaAsset(h.ctx, audioAsset("a2"));
    expect(second.reused).toBe(true);
    expect(second.asset.id).toBe("a1"); // הוחזר הנכס הקיים
    expect(h.media()).toHaveLength(1);
  });

  it("אינו מסיר כפילות כשהתוכן שונה (גודל שונה) — נוצר נכס חדש", () => {
    const h = makeHarness();
    registerMediaAsset(h.ctx, audioAsset("a1", "קריינות_CTA.mp3", "bytes-A"));
    const second = registerMediaAsset(h.ctx, audioAsset("a2", "קריינות_CTA.mp3", "bytes-are-different"));
    expect(second.reused).toBe(false);
    expect(h.media()).toHaveLength(2);
  });

  it("fallback אימוטאבילי ללא EditorApi — אוסף חדש, בלי push", () => {
    const h = makeHarness();
    h.ctx.editorApi = null;
    const original = h.ctx.media;
    const { asset, reused } = registerMediaAsset(h.ctx, audioAsset("a1"));
    expect(reused).toBe(false);
    expect(asset.id).toBe("a1");
    expect(h.ctx.media).toHaveLength(1);
    expect(h.ctx.media).not.toBe(original);
    expect(original).toHaveLength(0);
  });
});

describe("formatNarrationResult — reference יציב @media:<id>", () => {
  it("מחזיר @media:<id> יציב עם הנחיית add_clip מדויקת (timeline_start + רצועת אודיו)", () => {
    const asset = audioAsset("a-xyz");
    const text = formatNarrationResult({
      asset,
      blobSize: 20480,
      modelId: "eleven_v3",
      voiceId: "v123",
      timelineStart: 42.5,
      audioTrackName: "אודיו",
    });
    expect(text).toContain("@media:a-xyz");
    expect(text).toContain('add_clip(source="@media:a-xyz"');
    expect(text).toContain("timeline_start=42.500");
    expect(text).toContain('track="אודיו"');
    expect(text).toContain("20KB");
    expect(text).toContain("eleven_v3");
  });
});

describe("generate_narration — בלי רשת ElevenLabs", () => {
  it("רושם את הקריינות דרך גבול המדיה ומחזיר @media:<id> שניתן לפתרון", async () => {
    const h = makeHarness();
    h.ctx.askUser = async () => "מאשר שימוש ב-ElevenLabs קריינות";
    const original = h.ctx.media;
    const fetchMock = vi.fn(async () => new Response(
      new Blob([new Uint8Array([1, 2, 3])], { type: "audio/mpeg" }),
      { status: 200, headers: { "X-Model-Id": "eleven_v3" } },
    ));
    vi.stubGlobal("fetch", fetchMock);
    const originalCreateObjectURL = URL.createObjectURL;
    (URL as unknown as { createObjectURL: (u: Blob) => string }).createObjectURL = () => "blob:mock";
    try {
      const result = await TOOL_BY_NAME.generate_narration.run(
        { text: "הירשמו לערוץ", voice_id: "v123" },
        h.ctx,
        () => undefined,
      );
      const text = typeof result === "string" ? result : result.text;
      const idMatch = text.match(/@media:([a-z0-9]+)/i);
      expect(idMatch).toBeTruthy();
      const id = idMatch![1];
      // reference יציב: אותו id גם בהנחיית add_clip
      expect(text).toContain(`add_clip(source="@media:${id}"`);
      expect(text).toContain('track="אודיו"');
      // נשמר בפרויקט דרך הגבול — ctx.media מסונכרן מ-getMedia
      expect(h.media()).toHaveLength(1);
      expect(h.media()[0].id).toBe(id);
      expect(h.media()[0].kind).toBe("audio");
      expect(h.ctx.media).toBe(h.media());
      expect(h.ctx.media).not.toBe(original);
      // artifact נשמר
      if (typeof result !== "string") {
        expect(result.artifacts).toHaveLength(1);
        expect(result.artifacts![0].kind).toBe("audio");
        expect(result.artifacts![0].name).toBe(h.media()[0].name);
      }
      // לא הופעלה רשת אמיתית — רק ה-mock
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(String(fetchMock.mock.calls[0][0])).toBe("/api/elevenlabs/tts");
    } finally {
      vi.unstubAllGlobals();
      (URL as unknown as { createObjectURL: (u: Blob) => string }).createObjectURL = originalCreateObjectURL;
    }
  });

  it("מחזיר שגיאה ברורה בלי voice_id — בלי קריאת רשת", async () => {
    const h = makeHarness();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    try {
      const result = await TOOL_BY_NAME.generate_narration.run({ text: "שלום" }, h.ctx, () => undefined);
      expect(result).toContain("voice_id");
      expect(fetchMock).not.toHaveBeenCalled();
      expect(h.media()).toHaveLength(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});