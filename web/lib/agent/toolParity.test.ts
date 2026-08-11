import { beforeAll, describe, expect, it } from "vitest";
import { ensureBuiltinCommands } from "@/lib/editor/commands.builtin";
import type { EditorApi } from "@/lib/editor/commands";
import type { Clip, MediaAsset } from "@/lib/editor/model";
import type { TrackMeta } from "@/lib/editor/project";
import type { Sub } from "@/lib/editor/subtitlesEdl";
import type { Overlay } from "@/lib/editor/overlay";
import type { CaptionStyle } from "@/lib/editor/captionStyle";
import type { BrandKit } from "@/lib/brand/kit";
import { SYSTEM_PROMPT, TOOL_BY_NAME, captureFrameMode, type AgentContext } from "./tools";

beforeAll(() => ensureBuiltinCommands());

function contextWithEditor(): { ctx: AgentContext; clips: () => Clip[]; tracks: () => TrackMeta[]; subs: () => Sub[]; overlays: () => Overlay[]; updates: () => number; media: () => MediaAsset[] } {
  let current: Clip[] = [{ id: "clip-1", sourceId: "media-1", start: 0, end: 4, enabled: true, volume: 1 }];
  let currentTracks: TrackMeta[] = [
    { id: "video-1", name: "וידאו", type: "video", order: 0, height: 64, locked: false, muted: false },
    { id: "video-2", name: "B-roll", type: "video", order: 1, height: 64, locked: false, muted: false },
    { id: "audio-1", name: "אודיו", type: "audio", order: 2, height: 56, locked: false, muted: false },
  ];
  let updateCount = 0;
  // מדמה את הרף/state של הדף: addMediaAsset מחליף את האוסף (לא דוחף לתוכו),
  // ו-getMedia מחזיר את האוסף החדש — בדיוק כמו הממשק האמיתי בדף.
  let currentMedia: AgentContext["media"] = [];
  let currentSubs: Sub[] = [{ id: "sub-1", start: 0, end: 1, text: "ישן" }];
  let currentOverlays: Overlay[] = [];
  let currentCaptionStyle: CaptionStyle = { fontSize: 4.5, color: "#ffffff", bold: true, position: "bottom", bg: "soft" };
  const api: EditorApi = {
    getClips: () => current,
    setClips: (next) => { current = next || []; },
    getOverlays: () => currentOverlays,
    setOverlays: (next) => { currentOverlays = next; },
    updateOverlay: (id, patch) => { currentOverlays = currentOverlays.map((overlay) => overlay.id === id ? { ...overlay, ...patch } : overlay); },
    removeOverlay: (id) => { currentOverlays = currentOverlays.filter((overlay) => overlay.id !== id); },
    addOverlay: (overlay) => { currentOverlays = [...currentOverlays, overlay]; },
    updateClip: (id, patch) => {
      updateCount += 1;
      current = current.map((clip) => clip.id === id ? { ...clip, ...patch } : clip);
    },
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
    media: currentMedia, duration: 4, words: null, transcripts: {}, clips: current, subs: currentSubs, overlays: currentOverlays, tracks: currentTracks,
    canvas: { width: 1280, height: 720 }, lastRender: null, editorApi: api,
    askUser: async () => "",
  } satisfies AgentContext;
  return { ctx, clips: () => current, tracks: () => currentTracks, subs: () => currentSubs, overlays: () => currentOverlays, updates: () => updateCount, media: () => currentMedia };
}

