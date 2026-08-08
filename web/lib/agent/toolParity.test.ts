import { beforeAll, describe, expect, it } from "vitest";
import { ensureBuiltinCommands } from "@/lib/editor/commands.builtin";
import type { EditorApi } from "@/lib/editor/commands";
import type { Clip } from "@/lib/editor/model";
import type { TrackMeta } from "@/lib/editor/project";
import { TOOL_BY_NAME, type AgentContext } from "./tools";

beforeAll(() => ensureBuiltinCommands());

function contextWithEditor(): { ctx: AgentContext; clips: () => Clip[]; tracks: () => TrackMeta[]; updates: () => number } {
  let current: Clip[] = [{ id: "clip-1", sourceId: "media-1", start: 0, end: 4, enabled: true, volume: 1 }];
  let currentTracks: TrackMeta[] = [
    { id: "video-1", name: "וידאו", type: "video", order: 0, height: 64, locked: false, muted: false },
    { id: "video-2", name: "B-roll", type: "video", order: 1, height: 64, locked: false, muted: false },
    { id: "audio-1", name: "אודיו", type: "audio", order: 2, height: 56, locked: false, muted: false },
  ];
  let updateCount = 0;
  const api: EditorApi = {
    getClips: () => current,
    setClips: (next) => { current = next || []; },
    getOverlays: () => [],
    setOverlays: () => undefined,
    updateOverlay: () => undefined,
    removeOverlay: () => undefined,
    addOverlay: () => undefined,
    updateClip: (id, patch) => {
      updateCount += 1;
      current = current.map((clip) => clip.id === id ? { ...clip, ...patch } : clip);
    },
    getMedia: () => [],
    getSubs: () => [],
    setSubs: () => undefined,
    getTracks: () => currentTracks,
    setTracks: (next) => { currentTracks = next; },
    getCanvas: () => ({ width: 1280, height: 720 }),
    selectClip: () => undefined,
    selectOverlay: () => undefined,
    seek: () => undefined,
    getPlayhead: () => 0,
  };
  const ctx = {
    media: [], duration: 4, words: null, transcripts: {}, clips: current, subs: [], overlays: [], tracks: currentTracks,
    canvas: { width: 1280, height: 720 }, lastRender: null, editorApi: api,
    askUser: async () => "",
  } satisfies AgentContext;
  return { ctx, clips: () => current, tracks: () => currentTracks, updates: () => updateCount };
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
});
