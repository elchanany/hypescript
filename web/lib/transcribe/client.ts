// Shared client transcription: chunk long audio, POST each piece, merge words.
// Every network/ffmpeg stage has a timeout so the UI never spins forever.

import { Word } from "@/lib/models";
import {
  mergeWordChunks,
  shiftWords,
  wordsFromProviderPayload,
} from "./chunking";
import { serviceLabelFor, withTimeoutSignal } from "@/lib/agent/timeout";

export interface TranscribeMediaOpts {
  file: File;
  durationSec: number;
  provider?: string;
  model?: string;
  language?: string;
  formExtras?: Record<string, string>;
  signal?: AbortSignal;
  onPhase?: (msg: string) => void;
  onProgress?: (r: number) => void;
}

const EXTRACT_TIMEOUT_MS = 180_000;
const CHUNK_POST_TIMEOUT_MS = 180_000;

export async function transcribeMediaFile(opts: TranscribeMediaOpts): Promise<Word[]> {
  const {
    file, durationSec,
    provider = "groq",
    model = "whisper-large-v3",
    language = "he",
    formExtras,
    signal,
    onPhase,
    onProgress,
  } = opts;

  const service = serviceLabelFor(provider, model);
  if (signal?.aborted) throw new Error("התמלול בוטל.");

  const { extractAudioChunks } = await import("@/lib/ffmpeg");
  onPhase?.(`מחלץ אודיו (מקומי)… · ספק תמלול: ${service}`);
  let chunks: { blob: Blob; offset: number }[];
  try {
    chunks = await withTimeoutSignal(
      extractAudioChunks(file, durationSec, {
        onProgress,
        onChunk: (i, n) => {
          if (n > 1) onPhase?.(`מחלץ אודיו… חלק ${i + 1}/${n}`);
        },
      }),
      EXTRACT_TIMEOUT_MS,
      "חילוץ אודיו",
      signal,
      () => "ffmpeg.wasm — חילוץ אודיו מהסרטון",
    );
  } catch (e: any) {
    if (e?.message?.includes("בוטל")) throw e;
    throw new Error(e?.message || "חילוץ האודיו נכשל.");
  }

  const parts: Word[][] = [];
  for (let i = 0; i < chunks.length; i++) {
    if (signal?.aborted) throw new Error("התמלול בוטל.");
    const { blob, offset } = chunks[i];
    onPhase?.(
      chunks.length > 1
        ? `מתמלל ב-${service}… חלק ${i + 1}/${chunks.length}`
        : `מתמלל ב-${service}…`,
    );
    onProgress?.(0);

    const fd = new FormData();
    fd.append("file", blob, "audio.mp3");
    fd.append("provider", provider);
    fd.append("model", model);
    fd.append("language", language);
    if (formExtras) {
      for (const [k, v] of Object.entries(formExtras)) fd.append(k, v);
    }

    const local = new AbortController();
    const onAbort = () => local.abort();
    if (signal) {
      if (signal.aborted) throw new Error("התמלול בוטל.");
      signal.addEventListener("abort", onAbort, { once: true });
    }
    const to = setTimeout(() => local.abort(), CHUNK_POST_TIMEOUT_MS);

    let data: any;
    try {
      const resp = await fetch("/api/transcribe", { method: "POST", body: fd, signal: local.signal });
      data = await resp.json();
      if (!resp.ok) {
        const reason = data?.error || `HTTP ${resp.status}`;
        throw new Error(`תמלול ב-${service} נכשל: ${reason}`);
      }
    } catch (e: any) {
      if (e?.name === "AbortError") {
        throw new Error(
          signal?.aborted
            ? "התמלול בוטל."
            : `התמלול ב-${service} נתקע (timeout ${CHUNK_POST_TIMEOUT_MS / 1000}s על קריאת הספק). בדוק מפתח/רשת או נסה קובץ קצר יותר.`,
        );
      }
      throw e;
    } finally {
      clearTimeout(to);
      if (signal) signal.removeEventListener("abort", onAbort);
    }
    parts.push(shiftWords(wordsFromProviderPayload(data), offset));
  }

  const merged = mergeWordChunks(parts);
  if (!merged.length) throw new Error(`התמלול ב-${service} לא החזיר מילים.`);
  return merged;
}