describe("Agent ↔ UI CommandBus parity", () => {
  it("set_clip_enabled dispatches clip.setEnabled through EditorApi", async () => {
    const h = contextWithEditor();
    const result = await TOOL_BY_NAME.set_clip_enabled.run({ index: 1, enabled: false }, h.ctx, () => undefined);
    expect(result).toContain("מושבת");
    expect(h.clips()[0].enabled).toBe(false);
    expect(h.updates()).toBe(1);
    expect(h.ctx._editorDirty).toBe(true);
  });

  it("set_clip_volume dispatches clip.setVolume and uses command clamping", async () => {
    const h = contextWithEditor();
    const result = await TOOL_BY_NAME.set_clip_volume.run({ index: 1, volume: 9 }, h.ctx, () => undefined);
    expect(result).toContain("200%");
    expect(h.clips()[0].volume).toBe(2);
    expect(h.updates()).toBe(1);
    expect(h.ctx._editorDirty).toBe(true);
  });

  it("set_clip_audio_fades dispatches normalized clip-edge fades", async () => {
    const h = contextWithEditor();
    const result = await TOOL_BY_NAME.set_clip_audio_fades.run({ index: 1, fade_in: 3, fade_out: 3 }, h.ctx, () => undefined);
    expect(result).toContain("2.00s");
    expect(h.clips()[0]).toMatchObject({ fadeIn: 2, fadeOut: 2 });
    expect(h.updates()).toBe(1);
  });

  it("set_clip_visual_fades dispatches normalized fade-to-black values", async () => {
    const h = contextWithEditor();
    const result = await TOOL_BY_NAME.set_clip_visual_fades.run({ index: 1, fade_in: 3, fade_out: 3 }, h.ctx, () => undefined);
    expect(result).toContain("2.00s");
    expect(h.clips()[0]).toMatchObject({ visualFadeIn: 2, visualFadeOut: 2 });
  });

  it("set_clip_flip dispatches both axes through the shared command", async () => {
    const h = contextWithEditor();
    const result = await TOOL_BY_NAME.set_clip_flip.run({ index: 1, horizontal: true, vertical: true }, h.ctx, () => undefined);
    expect(result).toContain("אופקי כן");
    expect(h.clips()[0]).toMatchObject({ flipX: true, flipY: true });
  });

  it("set_clip_opacity dispatches clip.setOpacity and uses command clamping", async () => {
    const h = contextWithEditor();
    const result = await TOOL_BY_NAME.set_clip_opacity.run({ index: 1, opacity: -3 }, h.ctx, () => undefined);
    expect(result).toContain("0%");
    expect(h.clips()[0].opacity).toBe(0);
    expect(h.updates()).toBe(1);
    expect(h.ctx._editorDirty).toBe(true);
  });

  it("set_clip_color dispatches shared clamped color adjustments", async () => {
    const h = contextWithEditor();
    const result = await TOOL_BY_NAME.set_clip_color.run({ index: 1, contrast: 9, saturation: -2 }, h.ctx, () => undefined);
    expect(result).toContain("עודכנו");
    expect(h.clips()[0]).toMatchObject({ contrast: 2, saturation: 0 });
    expect(h.updates()).toBe(1);
    expect(h.ctx._editorDirty).toBe(true);
  });

  it("set_clip_color resolves a shared preset before dispatch", async () => {
    const h = contextWithEditor();
    await TOOL_BY_NAME.set_clip_color.run({ index: 1, preset: "mono" }, h.ctx, () => undefined);
    expect(h.clips()[0]).toMatchObject({ contrast: 1.05, saturation: 0 });
  });

  it("routes rename/lock/mute track tools through the shared commands", async () => {
    const h = contextWithEditor();
    await TOOL_BY_NAME.rename_track.run({ track: "video-1", name: "B-roll" }, h.ctx, () => undefined);
    await TOOL_BY_NAME.set_track_locked.run({ track: "B-roll", locked: true }, h.ctx, () => undefined);
    await TOOL_BY_NAME.set_track_muted.run({ track: "audio-1", muted: true }, h.ctx, () => undefined);
    expect(h.tracks().find((t) => t.id === "video-1")).toMatchObject({ name: "B-roll", locked: true });
    expect(h.tracks().find((t) => t.id === "audio-1")?.muted).toBe(true);
    expect(h.ctx._editorDirty).toBe(true);
  });

  it("routes height and reorder track tools through the shared commands", async () => {
    const h = contextWithEditor();
    await TOOL_BY_NAME.set_track_height.run({ track: "video-1", height: 999 }, h.ctx, () => undefined);
    await TOOL_BY_NAME.reorder_track.run({ track: "video-1", direction: 1 }, h.ctx, () => undefined);
    expect(h.tracks().find((t) => t.id === "video-1")?.height).toBe(140);
    expect(h.tracks().find((t) => t.id === "video-1")?.order).toBe(1);
    expect(h.tracks().find((t) => t.id === "video-2")?.order).toBe(0);
    expect(h.ctx._editorDirty).toBe(true);
  });

  it("routes subtitle edit and delete tools through the shared commands", async () => {
    const h = contextWithEditor();
    await TOOL_BY_NAME.edit_subtitle.run({ index: 1, text: "חדש" }, h.ctx, () => undefined);
    expect(h.subs()[0].text).toBe("חדש");
    await TOOL_BY_NAME.delete_subtitle.run({ index: 1 }, h.ctx, () => undefined);
    expect(h.subs()).toEqual([]);
    expect(h.ctx._editorDirty).toBe(true);
  });

  it("routes subtitle retime and clear tools through the shared commands", async () => {
    const h = contextWithEditor();
    await TOOL_BY_NAME.retime_subtitle.run({ index: 1, start: -5, end: 0 }, h.ctx, () => undefined);
    expect(h.subs()[0]).toMatchObject({ start: 0, end: 0.2 });
    await TOOL_BY_NAME.clear_subtitles.run({}, h.ctx, () => undefined);
    expect(h.subs()).toEqual([]);
    expect(h.ctx._editorDirty).toBe(true);
  });

  it("styles captions through the shared Preview+Export command", async () => {
    const h = contextWithEditor();
    const result = await TOOL_BY_NAME.set_caption_style.run({
      font_size: 5.5, color: "#ffd84d", bold: true, position: "bottom", bg: "box",
    }, h.ctx, () => undefined);
    expect(result).toContain("עודכן");
    expect(h.ctx.editorApi?.getCaptionStyle?.()).toEqual({
      fontSize: 5.5, color: "#ffd84d", bold: true, position: "bottom", bg: "box",
    });
    expect(h.ctx._editorDirty).toBe(true);
  });

  it("routes bulk clip and subtitle replacement through atomic commands", async () => {
    const h = contextWithEditor();
    await TOOL_BY_NAME.clear_clips.run({}, h.ctx, () => undefined);
    expect(h.clips()).toEqual([]);
    await TOOL_BY_NAME.import_srt.run({ content: "1\n00:00:00,000 --> 00:00:01,000\nשלום\n" }, h.ctx, () => undefined);
    expect(h.subs()).toHaveLength(1);
    expect(h.subs()[0]).toMatchObject({ start: 0, end: 1, text: "שלום" });
    expect(h.ctx._editorDirty).toBe(true);
  });

  it("routes overlay add, update, and delete tools through the shared commands", async () => {
    const h = contextWithEditor();
    h.ctx.media.push({ id: "image-1", name: "logo.png", kind: "image", file: null as any, duration: 4, url: "blob:logo" });
    const logoResult = await TOOL_BY_NAME.add_image_overlay.run({ source: "@media:image-1", start: 0, end: 2, preset: "logo_top_left", border_radius: 18 }, h.ctx, () => undefined);
    expect(h.overlays()[0]).toMatchObject({ kind: "image", assetId: "image-1", start: 0, end: 2 });
    expect(h.overlays()[0].transform.w).toBeLessThan(1280 * 0.2);
    expect(h.overlays()[0].transform.x).toBeLessThan(1280 * 0.2);
    expect(h.overlays()[0].borderRadius).toBe(18);
    expect(logoResult).toContain("x=");
    const logoId = h.overlays()[0].id;
    const logoBefore = structuredClone(h.overlays()[0]);
    h.ctx.media.push({ id: "image-2", name: "end-card.png", kind: "image", file: null as any, duration: 4, url: "blob:end" });
    const endResult = await TOOL_BY_NAME.add_image_overlay.run({ source: "@media:image-2", start: 2, end: 4, preset: "fit_canvas", locked: true }, h.ctx, () => undefined);
    expect(h.overlays()[0]).toEqual(logoBefore);
    expect(h.overlays()[1]).toMatchObject({ assetId: "image-2", locked: true });
    expect(endResult).toContain(`id=${h.overlays()[1].id}`);
    const protectedResult = await TOOL_BY_NAME.update_overlay.run({ overlay_id: h.overlays()[1].id, expected_source: "image-1", x: 10 }, h.ctx, () => undefined);
    expect(protectedResult).toContain("שגיאת הגנה");
    expect(h.overlays()[1]).toMatchObject({ assetId: "image-2", locked: true });
    await TOOL_BY_NAME.add_text_overlay.run({ text: "לעילוי נשמת\nפלוני בן פלונית", start: 1, end: 3, preset: "dedication_card" }, h.ctx, () => undefined);
    expect(h.overlays()).toHaveLength(3);
    expect(h.overlays()[2]).toMatchObject({ borderColor: "#d6ad55", background: "rgba(13,25,48,0.94)" });
    await TOOL_BY_NAME.update_overlay.run({ overlay_id: logoId, expected_source: "image-1", x: 250, opacity: 2, z_index: 8, border_radius: 24 }, h.ctx, () => undefined);
    expect(h.overlays()[0].transform).toMatchObject({ x: 250, opacity: 1 });
    expect(h.overlays()[0]).toMatchObject({ zIndex: 8, borderRadius: 24, assetId: "image-1" });
    const lockedDelete = await TOOL_BY_NAME.delete_overlay.run({ overlay_id: h.overlays()[1].id, expected_source: "image-2" }, h.ctx, () => undefined);
    expect(lockedDelete).toContain("מוגנת");
    await TOOL_BY_NAME.delete_overlay.run({ overlay_id: h.overlays()[2].id }, h.ctx, () => undefined);
    expect(h.overlays()).toHaveLength(2);
    expect(h.ctx._editorDirty).toBe(true);
  });

  it("places a clip on another video track at an exact agent-requested time", async () => {
    const h = contextWithEditor();
    const result = await TOOL_BY_NAME.move_clip_to_track.run({ index: 1, track: "video-2", timeline_start: 3.125 }, h.ctx, () => undefined);
    const moved = h.clips().find((clip) => clip.id === "clip-1");
    const gap = h.clips().find((clip) => clip.sourceId === "__gap__" && clip.trackId === "video-2");
    expect(result).toContain("3.125s");
    expect(moved).toMatchObject({ trackId: "video-2", start: 0, end: 4 });
    expect(gap).toMatchObject({ trackId: "video-2", end: 3.125 });
  });

  it("matches an end-card overlay to an audio clip's exact assembled span", async () => {
    const h = contextWithEditor();
    h.ctx.editorApi!.setClips!([
      { id: "video-main", sourceId: "media-1", start: 0, end: 12, trackId: "video-1" },
      { id: "audio-gap", sourceId: "__gap__", start: 0, end: 49.812, trackId: "audio-1" },
      { id: "narration", sourceId: "voice-1", start: 0, end: 11.361, trackId: "audio-1" },
    ]);
    h.ctx.clips = h.ctx.editorApi!.getClips();
    h.ctx.media.push({ id: "end-image", name: "end.png", kind: "image", file: null as any, duration: 4, url: "blob:end" });

    const listing = await TOOL_BY_NAME.list_clips.run({}, h.ctx, () => undefined);
    expect(listing).toContain("id=narration");
    expect(listing).toContain("ציר 49.812–61.173s");

    const result = await TOOL_BY_NAME.add_image_overlay.run({
      source: "end-image", preset: "fit_canvas", match_clip_id: "narration", locked: true,
    }, h.ctx, () => undefined);
    expect(h.overlays()[0]).toMatchObject({ start: 49.812, end: 61.173, locked: true });
    expect(result).toContain("49.812–61.173s");
  });

  it("rejects guessed times when match_clip_id is supplied", async () => {
    const h = contextWithEditor();
    h.ctx.media.push({ id: "end-image", name: "end.png", kind: "image", file: null as any, duration: 4, url: "blob:end" });
    const result = await TOOL_BY_NAME.add_image_overlay.run({
      source: "end-image", match_clip_id: "clip-1", start: 0, end: 4,
    }, h.ctx, () => undefined);
    expect(result).toContain("אין להעביר איתו start/end");
    expect(h.overlays()).toHaveLength(0);
  });

  it("reports only direct semantic timeline evidence", async () => {
    const h = contextWithEditor();
    h.ctx.transcripts["media-1"] = [
      { text: "שלום", start: 0.1, end: 0.4, type: "word" },
      { text: "[cough]", start: 0.8, end: 1, type: "audio_event" },
    ];
    const result = await TOOL_BY_NAME.inspect_timeline_evidence.run({}, h.ctx, () => undefined);
    expect(result).toContain("דיבור מתמלול: שלום");
    expect(result).toContain("אירוע שסומן במפורש בידי ספק התמלול: [cough]");
    // בלי classify_sounds אין סיווג אקוסטי, והכלי אומר זאת במפורש
    expect(result).toContain("היעדר תמלול אינו מוכיח שקט");
    expect(result).not.toContain("מאפיינים תואמים");
  });

  it("capture_frame with explicit timeline=false stays raw even when an edited timeline exists", async () => {
    const h = contextWithEditor();
    // ctx has a clip (edited timeline) but no media — the raw path fails on missing
    // video BEFORE touching ffmpeg, so this proves timeline=false never composites.
    const result = await TOOL_BY_NAME.capture_frame.run({ at_seconds: 1, timeline: false }, h.ctx, () => undefined);
    expect(result).toContain("אין סרטון לצילום.");
  });

  it("capture_frame with an explicit source stays raw (no compositing)", async () => {
    const h = contextWithEditor();
    const result = await TOOL_BY_NAME.capture_frame.run({ at_seconds: 1, source: "media-1" }, h.ctx, () => undefined);
    expect(result).toContain("אין סרטון לצילום.");
  });

  it("capture_frame with an omitted timeline defaults to raw, even with an edited timeline", async () => {
    const h = contextWithEditor();
    // Same missing-media probe: reaching the raw "no video" failure proves the
    // composited path (a micro-render through ffmpeg) was not even attempted.
    const result = await TOOL_BY_NAME.capture_frame.run({ at_seconds: 1 }, h.ctx, () => undefined);
    expect(result).toContain("אין סרטון לצילום.");
  });
});

