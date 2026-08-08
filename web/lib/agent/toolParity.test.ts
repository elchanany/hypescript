import { beforeAll, describe, expect, it } from "vitest";
import { ensureBuiltinCommands } from "@/lib/editor/commands.builtin";
import type { EditorApi } from "@/lib/editor/commands";
import type { Clip } from "@/lib/editor/model";
import { TOOL_BY_NAME, type AgentContext } from "./tools";

beforeAll(() => ensureBuiltinCommands());

function contextWithEditor(): { ctx: AgentContext; clips: () => Clip[]; updates: () => number } {
  let current: Clip[] = [{ id: "clip-1", sourceId: "media-1", start: 0, end: 4, enabled: true, volume: 1 }];
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
    getTracks: () => [],
    setTracks: () => undefined,
    getCanvas: () => ({ width: 1280, height: 720 }),
    selectClip: () => undefined,
    selectOverlay: () => undefined,
    seek: () => undefined,
    getPlayhead: () => 0,
  };
  const ctx = {
    media: [], duration: 4, words: null, transcripts: {}, clips: current, subs: [], overlays: [], tracks: [],
    canvas: { width: 1280, height: 720 }, lastRender: null, editorApi: api,
    askUser: async () => "",
  } satisfies AgentContext;
  return { ctx, clips: () => current, updates: () => updateCount };
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
});
