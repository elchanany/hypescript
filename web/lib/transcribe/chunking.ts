// Client-side chunking for long-audio transcription (parity with local/hypescript).
// Pure planning/merge helpers are unit-tested; FFmpeg extraction lives in ffmpeg.ts.

import { Word } from "@/lib/models";

/** Match local default (~20 min) — keeps each upload small for cloud STT limits. */
export const DEFAULT_CHUNK_SEC = 1200;

export function planChunkOffsets(durationSec: number, chunkSec = DEFAULT_CHUNK_SEC): number[] {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return [0];
  const size = Number.isFinite(chunkSec) && chunkSec > 0 ? chunkSec : DEFAULT_CHUNK_SEC;
  if (durationSec <= size) return [0];
  const n = Math.ceil(durationSec / size);
  return Array.from({ length: n }, (_, i) => i * size);
}

export function shiftWords(words: Word[], offsetSec: number): Word[] {
  if (!offsetSec) return words.slice();
  return words.map((w) => ({
    ...w,
    start: w.start + offsetSec,
    end: w.end + offsetSec,
  }));
}

export function mergeWordChunks(parts: Word[][]): Word[] {
  const out: Word[] = [];
  for (const part of parts) {
    for (const w of part) out.push(w);
  }
  return out;
}

/** Normalize provider word payloads into Word[]. */
export function wordsFromProviderPayload(data: { words?: any[] } | null | undefined): Word[] {
  const raw = data?.words || [];
  return raw
    .filter((w: any) => w && w.start != null && w.end != null && (w.word || w.text))
    .map((w: any) => {
      const text = String(w.word || w.text).trim();
      const out: Word = { text, start: +w.start, end: +w.end };
      const type = w.type as Word["type"] | undefined;
      if (type === "word" || type === "spacing" || type === "audio_event") out.type = type;
      else if (/^\[[^\]]+\]$/.test(text)) out.type = "audio_event";
      if (w.speaker_id) out.speakerId = String(w.speaker_id);
      return out;
    });
}
