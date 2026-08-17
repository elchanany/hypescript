// עטיפה ל-ffmpeg.wasm — כל עיבוד הווידאו קורה בדפדפן, מקומית.
// תומך בכמה מקורות: מרנדר EDL שמורכב מקליפים מכמה סרטונים.

"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { Clip, MediaAsset, clipDur, clipEnabled, mediaById, uid } from "./editor/model";
import { isGapClip } from "./editor/timelineOps";
import { Overlay } from "./editor/overlay";
import { CanvasSize } from "./editor/canvasCoords";
import { buildConcatGraph, RenderTarget, DEFAULT_TARGET, toExecArgs } from "./render/graph";
import { appendOverlayBurns } from "./render/overlayBurn";
import { materializeOverlays } from "./render/materializeOverlays";
import { materializeCaptions } from "./render/captionBurn";
import { Sub } from "./editor/subtitlesEdl";
import { CaptionStyle } from "./editor/captionStyle";
import { microSeekAt, type MicroEdl } from "./render/timelineFrame";

export type { RenderTarget } from "./render/graph";

const CORE_BASE = "/ffmpeg";

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

export type LogFn = (msg: string) => void;

async function localCoreBlobUrl(name: "ffmpeg-core.js" | "ffmpeg-core.wasm", type: string): Promise<string> {
  const url = `${CORE_BASE}/${name}`;
  let response: Response;
  try { response = await fetch(url, { cache: "force-cache" }); }
  catch (error: any) {
    throw new Error(`מנוע הייצוא המקומי לא נטען (${name}): ${error?.message || "בקשת הקובץ נכשלה"}. הפעל מחדש את שרת האפליקציה.`);
  }
  if (!response.ok) throw new Error(`מנוע הייצוא המקומי חסר (${name}, HTTP ${response.status}). הרץ npm install והפעל מחדש את האפליקציה.`);
  return URL.createObjectURL(new Blob([await response.arrayBuffer()], { type }));
}

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
        coreURL: await localCoreBlobUrl("ffmpeg-core.js", "text/javascript"),
        wasmURL: await localCoreBlobUrl("ffmpeg-core.wasm", "application/wasm"),
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

/** Extract a time-slice of mono mp3 for chunked cloud transcription. */
export async function extractAudioSegment(
  file: File,
  startSec: number,
  durationSec: number,
  onProgress?: (r: number) => void,
): Promise<Blob> {
  return runExclusive(async () => {
    const ff = await getFFmpeg();
    const input = `in_${uid()}.${extOf(file.name)}`;
    const out = `au_${uid()}.mp3`;
    await ff.writeFile(input, await fetchFile(file));
    if (onProgress) ff.on("progress", ({ progress }) => onProgress(progress));
    const ss = Math.max(0, startSec);
    const t = Math.max(0.1, durationSec);
    await ff.exec([
      "-ss", ss.toFixed(3), "-t", t.toFixed(3),
      "-i", input, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k", out,
    ]);
    const data = (await ff.readFile(out)) as Uint8Array;
    await ff.deleteFile(out).catch(() => {});
    await ff.deleteFile(input).catch(() => {});
    return new Blob([data as unknown as BlobPart], { type: "audio/mpeg" });
  });
}

/**
 * Plan + extract audio chunks for long files (local parity).
 * חילוץ יעיל ומהיר: חילוץ פס-קול פעם אחת בלבד מהווידאו, ואם נדרש חיתוך
 * חותכים את קובץ ה-MP3 הקל עצמו — בלי לקרוא שוב ושוב את קובץ הווידאו הכבד.
 */
