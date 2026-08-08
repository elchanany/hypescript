import { describe, expect, it } from "vitest";
import { ensureBuiltinCommands } from "./commands.builtin";
import { listRunnableCommands } from "./commandSurface";
import type { EditorApi } from "./commands";

function api(): EditorApi {
  const clips = [{ id: "c1", sourceId: "m1", start: 0, end: 2, enabled: true }];
  return {
    getClips: () => clips, setClips: () => {}, getOverlays: () => [], setOverlays: () => {},
    updateOverlay: () => {}, removeOverlay: () => {}, addOverlay: () => {}, updateClip: () => {},
    getMedia: () => [], getSubs: () => [], getTracks: () => [], setTracks: () => {},
    getCanvas: () => ({ width: 1280, height: 720 }), selectClip: () => {}, selectOverlay: () => {}, seek: () => {}, getPlayhead: () => 1,
  };
}

describe("dynamic command surface", () => {
  ensureBuiltinCommands();

  it("derives applicable shortcut commands and selected clip arguments from registry contracts", () => {
    const entries = listRunnableCommands(api(), { clipId: "c1", overlayId: null }, "shortcut");
    expect(entries.find((entry) => entry.command.id === "clip.delete.ripple")?.args).toEqual({ id: "c1" });
    expect(entries.find((entry) => entry.command.id === "clip.setEnabled")?.args).toEqual({ id: "c1", enabled: false });
    expect(entries.some((entry) => entry.command.id === "clip.roll")).toBe(false);
  });

  it("honors permissions and hides selection-dependent commands without a selection", () => {
    const noSelection = listRunnableCommands(api(), { clipId: null, overlayId: null }, "shortcut");
    expect(noSelection.some((entry) => entry.command.id === "clip.delete.ripple")).toBe(false);
    expect(listRunnableCommands(api(), { clipId: "c1", overlayId: null }, "shortcut", ["project.read"])).toEqual([]);
  });

  it("builds clip and gap context menus from registry target metadata", () => {
    const normal = listRunnableCommands(api(), { clipId: "c1", overlayId: null }, "context-menu");
    expect(normal.map((entry) => entry.command.id)).toEqual([
      "clip.duplicate",
      "clip.splitAtPlayhead",
      "clip.setEnabled",
      "clip.delete.leaveGap",
      "clip.delete.ripple",
    ]);

    const gapApi = api();
    gapApi.getClips = () => [{ id: "gap", sourceId: "__gap__", start: 0, end: 2 }];
    const gap = listRunnableCommands(gapApi, { clipId: "gap", overlayId: null }, "context-menu");
    expect(gap.map((entry) => entry.command.id)).toEqual(["gap.close"]);
  });

  it("derives track actions and hides type-incompatible or unsafe removal commands", () => {
    const trackApi = api();
    trackApi.getTracks = () => [
      { id: "v1", name: "וידאו", type: "video", order: 0, height: 64, locked: false, muted: false },
      { id: "a1", name: "אודיו", type: "audio", order: 1, height: 56, locked: true, muted: false },
    ];
    const audio = listRunnableCommands(trackApi, { clipId: null, overlayId: null, trackId: "a1" }, "context-menu");
    expect(audio.map((entry) => entry.command.id)).toEqual(["track.setLocked", "track.setMuted", "track.setHeight"]);
    expect(audio.find((entry) => entry.command.id === "track.setLocked")?.args).toMatchObject({ trackId: "a1", locked: false });
    expect(audio.find((entry) => entry.command.id === "track.setHeight")?.args).toMatchObject({ trackId: "a1", height: 96 });

    expect(listRunnableCommands(trackApi, { clipId: null, overlayId: null, trackId: "v1" }, "context-menu").map((entry) => entry.command.id))
      .toEqual(["track.setLocked", "track.setHeight"]);
    trackApi.getTracks = () => [
      { id: "v1", name: "וידאו", type: "video", order: 0, height: 64, locked: false, muted: false },
      { id: "v2", name: "וידאו 2", type: "video", order: 1, height: 64, locked: false, muted: false },
    ];
    expect(listRunnableCommands(trackApi, { clipId: null, overlayId: null, trackId: "v2" }, "context-menu").map((entry) => entry.command.id))
      .toEqual(["track.setLocked", "track.setHeight", "track.removeVideo"]);
  });
});