describe("capture_frame mode decision (captureFrameMode)", () => {
  it("explicit timeline=true → composited (opt-in)", () => {
    expect(captureFrameMode(true, undefined, true)).toBe("timeline");
    expect(captureFrameMode("true", undefined, true)).toBe("timeline");
  });

  it("timeline=true without an edited timeline falls back to raw", () => {
    expect(captureFrameMode(true, undefined, false)).toBe("source");
  });

  it("explicit timeline=false → raw, even with an edited timeline", () => {
    expect(captureFrameMode(false, undefined, true)).toBe("source");
    expect(captureFrameMode("false", "media-1", true)).toBe("source");
  });

  it("explicit source → raw (timeline omitted)", () => {
    expect(captureFrameMode(undefined, "media-1", true)).toBe("source");
    expect(captureFrameMode(undefined, 2, false)).toBe("source");
  });

  it("omitted timeline → raw, even with an edited timeline (never the silent default)", () => {
    expect(captureFrameMode(undefined, undefined, true)).toBe("source");
    expect(captureFrameMode(undefined, undefined, false)).toBe("source");
    expect(captureFrameMode(null, "", true)).toBe("source");
  });
});

describe("client brief operating rules", () => {
  it("teaches the agent to classify a mixed client brief before cutting", () => {
    // הכשל שדווח בשדה: כותרות ופרסומת נכנסו ל-keep_by_script, ותוכן אמיתי הושמט
    expect(SYSTEM_PROMPT).toContain("קריאת הבריף");
    expect(SYSTEM_PROMPT).toContain("טקסט מדובר לשמירה");
    expect(SYSTEM_PROMPT).toContain("find_in_transcript");
    expect(SYSTEM_PROMPT).toContain("אסור** שייכנס ל-keep_by_script");
    expect(SYSTEM_PROMPT).toContain("אילוץ קשיח");
  });

  it("mandates script-first cutting with pacing, and an acceptance gate before render", () => {
    expect(SYSTEM_PROMPT).toContain("keep_by_script");
    expect(SYSTEM_PROMPT).toContain("pacing");
    expect(SYSTEM_PROMPT).toContain("audit_edit");
    expect(SYSTEM_PROMPT).toContain("חובה לפני render");
    expect(SYSTEM_PROMPT).toContain("אל תדווח הצלחה לפני audit_edit");
  });

  it("forbids silently dropping a requested word and forbids repeated caption words", () => {
    expect(SYSTEM_PROMPT).toContain("לא נעלמת בשקט");
    expect(SYSTEM_PROMPT).toContain("כתוביות בלי חזרות");
    expect(SYSTEM_PROMPT).toContain("progressive");
  });

  it("keeps source continuity, caption styling, fades, deferred assets and overlay identity", () => {
    expect(SYSTEM_PROMPT).toContain("אין חזרה על זמן-מקור");
    expect(SYSTEM_PROMPT).toContain("set_caption_style");
    expect(SYSTEM_PROMPT).toContain("set_clip_audio_fades");
    expect(SYSTEM_PROMPT).toContain("overlay_id + expected_source");
    expect(SYSTEM_PROMPT).toContain("אל תיגע בעבודה שכבר סודרה");
    expect(SYSTEM_PROMPT).toContain("נכס חסר אינו חוסם");
  });

  it("separates direct provider labels from probabilistic acoustic classification", () => {
    expect(SYSTEM_PROMPT).toContain("ראיה ישירה");
    expect(SYSTEM_PROMPT).toContain("מאפיינים תואמים ל");
    expect(SYSTEM_PROMPT).toContain("היעדר מילים בתמלול אינו ראיה לשקט");
  });

  it("instructs the agent to consult the local brand kit before image/card/CTA/logo work", () => {
    expect(SYSTEM_PROMPT).toContain("get_brand_kit");
    expect(SYSTEM_PROMPT).toContain("use_brand_asset");
    expect(SYSTEM_PROMPT).toContain("אל תמציא נכסים");
    expect(SYSTEM_PROMPT).toContain("לעולם לא לצייר לוגו");
  });
});

