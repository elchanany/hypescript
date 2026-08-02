// Pure builder for the export/render FFmpeg command.
// One continuous filter_graph: per-segment trim/atrim + PTS reset + CFR/timebase/
// format/samplerate/channel normalization + aresample(async) + a SINGLE concat +
// ONE H.264/AAC encode + faststart. No per-clip encode, no concat demuxer, no -c copy.
//
// This is engine-agnostic: the exact same filter string runs on ffmpeg.wasm today
// and on native FFmpeg (LocalNativeRenderBackend) later — so the join fix is shared.

import { Clip, MediaAsset, clipDur, clipEnabled, clipVolume, mediaById } from "@/lib/editor/model";

export interface RenderTarget { w: number; h: number; fps: number; }
export const DEFAULT_TARGET: RenderTarget = { w: 1280, h: 720, fps: 30 };
export interface RenderGraphOpts { audioMuted?: boolean; }

export interface RenderGraph {
  segmentCount: number;
  writes: { assetId: string; filename: string }[]; // real source files to place on the FS
  inputArgs: string[];                               // -i / lavfi inputs, in index order
  filterComplex: string;                             // the single graph
  encodeArgs: string[];                              // from -map onward (excludes output name)
}

const SR = 44100; // uniform sample rate
const ext = (name?: string) => ((name || "").toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "mp4");

// Per-segment video chain: cut -> reset PTS -> CFR fps -> fit target -> pixfmt ->
// force EXACTLY `frames` frames (kills the extra boundary frame the fps resampler emits
// on non-frame-aligned cuts) -> re-zero PTS -> timebase.
function vChain(w: number, h: number, fps: number, frames: number): string {
  return `setpts=PTS-STARTPTS,fps=${fps},scale=${w}:${h}:force_original_aspect_ratio=decrease,`
    + `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p,`
    + `trim=end_frame=${frames},setpts=PTS-STARTPTS,settb=1/${fps}`;
}
// Per-segment audio chain: cut -> reset PTS -> async resample (fills/aligns timestamps
// across VFR sources so concat never pads) -> uniform rate/layout -> gain -> timebase.
function aChain(volume: number): string {
  return `asetpts=PTS-STARTPTS,aresample=async=1:first_pts=0,`
    + `aformat=sample_rates=${SR}:channel_layouts=stereo,volume=${volume.toFixed(3)},asettb=1/${SR}`;
}

export function usableClips(clips: Clip[], media: MediaAsset[]): Clip[] {
  return clips.filter((c) => {
    if (!clipEnabled(c)) return false;
    const k = mediaById(media, c.sourceId)?.kind;
    return k === "video" || k === "image";
  });
}

export function buildConcatGraph(
  clips: Clip[],
  media: MediaAsset[],
  target: RenderTarget = DEFAULT_TARGET,
  opts: RenderGraphOpts = {},
): RenderGraph {
  const usable = usableClips(clips, media);
  if (!usable.length) throw new Error("אין קליפי וידאו/תמונה לרינדור.");

  const { w, h, fps } = target;
  const muteGain = opts.audioMuted ? 0 : 1;

  const writes: { assetId: string; filename: string }[] = [];
  const videoInputIdx = new Map<string, number>(); // reuse one -i per video source
  const inputArgs: string[] = [];
  const parts: string[] = [];
  const labels: string[] = [];
  let ic = 0;

  const writeOnce = (asset: MediaAsset) => {
    const fn = `m${writes.length}.${ext(asset.file?.name)}`;
    writes.push({ assetId: asset.id, filename: fn });
    return fn;
  };

  usable.forEach((c, n) => {
    const asset = mediaById(media, c.sourceId)!;
    // Snap the trim window to a whole number of frames so each segment's video and
    // audio are exactly the same length -> concat has nothing to pad (no duplicate
    // frames / injected silence at joins). Measured: removes the ~0.2 frame/join drift.
    const frames = Math.max(1, Math.round((c.end - c.start) * fps));
    const s = c.start.toFixed(3), e = (c.start + frames / fps).toFixed(3); // snap end to whole frames
    if (asset.kind === "video") {
      let idx = videoInputIdx.get(asset.id);
      if (idx === undefined) { const fn = writeOnce(asset); idx = ic++; inputArgs.push("-i", fn); videoInputIdx.set(asset.id, idx); }
      const vol = clipVolume(c) * muteGain;
      parts.push(
        `[${idx}:v]trim=start=${s}:end=${e},${vChain(w, h, fps, frames)}[v${n}];`
        + `[${idx}:a]atrim=start=${s}:end=${e},${aChain(vol)}[a${n}];`,
      );
    } else {
      // still image -> looped video for exactly `frames` frames + matching silent audio
      const fn = writeOnce(asset);
      const imgFrames = Math.max(1, Math.round(clipDur(c) * fps));
      const dur = (imgFrames / fps).toFixed(3);
      const vin = ic++; inputArgs.push("-loop", "1", "-t", dur, "-i", fn);
      const ain = ic++; inputArgs.push("-f", "lavfi", "-t", dur, "-i", `anullsrc=channel_layout=stereo:sample_rate=${SR}`);
      parts.push(`[${vin}:v]${vChain(w, h, fps, imgFrames)}[v${n}];[${ain}:a]${aChain(muteGain)}[a${n}];`);
    }
    labels.push(`[v${n}][a${n}]`);
  });

  const filterComplex = parts.join("") + `${labels.join("")}concat=n=${usable.length}:v=1:a=1[outv][outa]`;

  const encodeArgs = [
    "-map", "[outv]", "-map", "[outa]",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-r", String(fps),
    "-c:a", "aac", "-b:a", "192k", "-ar", String(SR), "-ac", "2",
    "-movflags", "+faststart",
  ];

  return { segmentCount: usable.length, writes, inputArgs, filterComplex, encodeArgs };
}

export function toExecArgs(g: RenderGraph, outName: string): string[] {
  return [...g.inputArgs, "-filter_complex", g.filterComplex, ...g.encodeArgs, outName];
}
