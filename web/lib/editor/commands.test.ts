import { describe, it, expect } from "vitest";
import { ensureBuiltinCommands } from "./commands.builtin";
import { EditorApi, listAgentCommands, listCommands, queryProject, runCommand } from "./commands";
import { Clip } from "./model";

function fakeApi(clips: Clip[]): EditorApi & { clips: Clip[] } {
  const api: any = {
    clips: [...clips],
    overlays: [] as any[],
    tracks: [
      { id: "trk_video", name: "וידאו", type: "video", order: 0, height: 64, locked: false, muted: false },
      { id: "trk_audio", name: "אודיו", type: "audio", order: 1, height: 56, locked: false, muted: false },
      { id: "trk_caption", name: "כתוביות", type: "caption", order: 2, height: 48, locked: false, muted: false },
    ],
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
    getMedia: () => [{ id: "m", name: "a.mp4", kind: "video", file: null, duration: 100, url: "" }],
    getSubs: () => null,
    setSubs: () => {},
    getTracks: () => api.tracks,
    setTracks: (t: any[]) => { api.tracks = t; },
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

  it("publishes complete contracts and scopes agent-callable commands", () => {
    const commands = listCommands();
    for (const command of commands) {
      expect(command.inputSchema.type).toBe("object");
      expect(command.resultSchema.type).toBe("object");
      expect(command.permissions).toContain("project.write");
      expect(command.contexts).toContain("editor");
      expect(command.contexts.includes("agent")).toBe(command.agentCallable);
    }
    const agentIds = listAgentCommands().map((c) => c.id);
    expect(agentIds).toContain("track.reorder");
    expect(agentIds).toContain("clip.setOpacity");
    expect(agentIds).toContain("clip.setAudioFades");
    expect(agentIds).toContain("clip.setVisualFades");
    expect(agentIds).toContain("clip.setFlip");
    expect(agentIds).toContain("clip.replaceAll");
    expect(agentIds).toContain("subtitle.replaceAll");
    expect(agentIds).toContain("overlay.addText");
    expect(agentIds).toContain("overlay.addImage");
    expect(agentIds).toContain("overlay.update");
    expect(agentIds).toContain("overlay.delete");
  });

  it("rejects invalid arguments before mutation", () => {
    const api = fakeApi([{ id: "a", sourceId: "m", start: 0, end: 2 }]);
    const before = [...api.clips];
    expect(runCommand("clip.setVolume", api, { id: "a", volume: "loud" as any })).toEqual({ ok: false, error: "פרמטר לא תקין: volume" });
    expect(runCommand("track.rename", api, { trackId: "trk_video" })).toEqual({ ok: false, error: "חסר פרמטר: name" });
    expect(api.clips).toEqual(before);
  });

  it("clamps clip opacity through CommandBus", () => {
    const api = fakeApi([{ id: "a", sourceId: "m", start: 0, end: 2 }]);
    expect(runCommand("clip.setOpacity", api, { id: "a", opacity: 4 }).ok).toBe(true);
    expect(api.clips[0].opacity).toBe(1);
    expect(runCommand("clip.setOpacity", api, { id: "a", opacity: -1 }).ok).toBe(true);
    expect(api.clips[0].opacity).toBe(0);
  });

  it("clamps clip color adjustments through CommandBus", () => {
    const api = fakeApi([{ id: "a", sourceId: "m", start: 0, end: 2 }]);
    expect(runCommand("clip.setColorAdjustments", api, { id: "a", contrast: 8, saturation: -2 }).ok).toBe(true);
    expect(api.clips[0]).toMatchObject({ contrast: 2, saturation: 0 });
  });

  it("normalizes audio fades through CommandBus", () => {
    const api = fakeApi([{ id: "a", sourceId: "m", start: 0, end: 4 }]);
    expect(runCommand("clip.setAudioFades", api, { id: "a", fadeIn: 6, fadeOut: 2 }).ok).toBe(true);
    expect(api.clips[0]).toMatchObject({ fadeIn: 8 / 3, fadeOut: 4 / 3 });
  });

  it("normalizes visual fades through CommandBus", () => {
    const api = fakeApi([{ id: "a", sourceId: "m", start: 0, end: 4 }]);
    expect(runCommand("clip.setVisualFades", api, { id: "a", fadeIn: 3, fadeOut: 3 }).ok).toBe(true);
    expect(api.clips[0]).toMatchObject({ visualFadeIn: 2, visualFadeOut: 2 });
  });

  it("updates one flip axis without clearing the other", () => {
    const api = fakeApi([{ id: "a", sourceId: "m", start: 0, end: 4, flipY: true }]);
    expect(runCommand("clip.setFlip", api, { id: "a", flipX: true }).ok).toBe(true);
    expect(api.clips[0]).toMatchObject({ flipX: true, flipY: true });
  });

  it("atomically replaces validated clip and subtitle collections", () => {
    const api = fakeApi([{ id: "a", sourceId: "m", start: 0, end: 2 }]) as any;
    api.subs = [];
    api.getSubs = () => api.subs;
    api.setSubs = (subtitles: any[]) => { api.subs = subtitles; };
    const nextClips = [{ id: "b", sourceId: "m", start: 2, end: 4, trackId: "trk_video" }];
    const nextSubs = [{ id: "s", start: 0, end: 1, text: "חדש" }];
    expect(runCommand("clip.replaceAll", api, { clips: nextClips }).ok).toBe(true);
    expect(runCommand("subtitle.replaceAll", api, { subtitles: nextSubs }).ok).toBe(true);
    expect(api.clips).toEqual(nextClips);
    expect(api.subs).toEqual(nextSubs);
    expect(runCommand("clip.replaceAll", api, { clips: [{ id: "bad" }] }).ok).toBe(false);
    expect(api.clips).toEqual(nextClips);
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

  it("adds full-frame images and standalone audio at exact timeline positions", () => {
    const api = fakeApi([{ id: "base", sourceId: "m", start: 0, end: 4, trackId: "trk_video" }]) as any;
    api.getMedia = () => [
      { id: "m", name: "a.mp4", kind: "video", duration: 100, url: "" },
      { id: "img", name: "still.png", kind: "image", duration: 5, url: "" },
      { id: "music", name: "music.mp3", kind: "audio", duration: 8, url: "" },
    ];
    expect(runCommand("clip.add", api, { sourceId: "img", trackId: "trk_video", timeline_start: 2, start: 0, end: 5 }).ok).toBe(true);
    expect(api.clips.filter((c: Clip) => c.trackId === "trk_video").map((c: Clip) => c.sourceId)).toEqual(["m", "img", "m"]);
    expect(runCommand("clip.add", api, { sourceId: "music", trackId: "trk_audio", timeline_start: 3, start: 0, end: 8 }).ok).toBe(true);
    const audio = api.clips.filter((c: Clip) => c.trackId === "trk_audio");
    expect(audio[0]).toMatchObject({ sourceId: "__gap__", end: 3 });
    expect(audio[1]).toMatchObject({ sourceId: "music", start: 0, end: 8 });
  });

  it("edits and deletes subtitles through CommandBus", () => {
    const api = fakeApi([]) as any;
    api.subs = [{ id: "s1", start: 0, end: 1, text: "ישן" }];
    api.getSubs = () => api.subs;
    api.setSubs = (subs: any[]) => { api.subs = subs; };
    expect(runCommand("subtitle.edit", api, { id: "s1", text: "חדש" }).ok).toBe(true);
    expect(api.subs[0].text).toBe("חדש");
    expect(runCommand("subtitle.delete", api, { id: "s1" }).ok).toBe(true);
    expect(api.subs).toEqual([]);
  });

  it("retimes and clears subtitles through CommandBus with safe bounds", () => {
    const api = fakeApi([]) as any;
    api.subs = [{ id: "s1", start: 1, end: 2, text: "טקסט" }];
    api.getSubs = () => api.subs;
    api.setSubs = (subs: any[]) => { api.subs = subs; };
    expect(runCommand("subtitle.retime", api, { id: "s1", start: -2, end: 0.05 }).ok).toBe(true);
    expect(api.subs[0]).toMatchObject({ start: 0, end: 0.2 });
    expect(runCommand("subtitle.clear", api).ok).toBe(true);
    expect(api.subs).toEqual([]);
  });

  it("fails closed when removing referenced media and removes only an unused asset", () => {
    const api = fakeApi([{ id: "c1", sourceId: "m", start: 0, end: 2 }]) as any;
    let media = api.getMedia();
    api.getMedia = () => media;
    api.removeMediaAsset = (id: string) => { media = media.filter((item: any) => item.id !== id); };
    const blocked = runCommand("media.remove", api, { id: "m" });
    expect(blocked).toMatchObject({ ok: false });
    expect((blocked as any).error).toContain("בשימוש");
    expect(media).toHaveLength(1);

    api.clips = [];
    expect(runCommand("media.remove", api, { id: "m" }).ok).toBe(true);
    expect(media).toEqual([]);
  });

  it("adds and normalizes overlay updates through CommandBus", () => {
    const api = fakeApi([]) as any;
    api.updateOverlay = (id: string, patch: any) => { api.overlays = api.overlays.map((item: any) => item.id === id ? { ...item, ...patch } : item); };
    expect(runCommand("overlay.addText", api, { text: "כותרת", start: 2, end: 3 }).ok).toBe(true);
    const id = api.overlays[0].id;
    expect(api.overlays[0]).toMatchObject({ text: "כותרת", start: 2, end: 3 });
    expect(runCommand("overlay.update", api, { id, patch: { start: -4, end: -1, zIndex: 7, borderRadius: 22, borderColor: "#00ffff", borderWidth: 3, transform: { ...api.overlays[0].transform, w: 1, opacity: 5 } } }).ok).toBe(true);
    expect(api.overlays[0].start).toBe(0);
    expect(api.overlays[0].end).toBe(0.05);
    expect(api.overlays[0].transform).toMatchObject({ w: 8, opacity: 1 });
    expect(api.overlays[0]).toMatchObject({ zIndex: 7, borderRadius: 22, borderColor: "#00ffff", borderWidth: 3 });
  });

  it("creates a styled dedication card atomically", () => {
    const api = fakeApi([]) as any;
    expect(runCommand("overlay.addText", api, { text: "לעילוי נשמת\nפלוני בן פלונית", start: 0, end: 4, preset: "dedication_card" }).ok).toBe(true);
    expect(api.overlays[0]).toMatchObject({
      kind: "text", background: "rgba(13,25,48,0.94)", borderColor: "#d6ad55", fadeIn: 0.22, fadeOut: 0.22,
    });
    expect(api.overlays[0].borderRadius).toBeGreaterThan(0);
    expect(api.overlays[0].transform.y).toBeLessThan(1080 / 2);
  });

  it("adds image media as a sized overlay through CommandBus", () => {
    const api = fakeApi([]) as any;
    api.getMedia = () => [{ id: "image-1", name: "logo.png", kind: "image", file: null, duration: 4, url: "blob:logo" }];
    expect(runCommand("overlay.addImage", api, { assetId: "image-1", start: 1, end: 5, width: 800, height: 400, preset: "logo_top_left" }).ok).toBe(true);
    expect(api.overlays).toHaveLength(1);
    expect(api.overlays[0]).toMatchObject({ kind: "image", assetId: "image-1", start: 1, end: 5 });
    expect(api.overlays[0].transform.w / api.overlays[0].transform.h).toBeCloseTo(2, 3);
    expect(api.overlays[0].transform.w).toBeLessThanOrEqual(1920 * 0.2);
    expect(api.overlays[0].transform.x).toBeLessThan(1920 / 2);
    expect(api.overlays[0].transform.y).toBeLessThan(1080 / 2);
  });

  it("moves a clip to an exact magnetic time through CommandBus", () => {
    const api = fakeApi([
      { id: "main", sourceId: "m", start: 0, end: 4, trackId: "trk_video" },
      { id: "cutaway", sourceId: "m", start: 4, end: 6, trackId: "trk_video_2" },
    ]) as any;
    api.tracks.push({ id: "trk_video_2", name: "שכבה 2", type: "video", order: 1, height: 64, locked: false, muted: false });
    const result = runCommand("clip.moveAtTimeline", api, { id: "cutaway", trackId: "trk_video", timeline_start: 4 });
    expect(result.ok).toBe(true);
    expect(api.clips.find((clip: any) => clip.id === "cutaway")).toMatchObject({ start: 4, end: 6, trackId: "trk_video" });
  });

  it("adds independent image overlays by stable id and clamps later updates", () => {
    const api = fakeApi([]) as any;
    api.updateOverlay = (id: string, patch: any) => { api.overlays = api.overlays.map((item: any) => item.id === id ? { ...item, ...patch } : item); };
    api.getMedia = () => [
      { id: "logo", name: "logo.png", kind: "image", file: null, duration: 4, url: "blob:logo" },
      { id: "end", name: "end.png", kind: "image", file: null, duration: 4, url: "blob:end" },
    ];
    expect(runCommand("overlay.addImage", api, { assetId: "logo", overlayId: "ov-logo", width: 1000, height: 400, preset: "logo_top_left" }).ok).toBe(true);
    const logoBefore = structuredClone(api.overlays[0]);
    expect(runCommand("overlay.addImage", api, { assetId: "end", overlayId: "ov-end", width: 800, height: 1200, preset: "fit_canvas", locked: true }).ok).toBe(true);
    expect(api.overlays[0]).toEqual(logoBefore);
    expect(api.overlays[1]).toMatchObject({ id: "ov-end", assetId: "end", locked: true });
    expect(runCommand("overlay.update", api, { id: "ov-logo", patch: { transform: { ...api.overlays[0].transform, x: -900, y: -900 } } }).ok).toBe(true);
    expect(api.overlays[0].transform.x - api.overlays[0].transform.w / 2).toBeGreaterThanOrEqual(0);
    expect(api.overlays[0].transform.y - api.overlays[0].transform.h / 2).toBeGreaterThanOrEqual(0);
    expect(api.overlays[1]).toMatchObject({ id: "ov-end", assetId: "end", locked: true });
  });

  it("queryProject reports counts", () => {
    const api = fakeApi([{ id: "a", sourceId: "m", start: 0, end: 2 }]);
    const q = queryProject(api, { clipId: "a", overlayId: null });
    expect(q.clipCount).toBe(1);
    expect(q.selectedClipId).toBe("a");
    expect(q.duration).toBeCloseTo(2, 5);
  });

  it("queryProject exposes the active timeline context and ignores disabled duration", () => {
    const api = fakeApi([
      { id: "off", sourceId: "m", start: 0, end: 10, enabled: false },
      { id: "gap", sourceId: "__gap__", start: 0, end: 0.5 },
      { id: "on", sourceId: "m", start: 20, end: 22 },
    ]) as any;
    api.getPlayhead = () => 0.25;
    api.overlays = [{ id: "ov", start: 0, end: 1, hidden: false, kind: "text", zIndex: 1, transform: {} }];
    api.subs = [{ id: "sub", start: 0.2, end: 0.4, text: "שלום" }];
    api.getSubs = () => api.subs;
    const gap = queryProject(api, { clipId: null, overlayId: null, captionId: "sub" });
    expect(gap).toMatchObject({ duration: 2.5, activeClipId: "gap", activeSourceTime: null, inGap: true, selectedCaptionId: "sub" });
    expect(gap.activeOverlayIds).toEqual(["ov"]);
    expect(gap.activeCaptionIds).toEqual(["sub"]);

    api.getPlayhead = () => 1;
    const source = queryProject(api, { clipId: null, overlayId: null });
    expect(source).toMatchObject({ activeClipId: "on", activeSourceTime: 20.5, inGap: false });
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

  it("split/trim/move go through CommandBus", () => {
    const api = fakeApi([{ id: "a", sourceId: "m", start: 0, end: 10, trackId: "trk_video" }]) as any;
    api.getMediaDuration = () => 100;
    expect(runCommand("clip.split", api, { id: "a", at_source: 4 }).ok).toBe(true);
    expect(api.clips).toHaveLength(2);
    expect(runCommand("clip.trim", api, { id: "a", end: 3 }).ok).toBe(true);
    expect(api.clips[0].end).toBeCloseTo(3, 5);
    expect(runCommand("clip.move", api, { id: api.clips[1].id, to_index: 0 }).ok).toBe(true);
    expect(api.clips[0].id).not.toBe("a");
  });

  it("add and remove video tracks via CommandBus", () => {
    const api = fakeApi([{ id: "a", sourceId: "m", start: 0, end: 2, trackId: "trk_video" }]);
    expect(runCommand("track.addVideo", api, { name: "B-roll" }).ok).toBe(true);
    const vids = api.getTracks().filter((t) => t.type === "video");
    expect(vids.length).toBe(2);
    const extra = vids.find((t) => t.id !== "trk_video")!;
    expect(runCommand("clip.moveToTrack", api, { id: "a", trackId: extra.id }).ok).toBe(true);
    expect(api.clips[0].trackId).toBe(extra.id);
    expect(runCommand("track.removeVideo", api, { trackId: extra.id }).ok).toBe(true);
    expect(api.getTracks().filter((t) => t.type === "video")).toHaveLength(1);
    expect(api.clips[0].trackId).toBe("trk_video");
  });
});
