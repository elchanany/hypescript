import { beforeAll, describe, expect, it } from "vitest";
import { ensureBuiltinCommands } from "./commands.builtin";
import { runCommand, type EditorApi } from "./commands";
import type { Clip, MediaAsset } from "./model";
import type { TrackMeta } from "./project";

beforeAll(() => ensureBuiltinCommands());

function harness(media: MediaAsset[], initial: Clip[] = []) {
  let clips = initial;
  const tracks: TrackMeta[] = [
    { id: "v1", name: "וידאו", type: "video", order: 0, height: 64, locked: false, muted: false },
    { id: "a1", name: "אודיו", type: "audio", order: 1, height: 56, locked: false, muted: false },
  ];
  const api: EditorApi = {
    getClips: () => clips, setClips: (next) => { clips = next || []; }, getOverlays: () => [], setOverlays: () => {},
    updateOverlay: () => {}, removeOverlay: () => {}, addOverlay: () => {}, updateClip: () => {}, getMedia: () => media,
    getSubs: () => [], getTracks: () => tracks, setTracks: () => {}, getCanvas: () => ({ width: 1280, height: 720 }),
    selectClip: () => {}, selectOverlay: () => {}, seek: () => {}, getPlayhead: () => 0,
  };
  return { api, clips: () => clips };
}

describe("mixed media composition", () => {
  it("allows a still image to match narration duration beyond its library default", () => {
    const image: MediaAsset = { id: "img", name: "end.png", kind: "image", file: new File([], "end.png"), duration: 4, url: "blob:image" };
    const h = harness([image]);
    expect(runCommand("clip.add", h.api, { sourceId: "img", trackId: "v1", timeline_start: 60, duration_seconds: 9.2 }).ok).toBe(true);
    const clip = h.clips().find((item) => item.sourceId === "img")!;
    expect(clip.end - clip.start).toBeCloseTo(9.2);
  });

  it("detaches video audio at the same timeline time and mutes the visual copy", () => {
    const video: MediaAsset = { id: "vid", name: "talk.mp4", kind: "video", file: new File([], "talk.mp4"), duration: 12, url: "blob:video" };
    const h = harness([video], [{ id: "vclip", sourceId: "vid", start: 2, end: 8, trackId: "v1" }]);
    expect(runCommand("clip.detachAudio", h.api, { id: "vclip" }).ok).toBe(true);
    expect(h.clips().find((item) => item.id === "vclip")?.volume).toBe(0);
    const audio = h.clips().find((item) => item.trackId === "a1")!;
    expect(audio.sourceId).toBe("vid");
    expect(audio.end - audio.start).toBe(6);
  });
});
