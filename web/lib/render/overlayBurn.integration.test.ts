// Native FFmpeg: burn a still overlay onto a short concat export and verify
// the output is a continuous video of the expected duration. Skips if no ffmpeg.
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, copyFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildConcatGraph, toExecArgs } from "./graph";
import { appendOverlayBurns } from "./overlayBurn";
import { Clip, MediaAsset } from "@/lib/editor/model";

function has(bin: string) { try { execFileSync(bin, ["-version"], { stdio: "ignore" }); return true; } catch { return false; } }
const FF = has("ffmpeg") && has("ffprobe");

const ff = (args: string[], cwd?: string) => execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { cwd, stdio: "pipe" });
const probe = (args: string[]) => JSON.parse(execFileSync("ffprobe", ["-v", "error", "-of", "json", ...args], { encoding: "utf8" }));
const fmtDur = (f: string) => parseFloat(probe(["-show_entries", "format=duration", f]).format.duration);

describe.skipIf(!FF)("export integration — overlay burn-in after concat", () => {
  it("keeps duration and embeds a logo without breaking concat", () => {
    const dir = mkdtempSync(join(tmpdir(), "hs-ov-"));
    ff(["-f", "lavfi", "-i", "color=c=black:s=640x360:d=2",
      "-f", "lavfi", "-i", "sine=frequency=440:duration=2",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", join(dir, "src.mp4")]);
    ff(["-f", "lavfi", "-i", "color=c=red:s=120x60:d=1", "-frames:v", "1", join(dir, "logo.png")]);

    const media: MediaAsset[] = [{ id: "a", name: "a.mp4", kind: "video", duration: 2, file: { name: "a.mp4" } as File, url: "" }];
    const clips: Clip[] = [{ id: "c1", sourceId: "a", start: 0, end: 2 }];
    const base = buildConcatGraph(clips, media, { w: 640, h: 360, fps: 30 });
    const g = appendOverlayBurns(base, [{
      filename: "logo.png", start: 0.2, end: 1.8, x: 320, y: 180, w: 120, h: 60, rotation: 0, opacity: 1,
    }], 2);

    for (const w of g.writes) {
      if (w.filename.endsWith(".png")) copyFileSync(join(dir, "logo.png"), join(dir, w.filename));
      else copyFileSync(join(dir, "src.mp4"), join(dir, w.filename));
    }

    ff(toExecArgs(g, "out.mp4"), dir);
    const out = join(dir, "out.mp4");
    expect(Math.abs(fmtDur(out) - 2)).toBeLessThan(0.1);

    // sample a mid frame — burned-in red logo should produce a non-trivial PNG
    const frame = join(dir, "frame.png");
    ff(["-ss", "1.0", "-i", out, "-frames:v", "1", frame]);
    expect(statSync(frame).size).toBeGreaterThan(500);
  });
});
