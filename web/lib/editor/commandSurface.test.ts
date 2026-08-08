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
});