export async function extractAudioChunks(
  file: File,
  mediaDurationSec: number,
  opts?: {
    chunkSec?: number;
    onProgress?: (r: number) => void;
    onChunk?: (i: number, n: number) => void;
  },
): Promise<{ blob: Blob; offset: number }[]> {
  const { planChunkOffsets, DEFAULT_CHUNK_SEC, MAX_UPLOAD_BYTES, AUDIO_BYTES_PER_SEC } =
    await import("@/lib/transcribe/chunking");

  // שלב 1: חילוץ פס-קול מלא פעם אחת בלבד מהווידאו (1-2 שניות)
  opts?.onChunk?.(0, 1);
  const fullAudioBlob = await extractAudio(file, opts?.onProgress);

  const chunkSec = opts?.chunkSec ?? DEFAULT_CHUNK_SEC;
  const audioDuration = mediaDurationSec > 0 ? mediaDurationSec : (fullAudioBlob.size / AUDIO_BYTES_PER_SEC);
  const offsets = planChunkOffsets(audioDuration, chunkSec);

  // אם האודיו קטן מ-4.5MB ובקטע בודד — מחזירים מיד
  if (offsets.length <= 1 && fullAudioBlob.size <= MAX_UPLOAD_BYTES) {
    return [{ blob: fullAudioBlob, offset: 0 }];
  }

  // שלב 2: אם נדרש חיתוך למקטעים, חותכים את קובץ ה-MP3 הקטן (באלפיות שניה)
  return runExclusive(async () => {
    const ff = await getFFmpeg();
    const inputAudio = `full_au_${uid()}.mp3`;
    await ff.writeFile(inputAudio, new Uint8Array(await fullAudioBlob.arrayBuffer()));

    const out: { blob: Blob; offset: number }[] = [];
    const step = offsets.length > 1 ? offsets[1] - offsets[0] : chunkSec;

    for (let i = 0; i < offsets.length; i++) {
      opts?.onChunk?.(i, offsets.length);
      const start = offsets[i];
      const dur = Math.min(step, Math.max(0.1, audioDuration - start));
      const chunkFile = `chk_${uid()}.mp3`;

      await ff.exec([
        "-ss", start.toFixed(3),
        "-i", inputAudio,
        "-t", dur.toFixed(3),
        "-c", "copy",
        chunkFile,
      ]);

      const data = (await ff.readFile(chunkFile)) as Uint8Array;
      await ff.deleteFile(chunkFile).catch(() => {});
      out.push({
        blob: new Blob([data as unknown as BlobPart], { type: "audio/mpeg" }),
        offset: start,
      });
    }

    await ff.deleteFile(inputAudio).catch(() => {});
    return out;
  });
}

/**
 * בונה אודיו זמני (mono 16kHz mp3) לפי ה-EDL הערוך — לתמלול מחדש על הציר הסופי.
 * רווחים → שקט; קליפים מושבתים מדולגים.
 */
