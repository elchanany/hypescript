import { beforeAll, describe, expect, it } from "vitest";
import { ensureBuiltinCommands } from "@/lib/editor/commands.builtin";
import type { EditorApi } from "@/lib/editor/commands";
import type { Clip } from "@/lib/editor/model";
import type { TrackMeta } from "@/lib/editor/project";
import type { Sub } from "@/lib/editor/subtitlesEdl";
import type { Overlay } from "@/lib/editor/overlay";
import { TOOL_BY_NAME, type AgentContext } from "./tools";

beforeAll(() => ensureBuiltinCommands());

function contextWithEditor(): { ctx: AgentContext; clips: () => Clip[]; tracks: () => TrackMeta[]; subs: () => Sub[]; overlays: () => Overlay[]; updates: () => number } {
  let current: Clip[] = [{ id: "clip-1", sourceId: "media-1", start: 0, end: 4, enabled: true, volume: 1 }];
  let currentTracks: TrackMeta[] = [
    { id: "video-1", name: "וידאו", type: "video", order: 0, height: 64, locked: false, muted: false },
    { id: "video-2", name: "B-roll", type: "video", order: 1, height: 64, locked: false, muted: false },
    { id: "audio-1", name: "אודיו", type: "audio", order: 2, height: 56, locked: false, muted: false },
  ];
  let updateCount = 0;
  const currentMedia: AgentContext["media"] = [];
  let currentSubs: Sub[] = [{ id: "sub-1", start: 0, end: 1, text: "ישן" }];
  let currentOverlays: Overlay[] = [];
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
    getSubs: () => currentSubs,
    setSubs: (next) => { currentSubs = next || []; },
    getTracks: () => currentTracks,
    setTracks: (next) => { currentTracks = next; },
    getCanvas: () => ({ width: 1280, height: 720 }),
    selectClip: () => undefined,
    selectOverlay: () => undefined,
    seek: () => undefined,
    getPlayhead: () => 0,
  };
  const ctx = {
    media: currentMedia, duration: 4, words: null, transcripts: {}, clips: current, subs: currentSubs, overlays: currentOverlays, tracks: currentTracks,
    canvas: { width: 1280, height: 720 }, lastRender: null, editorApi: api,
    askUser: async () => "",
  } satisfies AgentContext;
  return { ctx, clips: () => current, tracks: () => currentTracks, subs: () => currentSubs, overlays: () => currentOverlays, updates: () => updateCount };
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
    await TOOL_BY_NAME.add_image_overlay.run({ source: "image-1", start: 0, end: 2 }, h.ctx, () => undefined);
    expect(h.overlays()[0]).toMatchObject({ kind: "image", assetId: "image-1", start: 0, end: 2 });
    await TOOL_BY_NAME.add_text_overlay.run({ text: "כותרת", start: 1, end: 3 }, h.ctx, () => undefined);
    expect(h.overlays()).toHaveLength(2);
    await TOOL_BY_NAME.update_overlay.run({ index: 2, x: 250, opacity: 2 }, h.ctx, () => undefined);
    expect(h.overlays()[1].transform).toMatchObject({ x: 250, opacity: 1 });
    await TOOL_BY_NAME.delete_overlay.run({ index: 2 }, h.ctx, () => undefined);
    expect(h.overlays()).toHaveLength(1);
    expect(h.ctx._editorDirty).toBe(true);
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
    expect(result).toContain("לא הוסקו נשימה, שיעול או צחוק");
  });
});
