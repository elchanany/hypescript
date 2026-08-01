// עטיפה ל-ffmpeg.wasm — כל עיבוד הווידאו קורה בתוך הדפדפן, מקומית.
// הווידאו לא נשלח לשום שרת; רק האודיו הדחוס נשלח לתמלול.

"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { KeepInterval } from "./models";

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

// מחלץ אודיו mono דחוס (mp3 48k) לתמלול. מחזיר Blob קטן.
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

// חותך את קטעי ה-keep ומרכיב מחדש (trim+concat, re-encode). מחזיר Blob של mp4.
export async function renderCut(
  file: File,
  keeps: KeepInterval[],
  onProgress?: (r: number) => void,
): Promise<Blob> {
  const ff = await getFFmpeg();
  const ext = extOf(file.name);
  const input = `in.${ext}`;
  // ודא שהקובץ קיים (אולי כבר נכתב ב-extractAudio, אבל לא מובטח).
  await ff.writeFile(input, await fetchFile(file));

  const parts: string[] = [];
  const labels: string[] = [];
  keeps.forEach((iv, i) => {
    parts.push(
      `[0:v]trim=start=${iv.start.toFixed(3)}:end=${iv.end.toFixed(3)},setpts=PTS-STARTPTS[v${i}];` +
        `[0:a]atrim=start=${iv.start.toFixed(3)}:end=${iv.end.toFixed(3)},asetpts=PTS-STARTPTS[a${i}];`,
    );
    labels.push(`[v${i}][a${i}]`);
  });
  const filter = parts.join("") + `${labels.join("")}concat=n=${keeps.length}:v=1:a=1[outv][outa]`;

  if (onProgress) ff.on("progress", ({ progress }) => onProgress(progress));
  await ff.exec([
    "-i", input,
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
