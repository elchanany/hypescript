import { describe, it, expect } from "vitest";
import { buildConcatGraph, toExecArgs } from "./graph";
import { Clip, MediaAsset } from "@/lib/editor/model";

const vid = (id: string): MediaAsset => ({ id, name: `${id}.mp4`, kind: "video", duration: 60, file: new File([], `${id}.mp4`), url: "" });
const clip = (sourceId: string, start: number, end: number): Clip => ({ id: `c_${sourceId}_${start}`, sourceId, start, end });

describe("export render graph — single continuous stream, no per-clip encode", () => {
  const media = [vid("a"), vid("b")];
  // 20 cuts alternating between two sources (the acceptance-test shape).
  const clips: Clip[] = Array.from({ length: 20 }, (_, i) => clip(i % 2 === 0 ? "a" : "b", i, i + 1));
  const g = buildConcatGraph(clips, media, { w: 1280, h: 720, fps: 30 });
  const args = toExecArgs(g, "out.mp4");
  const argStr = args.join(" ");

  it("produces exactly one concat of all N segments", () => {
    expect(g.segmentCount).toBe(20);
    expect((g.filterComplex.match(/concat=n=/g) || []).length).toBe(1);
    expect(g.filterComplex).toContain("concat=n=20:v=1:a=1[outv][outa]");
  });

  it("encodes video and audio exactly once (no per-clip encode)", () => {
    expect((argStr.match(/libx264/g) || []).length).toBe(1);
    expect((argStr.match(/-c:a aac/g) || []).length).toBe(1);
    expect(argStr).not.toContain("concat:");    // no concat protocol
    expect(argStr).not.toContain("-c copy");    // no stream copy of inexact cuts
  });

  it("each segment resets PTS and cuts both video and audio", () => {
    expect((g.filterComplex.match(/\]trim=start=/g) || []).length).toBe(20); // video cut (] before trim)
    expect((g.filterComplex.match(/atrim=start=/g) || []).length).toBe(20);  // audio cut
    expect((g.filterComplex.match(/asetpts=PTS-STARTPTS/g) || []).length).toBe(20); // audio PTS reset
    expect(g.filterComplex).toContain("setpts=PTS-STARTPTS");                        // video PTS reset
    expect((g.filterComplex.match(/trim=end_frame=/g) || []).length).toBe(20);       // exact-frame lock per segment
  });

  it("normalizes timebase, fps, format, samplerate, channels, and async audio (the join fix)", () => {
    expect(g.filterComplex).toContain("aresample=async=1:first_pts=0"); // fills/aligns audio ts at joins
    expect(g.filterComplex).toContain("settb=1/30");                     // video timebase
    expect(g.filterComplex).toContain("asettb=1/44100");                 // audio timebase
    expect(g.filterComplex).toContain("fps=30");
    expect(g.filterComplex).toContain("format=yuv420p");
    expect(g.filterComplex).toContain("aformat=sample_rates=44100:channel_layouts=stereo");
  });

  it("outputs faststart mp4", () => {
    expect(argStr).toContain("-movflags +faststart");
    expect(args[args.length - 1]).toBe("out.mp4");
  });

  it("reuses a single input per source across its clips", () => {
    // two sources -> exactly two -i inputs despite 20 clips
    expect((g.inputArgs.filter((a) => a === "-i")).length).toBe(2);
    expect(g.writes.length).toBe(2);
  });

  it("applies clip volume and mute into the audio gain", () => {
    const muted = buildConcatGraph([clip("a", 0, 1)], [vid("a")], { w: 640, h: 360, fps: 25 }, { audioMuted: true });
    expect(muted.filterComplex).toContain("volume=0.000");
  });

  it("applies clip opacity against black before final yuv conversion", () => {
    const faded = { ...clip("a", 0, 1), opacity: 0.4 };
    const graph = buildConcatGraph([faded], [vid("a")], { w: 640, h: 360, fps: 25 });
    expect(graph.filterComplex).toContain("format=rgb24,colorchannelmixer=rr=0.400:gg=0.400:bb=0.400,format=yuv420p");
  });

  it("applies clip contrast and saturation before final yuv conversion", () => {
    const adjusted = { ...clip("a", 0, 1), contrast: 1.25, saturation: 0.4 };
    const graph = buildConcatGraph([adjusted], [vid("a")], { w: 640, h: 360, fps: 25 });
    expect(graph.filterComplex).toContain("eq=contrast=1.250:saturation=0.400");
    expect(graph.filterComplex.indexOf("eq=contrast")).toBeLessThan(graph.filterComplex.indexOf("format=yuv420p"));
  });

  it("inserts black lavfi segments for gap clips without dropping neighbors", () => {
    const withGap: Clip[] = [clip("a", 0, 1), { id: "g1", sourceId: "__gap__", start: 0, end: 0.5 }, clip("b", 0, 1)];
    const g = buildConcatGraph(withGap, media, { w: 640, h: 360, fps: 30 });
    expect(g.segmentCount).toBe(3);
    expect(g.inputArgs.join(" ")).toContain("color=c=black");
    expect(g.inputArgs.join(" ")).toContain("anullsrc=");
    expect(g.filterComplex).toContain("concat=n=3:v=1:a=1[outv][outa]");
    // still exactly one encode
    expect(toExecArgs(g, "out.mp4").join(" ").match(/libx264/g)?.length).toBe(1);
  });
});
