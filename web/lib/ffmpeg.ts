// עטיפה ל-ffmpeg.wasm — כל עיבוד הווידאו קורה בדפדפן, מקומית.
// תומך בכמה מקורות: מרנדר EDL שמורכב מקליפים מכמה סרטונים.

"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { Clip, MediaAsset, mediaById, uid } from "./editor/model";
import { Overlay } from "./editor/overlay";
import { CanvasSize } from "./editor/canvasCoords";
import { buildConcatGraph, RenderTarget, DEFAULT_TARGET, toExecArgs } from "./render/graph";
import { appendOverlayBurns } from "./render/overlayBurn";
import { materializeOverlays } from "./render/materializeOverlays";

export type { RenderTarget } from "./render/graph";

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

function extOf(name?: string): string {
  const m = (name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "mp4";
}

// ffmpeg.wasm הוא מופע יחיד עם מערכת-קבצים אחת — אסור להריץ שתי פעולות במקביל
// (הסוכן קורא לכלים במקביל -> "FS error"). תור שמסדר את כל פעולות ה-ffmpeg.
let ffQueue: Promise<unknown> = Promise.resolve();
function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const result = ffQueue.then(fn, fn);
  ffQueue = result.catch(() => {});
  return result;
}

// מחלץ אודיו mono דחוס לתמלול. מחזיר Blob קטן.
export async function extractAudio(file: File, onProgress?: (r: number) => void): Promise<Blob> {
  return runExclusive(async () => {
    const ff = await getFFmpeg();
    const input = `in_${uid()}.${extOf(file.name)}`;
    const out = `au_${uid()}.mp3`;
    await ff.writeFile(input, await fetchFile(file));
    if (onProgress) ff.on("progress", ({ progress }) => onProgress(progress));
    await ff.exec(["-i", input, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k", out]);
    const data = (await ff.readFile(out)) as Uint8Array;
    await ff.deleteFile(out).catch(() => {});
    await ff.deleteFile(input).catch(() => {});
    return new Blob([data as unknown as BlobPart], { type: "audio/mpeg" });
  });
}

// מחלץ פריים בודד בשנייה נתונה (seek מהיר). מחזיר PNG.
export async function extractFrame(file: File, atSeconds: number): Promise<Blob> {
  return runExclusive(async () => {
    const ff = await getFFmpeg();
    const input = `fi_${uid()}.${extOf(file.name)}`;
    const out = `fo_${uid()}.png`;
    await ff.writeFile(input, await fetchFile(file));
    await ff.exec(["-ss", Math.max(0, atSeconds).toFixed(3), "-i", input, "-frames:v", "1", "-q:v", "3", out]);
    const data = (await ff.readFile(out)) as Uint8Array;
    await ff.deleteFile(out).catch(() => {});
    await ff.deleteFile(input).catch(() => {});
    return new Blob([data as unknown as BlobPart], { type: "image/png" });
  });
}

// עוצר ומאפס את מנוע ה-ffmpeg (לביטול Job אמיתי). הקריאה הבאה תטען מחדש.
export function terminateFFmpeg() {
  try { ffmpeg?.terminate(); } catch { /* noop */ }
  ffmpeg = null; loadPromise = null;
}

// מרנדר EDL רב-מקורי דרך גרף-סינון יחיד (ראה lib/render/graph.ts):
// אין קידוד לכל קליפ בנפרד ואין concat demuxer — Stream רציף אחד, קידוד יחיד.
export interface RenderOpts {
  audioMuted?: boolean;
  signal?: AbortSignal;
  overlays?: Overlay[];
  canvas?: CanvasSize;
}

export async function renderEDL(
  media: MediaAsset[],
  clips: Clip[],
  onProgress?: (r: number) => void,
  target: RenderTarget = DEFAULT_TARGET,
  opts: RenderOpts = {},
): Promise<Blob> {
  return runExclusive(async () => {
    if (opts.signal?.aborted) throw new Error("בוטל");
    const ff = await getFFmpeg();
    const base = buildConcatGraph(clips, media, target, { audioMuted: opts.audioMuted });
    // Burn-in overlays AFTER the verified concat (identity when empty).
    const mats = (opts.overlays?.length && opts.canvas)
      ? await materializeOverlays(opts.overlays, media, opts.canvas, target)
      : [];
    const totalDur = clips.reduce((s, c) => s + Math.max(0, c.end - c.start), 0);
    const graph = appendOverlayBurns(base, mats.map((m) => m.spec), totalDur);
    const matByFile = new Map(mats.map((m) => [m.spec.filename, m]));

    // כותבים כל קובץ-מקור / שכבה בשימוש ל-FS של ffmpeg.
    for (const wsr of graph.writes) {
      const mat = matByFile.get(wsr.filename);
      if (mat?.bytes) {
        await ff.writeFile(wsr.filename, mat.bytes);
      } else {
        const assetId = mat?.assetId || wsr.assetId;
        const asset = mediaById(media, assetId);
        if (!asset) throw new Error(`חסר מקור לרינדור: ${assetId}`);
        await ff.writeFile(wsr.filename, await fetchFile(asset.file));
      }
    }

    // ביטול אמיתי: terminate מפיל את ה-exec הנוכחי -> ה-Promise נדחה.
    let onAbort: (() => void) | undefined;
    if (opts.signal) { onAbort = () => terminateFFmpeg(); opts.signal.addEventListener("abort", onAbort, { once: true }); }
    if (onProgress) ff.on("progress", ({ progress }) => onProgress(progress));

    try {
      await ff.exec(toExecArgs(graph, "out.mp4"));
      const data = (await ff.readFile("out.mp4")) as Uint8Array;
      await ff.deleteFile("out.mp4").catch(() => {});
      return new Blob([data as unknown as BlobPart], { type: "video/mp4" });
    } catch (e) {
      if (opts.signal?.aborted) throw new Error("בוטל");
      throw e;
    } finally {
      if (opts.signal && onAbort) opts.signal.removeEventListener("abort", onAbort);
    }
  });
}
