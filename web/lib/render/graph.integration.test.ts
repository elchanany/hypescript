// REAL export verification: renders a >=20-cut EDL with NATIVE FFmpeg using the exact
// command from graph.ts, then inspects the result with ffprobe. This is the integration
// test the unit test cannot replace. Skips cleanly if ffmpeg/ffprobe are not installed.
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, copyFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildConcatGraph, toExecArgs } from "./graph";
import { Clip, MediaAsset } from "@/lib/editor/model";

function has(bin: string) { try { execFileSync(bin, ["-version"], { stdio: "ignore" }); return true; } catch { return false; } }
const FF = has("ffmpeg") && has("ffprobe");

const ff = (args: string[], cwd?: string) => execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { cwd, stdio: "pipe" });
const probe = (args: string[]) => JSON.parse(execFileSync("ffprobe", ["-v", "error", "-of", "json", ...args], { encoding: "utf8" }));
const fmtDur = (f: string) => parseFloat(probe(["-show_entries", "format=duration", f]).format.duration);
const vstream = (f: string) => probe(["-select_streams", "v:0", "-show_entries", "stream=avg_frame_rate,r_frame_rate,duration", f]).streams[0];
const astream = (f: string) => probe(["-select_streams", "a:0", "-show_entries", "stream=sample_rate,channels,duration", f]).streams[0];
function vPackets(f: string) {
  const j = probe(["-select_streams", "v:0", "-show_entries", "packet=pts_time", f]);
  const pts = (j.packets as any[]).map((p) => parseFloat(p.pts_time)).filter((x) => !isNaN(x)).sort((a, b) => a - b);
  let max = 0; for (let i = 1; i < pts.length; i++) max = Math.max(max, pts[i] - pts[i - 1]);
  return { count: pts.length, maxDelta: max, last: pts[pts.length - 1] };
}

const asset = (id: string): MediaAsset => ({ id, name: `${id}.mp4`, kind: "video", duration: 6, file: { name: `${id}.mp4` } as File, url: "" });
const clip = (sourceId: string, start: number, end: number): Clip => ({ id: `c_${sourceId}_${start}_${end}`, sourceId, start, end });

describe.skipIf(!FF)("export integration — native FFmpeg render + ffprobe join analysis", () => {
  const FPS = 30, TOL_FRAME = 1 / FPS;

  it("renders 20 mixed cuts as one continuous stream with no join gaps", () => {
    const dir = mkdtempSync(join(tmpdir(), "hs-render-"));
    // Source A: genuine VFR (jittered PTS, passthrough), 48000 Hz audio.
    ff(["-f", "lavfi", "-i", "testsrc2=size=640x360:rate=30:duration=6",
      "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=6",
      "-vf", "setpts=PTS+0.008*sin(N)", "-fps_mode", "passthrough",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "48000", join(dir, "srcA.mp4")]);
    // Source B: clean 25 fps CFR, 44100 Hz audio (different rate + samplerate than A).
    ff(["-f", "lavfi", "-i", "testsrc2=size=854x480:rate=25:duration=6",
      "-f", "lavfi", "-i", "sine=frequency=660:sample_rate=44100:duration=6",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "25", "-c:a", "aac", "-ar", "44100", join(dir, "srcB.mp4")]);

    // 20 cuts alternating sources; non-keyframe offsets; short + long; mid-stream.
    const clips: Clip[] = [];
    for (let i = 0; i < 20; i++) {
      const src = i % 2 === 0 ? "a" : "b";
      const start = +(0.2 + ((i * 0.23) % 3.5)).toFixed(2);
      const len = i % 3 === 0 ? 0.3 : i % 3 === 1 ? 0.5 : 0.8;
      clips.push(clip(src, start, +(start + len).toFixed(2)));
    }
    clips[7].opacity = 0.45; // exercise the native opacity filter inside a real 20-cut render
    clips[8].contrast = 1.2; clips[8].saturation = 0.5; // exercise real color adjustment export
    clips[9].fadeIn = 0.1; clips[9].fadeOut = 0.15; // exercise real clip-edge audio fades
    clips[10].visualFadeIn = 0.1; clips[10].visualFadeOut = 0.15; // exercise real fade-to-black export
    clips[11].flipX = true; clips[11].flipY = true; // exercise both native flip filters
    const media = [asset("a"), asset("b")];
    // frame-quantized sum — the physically achievable duration (video is whole frames)
    const snap = (c: Clip) => Math.max(1, Math.round((c.end - c.start) * FPS)) / FPS;
    const sumDur = clips.reduce((s, c) => s + snap(c), 0);

    const g = buildConcatGraph(clips, media, { w: 1280, h: 720, fps: FPS });
    // place the real source files under the builder's expected input names (m0.mp4, m1.mp4)
    for (const wsr of g.writes) copyFileSync(join(dir, wsr.assetId === "a" ? "srcA.mp4" : "srcB.mp4"), join(dir, wsr.filename));
    ff(toExecArgs(g, "out.mp4"), dir);

    const out = join(dir, "out.mp4");
    const outDur = fmtDur(out);
    const v = vstream(out), a = astream(out), vp = vPackets(out);
    const audioDrift = Math.abs(parseFloat(a.duration) - parseFloat(v.duration));
    const report = {
      segments: clips.length, sumDur: +sumDur.toFixed(3), outDur: +outDur.toFixed(3),
      durationDelta: +(outDur - sumDur).toFixed(3), fps: `${v.avg_frame_rate} (r=${v.r_frame_rate})`,
      audio: `${a.sample_rate}Hz x${a.channels}`, audioDriftSec: +audioDrift.toFixed(3),
      videoFrames: vp.count, expectedFrames: Math.round(outDur * FPS), maxVideoGapSec: +vp.maxDelta.toFixed(4),
    };
    // eslint-disable-next-line no-console
    console.log("[export-integration]", JSON.stringify(report, null, 2));

    // 1) total duration == sum of segments within ONE frame (no per-join padding)
    expect(Math.abs(outDur - sumDur)).toBeLessThan(1.5 * TOL_FRAME);
    // 1b) no duplicate frames inserted at joins: frame count == quantized-sum frames
    expect(Math.abs(vp.count - sumDur * FPS)).toBeLessThan(1.5);
    // 2) CFR output (avg == r frame rate)
    expect(v.avg_frame_rate).toBe(v.r_frame_rate);
    expect(v.avg_frame_rate).toBe(`${FPS}/1`);
    // 3) audio normalized + no drift vs video
    expect(a.sample_rate).toBe("44100");
    expect(a.channels).toBe(2);
    expect(audioDrift).toBeLessThan(3 * TOL_FRAME);
    // 4) frame count matches duration (no frozen/duplicated pileup)
    expect(Math.abs(vp.count - outDur * FPS)).toBeLessThan(5);
    // 5) no video stall at any join (no held frame beyond ~1 frame)
    expect(vp.maxDelta).toBeLessThan(2.2 * TOL_FRAME);
  }, 240000);
});
