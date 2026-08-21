import { describe, expect, it } from "vitest";
import { applyTrackMute } from "./tracks";
import { buildConcatGraph } from "@/lib/render/graph";
import type { Clip, MediaAsset } from "./model";
import type { TrackMeta } from "./project";

const TRACKS: TrackMeta[] = [
  { id: "trk_video", type: "video", name: "וידאו", order: 0 },
  { id: "trk_video_2", type: "video", name: "וידאו 2", order: 1 },
  { id: "trk_audio", type: "audio", name: "אודיו", order: 2 },
];

const clip = (id: string, trackId: string, extra: Partial<Clip> = {}): Clip =>
  ({ id, sourceId: "src", start: 0, end: 2, trackId, ...extra });

function muteTrack(id: string): TrackMeta[] {
  return TRACKS.map((t) => (t.id === id ? { ...t, muted: true } : t));
}

describe("applyTrackMute", () => {
  it("silences only the clips on the muted track", () => {
    const clips = [clip("a", "trk_video"), clip("b", "trk_audio")];
    const out = applyTrackMute(clips, muteTrack("trk_audio"));
    expect(out[0].volume).toBeUndefined();   // הדיבור שבווידאו נשאר
    expect(out[1].volume).toBe(0);
  });

  it("muting a VIDEO track silences that track (previously a no-op)", () => {
    const clips = [clip("a", "trk_video"), clip("b", "trk_video_2")];
    const out = applyTrackMute(clips, muteTrack("trk_video_2"));
    expect(out[0].volume).toBeUndefined();
    expect(out[1].volume).toBe(0);
  });

  it("treats a clip without an explicit trackId as the primary video track", () => {
    const clips = [{ id: "a", sourceId: "src", start: 0, end: 2 } as Clip];
    expect(applyTrackMute(clips, muteTrack("trk_video"))[0].volume).toBe(0);
    expect(applyTrackMute(clips, muteTrack("trk_audio"))[0].volume).toBeUndefined();
  });

  it("returns the same array reference when nothing is muted, so memoized callers do not rerender", () => {
    const clips = [clip("a", "trk_video")];
    expect(applyTrackMute(clips, TRACKS)).toBe(clips);
  });

  it("does not clone clips that are already silent", () => {
    const clips = [clip("a", "trk_audio", { volume: 0 })];
    expect(applyTrackMute(clips, muteTrack("trk_audio"))[0]).toBe(clips[0]);
  });

  it("keeps an explicit non-default volume on unmuted tracks", () => {
    const clips = [clip("a", "trk_video", { volume: 0.4 })];
    expect(applyTrackMute(clips, muteTrack("trk_audio"))[0].volume).toBe(0.4);
  });
});

// אימות שההשתקה באמת מגיעה עד פקודת ה-FFmpeg — לא רק עד המודל.
describe("track mute reaches the export command", () => {
  const media: MediaAsset[] = [
    { id: "v1", name: "a.mp4", kind: "video", url: "blob:v", duration: 10, file: new File([], "a.mp4") },
  ];
  const target = { w: 640, h: 360, fps: 25 };

  it("muting the audio track leaves the video's own audio at full gain", () => {
    const clips = [{ id: "c1", sourceId: "v1", start: 0, end: 2, trackId: "trk_video" }];
    const muted = applyTrackMute(clips, muteTrack("trk_audio"));
    const graph = buildConcatGraph(muted, media, target);
    expect(graph.filterComplex).toContain("volume=1.000");
    expect(graph.filterComplex).not.toContain("volume=0.000");
  });

  it("muting the clip's own video track zeroes its gain in the filter graph", () => {
    const clips = [{ id: "c1", sourceId: "v1", start: 0, end: 2, trackId: "trk_video" }];
    const muted = applyTrackMute(clips, muteTrack("trk_video"));
    const graph = buildConcatGraph(muted, media, target);
    expect(graph.filterComplex).toContain("volume=0.000");
  });
});