export async function extractAssembledAudio(
  media: MediaAsset[],
  clips: Clip[],
  onProgress?: (r: number) => void,
): Promise<{ blob: Blob; durationSec: number }> {
  return runExclusive(async () => {
    const active = clips.filter((c) => clipEnabled(c) && clipDur(c) > 0.05);
    if (!active.length) throw new Error("אין קליפים פעילים לבניית אודיו ערוך.");

    const ff = await getFFmpeg();
    if (onProgress) ff.on("progress", ({ progress }) => onProgress(progress));

    const written = new Map<string, string>(); // assetId → filename
    const inputIndex = new Map<string, number>(); // assetId → -i index
    const inputArgs: string[] = [];
    const filterParts: string[] = [];
    const labels: string[] = [];
    let nextInput = 0;
    let lavfiIdx = -1;
    let durationSec = 0;

    const ensureAssetInput = async (asset: MediaAsset): Promise<number> => {
      const existing = inputIndex.get(asset.id);
      if (existing != null) return existing;
      const fn = `asm_${written.size}.${extOf(asset.file.name)}`;
      await ff.writeFile(fn, await fetchFile(asset.file));
      const idx = nextInput++;
      inputArgs.push("-i", fn);
      written.set(asset.id, fn);
      inputIndex.set(asset.id, idx);
      return idx;
    };

    const ensureSilence = (): number => {
      if (lavfiIdx >= 0) return lavfiIdx;
      lavfiIdx = nextInput++;
      inputArgs.push("-f", "lavfi", "-i", "anullsrc=r=16000:cl=mono");
      return lavfiIdx;
    };

    for (let i = 0; i < active.length; i++) {
      const c = active[i];
      const dur = clipDur(c);
      durationSec += dur;
      const lab = `a${i}`;
      const asset = isGapClip(c) ? undefined : mediaById(media, c.sourceId);
      const needsSilence = isGapClip(c) || !asset || (asset.kind !== "video" && asset.kind !== "audio");

      if (needsSilence) {
        const idx = ensureSilence();
        filterParts.push(
          `[${idx}:a]atrim=0:${dur.toFixed(3)},asetpts=PTS-STARTPTS,aformat=sample_rates=16000:channel_layouts=mono[${lab}]`,
        );
      } else {
        const idx = await ensureAssetInput(asset!);
        filterParts.push(
          `[${idx}:a]atrim=${c.start.toFixed(3)}:${c.end.toFixed(3)},asetpts=PTS-STARTPTS,aformat=sample_rates=16000:channel_layouts=mono[${lab}]`,
        );
      }
      labels.push(`[${lab}]`);
    }

    const out = `asm_out_${uid()}.mp3`;
    const filter = `${filterParts.join(";")};${labels.join("")}concat=n=${active.length}:v=0:a=1[outa]`;
    await ff.exec([
      ...inputArgs,
      "-filter_complex", filter,
      "-map", "[outa]",
      "-ac", "1", "-ar", "16000", "-b:a", "48k",
      out,
    ]);
    const data = (await ff.readFile(out)) as Uint8Array;
    await ff.deleteFile(out).catch(() => {});
    for (const fn of written.values()) await ff.deleteFile(fn).catch(() => {});
    return { blob: new Blob([data as unknown as BlobPart], { type: "audio/mpeg" }), durationSec };
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
  audioClips?: Clip[];
  signal?: AbortSignal;
  overlays?: Overlay[];
  canvas?: CanvasSize;
  /** When set with canvas, burn styled captions into the export. */
  subs?: Sub[] | null;
  captionStyle?: CaptionStyle | null;
  burnCaptions?: boolean;
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
    const base = buildConcatGraph(clips, media, target, { audioMuted: opts.audioMuted, audioClips: opts.audioClips });
    // Burn-in overlays AFTER the verified concat (identity when empty).
    const mats = (opts.overlays?.length && opts.canvas)
      ? await materializeOverlays(opts.overlays, media, opts.canvas, target)
      : [];
    const capMats = (opts.burnCaptions !== false && opts.subs?.length && opts.canvas)
      ? await materializeCaptions(opts.subs, opts.captionStyle, opts.canvas, target)
      : [];
    const allMats = [...mats, ...capMats];
    const totalDur = clips.reduce((s, c) => s + Math.max(0, c.end - c.start), 0);
    const graph = appendOverlayBurns(base, allMats.map((m) => m.spec), totalDur);
    const matByFile = new Map(allMats.map((m) => [m.spec.filename, m]));

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

export interface TimelineFrameRequest {
  media: MediaAsset[];
  micro: MicroEdl;
  canvas: CanvasSize;
  captionStyle?: CaptionStyle | null;
}

/**
 * Render ONE composited timeline frame through the exact export path (renderEDL with
 * overlay/caption burn-in) and extract a PNG from the result — so the screenshot shows
 * what the edited output actually looks like at that assembled timestamp (base/cutaway/
 * gap, clip opacity/fades, active overlays and active styled captions).
 *
 * renderEDL and extractFrame each serialize through runExclusive; they are awaited
 * SEQUENTIALLY here and never nested.
 */
export async function renderTimelineFrame(req: TimelineFrameRequest): Promise<Blob> {
  const { media, micro, canvas, captionStyle } = req;
  const mp4 = await renderEDL(media, micro.segments, undefined, undefined, {
    audioMuted: true,
    overlays: micro.overlays,
    canvas,
    subs: micro.subs,
    captionStyle: captionStyle ?? null,
    burnCaptions: true,
  });
  const file = new File([mp4], "micro.mp4", { type: "video/mp4" });
  // The micro render is frame-quantized and can be a hair shorter than microDuration —
  // seek strictly inside the clip (proportional capped margin) so extraction always hits a frame.
  return extractFrame(file, microSeekAt(micro.captureAt, micro.microDuration));
}
