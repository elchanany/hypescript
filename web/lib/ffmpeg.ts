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

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${label} נתקע (timeout ${ms / 1000}s)`)), ms)),
  ]);
}

export async function getFFmpeg(onLog?: LogFn): Promise<FFmpeg> {
  if (ffmpeg && (ffmpeg as any).loaded) return ffmpeg;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const inst = new FFmpeg();
    if (onLog) inst.on("log", ({ message }) => onLog(message));
    // ליבה חד-תהליכית — יציבה. עם timeout כדי שלא ייתקע לנצח אם הטעינה נכשלת.
    await withTimeout(
      inst.load({
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
      }),
      90000,
      "טעינת מנוע העיבוד",
    ).catch((e) => { loadPromise = null; throw e; });
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
  const usable = clips.filter((c) => {
    const k = mediaById(media, c.sourceId)?.kind;
    return k === "video" || k === "image";
  });
  if (!usable.length) throw new Error("אין קליפי וידאו/תמונה לרינדור.");

  // כותבים כל קובץ-מקור בשימוש פעם אחת ל-FS של ffmpeg.
  const written = new Map<string, string>();
  const ensureFile = async (asset: MediaAsset) => {
    if (written.has(asset.id)) return written.get(asset.id)!;
    const nm = `m${written.size}.${extOf(asset.file.name)}`;
    await ff.writeFile(nm, await fetchFile(asset.file));
    written.set(asset.id, nm);
    return nm;
  };

  const { w, h, fps } = target;
  const scalePad = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps},format=yuv420p`;
  const inputArgs: string[] = [];
  let ic = 0;
  const videoInput = new Map<string, number>(); // וידאו: input index לשימוש חוזר
  const parts: string[] = [];
  const labels: string[] = [];

  for (let n = 0; n < usable.length; n++) {
    const c = usable[n];
    const asset = mediaById(media, c.sourceId)!;
    if (asset.kind === "video") {
      let idx = videoInput.get(asset.id);
      if (idx === undefined) { const nm = await ensureFile(asset); idx = ic++; inputArgs.push("-i", nm); videoInput.set(asset.id, idx); }
      parts.push(
        `[${idx}:v]trim=start=${c.start.toFixed(3)}:end=${c.end.toFixed(3)},setpts=PTS-STARTPTS,${scalePad}[v${n}];` +
          `[${idx}:a]atrim=start=${c.start.toFixed(3)}:end=${c.end.toFixed(3)},asetpts=PTS-STARTPTS,aformat=sample_rates=44100:channel_layouts=stereo[a${n}];`,
      );
    } else {
      // תמונה: קלט לולאה בזמן הקליפ + אודיו שקט
      const nm = await ensureFile(asset);
      const dur = clipDur(c).toFixed(3);
      const vin = ic++; inputArgs.push("-loop", "1", "-t", dur, "-i", nm);
      const ain = ic++; inputArgs.push("-f", "lavfi", "-t", dur, "-i", "anullsrc=channel_layout=stereo:sample_rate=44100");
      parts.push(`[${vin}:v]${scalePad}[v${n}];[${ain}:a]aformat=sample_rates=44100:channel_layouts=stereo[a${n}];`);
    }
    labels.push(`[v${n}][a${n}]`);
  }
  const filter = parts.join("") + `${labels.join("")}concat=n=${usable.length}:v=1:a=1[outv][outa]`;

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