describe("brand kit agent tools", () => {
  const brandKitWithLogo = (): BrandKit => ({
    version: 1,
    id: "kit-1",
    organization: "עמותת המבחן",
    tagline: "שיעורים בכל שבוע",
    writingGuidelines: "לכתוב בעברית פשוטה",
    colors: ["#1a2b3c", "#ffcc00"],
    assets: [
      { id: "ba-logo", name: "logo.png", role: "logo", mime: "image/png", width: 400, height: 120, blob: new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }) },
      { id: "ba-ref", name: "cover.jpg", role: "reference", mime: "image/jpeg", blob: new Blob([new Uint8Array([4, 5, 6])], { type: "image/jpeg" }) },
    ],
    createdAt: 1,
    updatedAt: 1,
  });

  it("get_brand_kit returns a binary-free summary for the active kit", async () => {
    const h = contextWithEditor();
    h.ctx.brandKit = brandKitWithLogo();
    const result = await TOOL_BY_NAME.get_brand_kit.run({}, h.ctx, () => undefined);
    expect(result).toContain("עמותת המבחן");
    expect(result).toContain("#1a2b3c");
    expect(result).toContain("לכתוב בעברית פשוטה");
    expect(result).toContain("id=ba-logo");
    expect(result).toContain("logo.png");
    expect(result).not.toContain("data:");
    expect(result).not.toContain("blob:");
  });

  it("get_brand_kit reports when no active kit exists (never fabricates)", async () => {
    const h = contextWithEditor();
    h.ctx.brandKit = null;
    const result = await TOOL_BY_NAME.get_brand_kit.run({}, h.ctx, () => undefined);
    expect(result).toContain("אין ערכת מותג");
  });

  it("use_brand_asset imports a logo through addMediaAsset and adds an overlay via the shared command", async () => {
    const h = contextWithEditor();
    h.ctx.brandKit = brandKitWithLogo();
    const originalMedia = h.ctx.media;
    const result = await TOOL_BY_NAME.use_brand_asset.run({ asset: "ba-logo", action: "logo_overlay" }, h.ctx, () => undefined);
    expect(result).toContain("logo.png");
    expect(result).toContain("id=ov");
    // גבול המדיה החזיר אוסף חדש (getMedia), והקשר הסוכן סונכרן ממנו — בלי מוטציה.
    expect(h.media()).toHaveLength(1);
    expect(h.media()[0].name).toBe("logo.png");
    expect(h.media()[0].kind).toBe("image");
    expect(h.media()[0].file instanceof File).toBe(true);
    expect(h.ctx.media).not.toBe(originalMedia); // אוסף חדש, לא אותו מערך
    expect(h.ctx.media).toBe(h.media()); // מסונכרן מ-api.getMedia()
    expect(originalMedia.filter((m) => m.name === "logo.png")).toHaveLength(0); // המקורי לא שונה
    expect(h.ctx.media.some((m) => m.name === "logo.png")).toBe(true); // נראה לסוכן
    // overlay.addImage ראה את הייבוא דרך getMedia (אחרת היה נכשל ב"קובץ תמונה לא נמצא")
    const overlay = h.overlays()[0];
    expect(overlay.kind).toBe("image");
    expect(overlay.assetId).toBe(h.media()[0].id);
    expect(overlay.locked).toBe(true);
    expect(overlay.transform.w).toBeLessThan(1280 * 0.2); // מידות לוגו
    expect(overlay.transform.x).toBeLessThan(1280 * 0.2); // פינה שמאלית-עליונה
    expect(h.ctx._editorDirty).toBe(true);
  });

  it("use_brand_asset avoids duplicate media import on reuse", async () => {
    const h = contextWithEditor();
    h.ctx.brandKit = brandKitWithLogo();
    await TOOL_BY_NAME.use_brand_asset.run({ asset: "ba-logo", action: "logo_overlay" }, h.ctx, () => undefined);
    const before = h.media().length;
    const second = await TOOL_BY_NAME.use_brand_asset.run({ asset: "logo.png", action: "logo_overlay", start: 2, end: 5 }, h.ctx, () => undefined);
    expect(h.media()).toHaveLength(before); // אין ייבוא כפול
    expect(second).toContain("שימוש חוזר");
    expect(h.overlays()).toHaveLength(2);
  });

  it("use_brand_asset returns a clear error for a missing asset — no substitute", async () => {
    const h = contextWithEditor();
    h.ctx.brandKit = brandKitWithLogo();
    const result = await TOOL_BY_NAME.use_brand_asset.run({ asset: "ba-missing", action: "logo_overlay" }, h.ctx, () => undefined);
    expect(result).toContain("לא נמצא");
    expect(result).toContain("לא נוצר תחליף");
    expect(h.media()).toHaveLength(0);
    expect(h.overlays()).toHaveLength(0);
  });

  it("use_brand_asset reference_media imports the image without adding an overlay", async () => {
    const h = contextWithEditor();
    h.ctx.brandKit = brandKitWithLogo();
    const result = await TOOL_BY_NAME.use_brand_asset.run({ asset: "ba-ref", action: "reference_media" }, h.ctx, () => undefined);
    expect(result).toContain("@media:");
    expect(h.media()).toHaveLength(1);
    expect(h.media()[0].name).toBe("cover.jpg");
    expect(h.overlays()).toHaveLength(0);
  });

  it("use_brand_asset errors when no active kit exists", async () => {
    const h = contextWithEditor();
    h.ctx.brandKit = null;
    const result = await TOOL_BY_NAME.use_brand_asset.run({ asset: "ba-logo", action: "logo_overlay" }, h.ctx, () => undefined);
    expect(result).toContain("אין ערכת מותג פעילה");
    expect(h.media()).toHaveLength(0);
  });
});
