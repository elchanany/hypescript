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
    expect(ids).toContain("clip.duplicate");
    expect(ids).toContain("caption.setStyle");
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

  it("duplicate inserts a copy after the source clip", () => {
    const api = fakeApi([{ id: "a", sourceId: "m", start: 0, end: 2 }]);
    const r = runCommand("clip.duplicate", api, { id: "a" });
    expect(r.ok).toBe(true);
    expect(api.clips).toHaveLength(2);
    expect(api.clips[0].id).toBe("a");
    expect(api.clips[1].id).not.toBe("a");
    expect(api.clips[1].end).toBe(2);
  });

  it("caption.setStyle patches via api hooks", () => {
    const api = fakeApi([]) as any;
    api.style = { fontSize: 4.5, color: "#ffffff", bold: true, position: "bottom", bg: "soft" };
    api.getCaptionStyle = () => api.style;
    api.setCaptionStyle = (s: any) => { api.style = s; };
    const r = runCommand("caption.setStyle", api, { position: "top", fontSize: 7 });
    expect(r.ok).toBe(true);
    expect(api.style.position).toBe("top");
    expect(api.style.fontSize).toBe(7);
  });

  it("queryProject reports counts", () => {
    const api = fakeApi([{ id: "a", sourceId: "m", start: 0, end: 2 }]);
    const q = queryProject(api, { clipId: "a", overlayId: null });
    expect(q.clipCount).toBe(1);
    expect(q.selectedClipId).toBe("a");
    expect(q.duration).toBeCloseTo(2, 5);
  });

  it("roll and slip go through CommandBus", () => {
    const api = fakeApi([
      { id: "a", sourceId: "m", start: 0, end: 2 },
      { id: "b", sourceId: "m", start: 2, end: 6 },
    ]) as any;
    api.getMediaDuration = () => 100;
    expect(runCommand("clip.roll", api, { id: "a", delta: 0.5 }).ok).toBe(true);
    expect(api.clips[0].end).toBeCloseTo(2.5, 5);
    expect(runCommand("clip.slip", api, { id: "b", delta: 1 }).ok).toBe(true);
    expect(api.clips[1].start).toBeCloseTo(3.5, 5);
  });
});
