import { describe, it, expect } from "vitest";
import { ensureBuiltinCommands } from "./commands.builtin";
import { EditorApi, listCommands, queryProject, runCommand } from "./commands";
import { Clip } from "./model";

function fakeApi(clips: Clip[]): EditorApi & { clips: Clip[] } {
  const api: any = {
    clips: [...clips],
    overlays: [] as any[],
    getClips: () => api.clips,
    setClips: (c: Clip[] | null) => { api.clips = c || []; },
    getOverlays: () => api.overlays,
    setOverlays: (o: any[]) => { api.overlays = o; },
    updateOverlay: () => {},
    removeOverlay: () => {},
    addOverlay: (o: any) => { api.overlays.push(o); },
    updateClip: (id: string, patch: Partial<Clip>) => {
      api.clips = api.clips.map((c: Clip) => (c.id === id ? { ...c, ...patch } : c));
    },
    getMedia: () => [],
    getSubs: () => null,
    getCanvas: () => ({ width: 1920, height: 1080 }),
    selectClip: () => {},
    selectOverlay: () => {},
    seek: () => {},
    getPlayhead: () => 1,
  };
  return api;
}

describe("CommandBus builtins", () => {
  ensureBuiltinCommands();

  it("registers core commands", () => {
    const ids = listCommands().map((c) => c.id);
    expect(ids).toContain("clip.delete.ripple");
    expect(ids).toContain("clip.delete.leaveGap");
    expect(ids).toContain("overlay.addText");
  });

  it("leave-gap delete preserves timeline duration", () => {
    const api = fakeApi([
      { id: "a", sourceId: "m", start: 0, end: 2 },
      { id: "b", sourceId: "m", start: 0, end: 3 },
    ]);
    const r = runCommand("clip.delete.leaveGap", api, { id: "b" });
    expect(r.ok).toBe(true);
    expect(api.clips).toHaveLength(2);
    expect(api.clips[1].sourceId).toBe("__gap__");
    expect(api.clips[1].end - api.clips[1].start).toBeCloseTo(3, 5);
  });

  it("queryProject reports counts", () => {
    const api = fakeApi([{ id: "a", sourceId: "m", start: 0, end: 2 }]);
    const q = queryProject(api, { clipId: "a", overlayId: null });
    expect(q.clipCount).toBe(1);
    expect(q.selectedClipId).toBe("a");
    expect(q.duration).toBeCloseTo(2, 5);
  });
});
