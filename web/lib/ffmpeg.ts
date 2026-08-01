// עטיפה ל-ffmpeg.wasm — כל עיבוד הווידאו קורה בדפדפן, מקומית.
// תומך בכמה מקורות: מרנדר EDL שמורכב מקליפים מכמה סרטונים.

"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { Clip, MediaAsset, clipDur, mediaById } from "./editor/model";

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

export type LogFn = (msg: string) => void;

export async function getFFmpeg(onLog?: LogFn): Promise<FFmpeg> {
  if (ffmpeg && (ffmpeg as any).loaded) return ffmpeg;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const inst = new FFmpeg();
    if (onLog) inst.on("log", ({ message }) => onLog(message));
    await inst.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpeg = inst;
    return inst;
  })();
  return loadPromise;
}

function extOf(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "mp4";
}

// מחלץ אודיו mono דחוס לתמלול. מחזיר Blob קטן.
export async function extractAudio(file: File, onProgress?: (r: number) => void): Promise<Blob> {
  const ff = await getFFmpeg();
  const ext = extOf(file.name);
  const input = `in.${ext}`;
  await ff.writeFile(input, await fetchFile(file));
  if (onProgress) ff.on("progress", ({ progress }) => onProgress(progress));
  await ff.exec(["-i", input, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k", "audio.mp3"]);
  const data = (await ff.readFile("audio.mp3")) as Uint8Array;
  await ff.deleteFile("audio.mp3").catch(() => {});
  return new Blob([data as unknown as BlobPart], { type: "audio/mpeg" });
}

export interface RenderTarget { w: number; h: number; fps: number; }
const DEFAULT_TARGET: RenderTarget = { w: 1280, h: 720, fps: 30 };

// מרנדר EDL רב-מקורי: כל קליפ נחתך מהמקור שלו, מנורמל ל-target, ומשורשר בסדר.
// כרגע נתמכים קליפי וידאו (כמה סרטונים). תמונות/שמע כשכבה — פאזה הבאה.
export async function renderEDL(
  media: MediaAsset[],
  clips: Clip[],
  onProgress?: (r: number) => void,
  target: RenderTarget = DEFAULT_TARGET,
): Promise<Blob> {
  const ff = await getFFmpeg();
  const videoClips = clips.filter((c) => mediaById(media, c.sourceId)?.kind === "video");
  if (!videoClips.length) throw new Error("אין קליפי וידאו לרינדור (תמונה/שמע יתווספו בהמשך).");

  // כותבים כל מקור-וידאו בשימוש פעם אחת, וממפים sourceId -> אינדקס קלט.
  const usedIds = Array.from(new Set(videoClips.map((c) => c.sourceId)));
  const inputArgs: string[] = [];
  const inputIndex = new Map<string, number>();
  for (let i = 0; i < usedIds.length; i++) {
    const asset = mediaById(media, usedIds[i])!;
    const name = `src${i}.${extOf(asset.file.name)}`;
    await ff.writeFile(name, await fetchFile(asset.file));
    inputArgs.push("-i", name);
    inputIndex.set(usedIds[i], i);
  }

  const { w, h, fps } = target;
  const parts: string[] = [];
  const labels: string[] = [];
  videoClips.forEach((c, i) => {
    const idx = inputIndex.get(c.sourceId)!;
    parts.push(
      `[${idx}:v]trim=start=${c.start.toFixed(3)}:end=${c.end.toFixed(3)},setpts=PTS-STARTPTS,` +
        `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,` +
        `setsar=1,fps=${fps},format=yuv420p[v${i}];` +
        `[${idx}:a]atrim=start=${c.start.toFixed(3)}:end=${c.end.toFixed(3)},asetpts=PTS-STARTPTS,` +
        `aformat=sample_rates=44100:channel_layouts=stereo[a${i}];`,
    );
    labels.push(`[v${i}][a${i}]`);
  });
  const filter = parts.join("") + `${labels.join("")}concat=n=${videoClips.length}:v=1:a=1[outv][outa]`;

  if (onProgress) ff.on("progress", ({ progress }) => onProgress(progress));
  await ff.exec([
    ...inputArgs,
    "-filter_complex", filter,
    "-map", "[outv]", "-map", "[outa]",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k",
    "out.mp4",
  ]);
  const data = (await ff.readFile("out.mp4")) as Uint8Array;
  await ff.deleteFile("out.mp4").catch(() => {});
  return new Blob([data as unknown as BlobPart], { type: "video/mp4" });
}
