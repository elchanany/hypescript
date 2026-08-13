// Shared client transcription: chunk long audio, POST each piece, merge words.

import { Word } from "@/lib/models";
import {
  mergeWordChunks,
  shiftWords,
  wordsFromProviderPayload,
} from "./chunking";

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

export async function transcribeMediaFile(opts: TranscribeMediaOpts): Promise<Word[]> {
  const {
    file, durationSec,
    provider = "auto",
    model = "",
    language = "he",
    formExtras,
    signal,
    onPhase,
    onProgress,
  } = opts;

  const { extractAudioChunks } = await import("@/lib/ffmpeg");
  onPhase?.("מחלץ אודיו…");
  const chunks = await extractAudioChunks(file, durationSec, {
    onProgress,
    onChunk: (i, n) => {
      if (n > 1) onPhase?.(`מחלץ אודיו… חלק ${i + 1}/${n}`);
    },
  });

  const parts: Word[][] = [];
  for (let i = 0; i < chunks.length; i++) {
    const { blob, offset } = chunks[i];
    onPhase?.(chunks.length > 1 ? `מתמלל… חלק ${i + 1}/${chunks.length}` : "מתמלל…");
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
    const to = setTimeout(() => local.abort(), 180000);

    let data: any;
    try {
      const resp = await fetch("/api/transcribe", { method: "POST", body: fd, signal: local.signal });
      data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "התמלול נכשל.");
      if (resp.headers.get("X-Hypescript-Transcription-Quality") === "reduced") {
        onPhase?.("התמלול הושלם במנוע הגיבוי. האיכות עשויה להיות נמוכה יותר; Pro עם מכסה זמינה משתמש ב־ElevenLabs.");
      }
    } catch (e: any) {
      if (e?.name === "AbortError") {
        throw new Error(signal?.aborted ? "התמלול בוטל." : "התמלול נתקע (timeout). נסה שוב או קובץ קצר יותר.");
      }
      throw e;
    } finally {
      clearTimeout(to);
      if (signal) signal.removeEventListener("abort", onAbort);
    }
    parts.push(shiftWords(wordsFromProviderPayload(data), offset));
  }

  const merged = mergeWordChunks(parts);
  if (!merged.length) throw new Error("התמלול לא החזיר מילים.");
  return merged;
}
