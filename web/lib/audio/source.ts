// גשר הדפדפן אל מנתח האודיו: חילוץ דגימות מונו + מעטפת, עם מטמון.
//
// הפרדה מכוונת מ-features.ts: שם הכל טהור וניתן לבדיקה בלי דפדפן, כאן נמצא
// כל מה שתלוי ב-Web Audio וב-ffmpeg.wasm. הווידאו לא עוזב את המחשב.

"use client";

import { EnvelopeProfile, computeEnvelope } from "./features";

export interface AudioAnalysis {
  /** דגימות מונו — נדרשות לניתוח ספקטרלי (סיווג נשימה/שיעול/חבטה). */
  samples: Float32Array;
  sampleRate: number;
  envelope: EnvelopeProfile;
  durationSec: number;
}

// דגימות של שיעור בן עשר דקות ב-16kHz שוקלות ~38MB. שומרים מעט מאוד.
const MAX_CACHED = 2;
const cache = new Map<string, AudioAnalysis>();

function fingerprint(file: File): string {
  return `${file.name}_${file.size}_${(file as { lastModified?: number }).lastModified || 0}`;
}

function remember(key: string, analysis: AudioAnalysis): AudioAnalysis {
  cache.set(key, analysis);
  while (cache.size > MAX_CACHED) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
  return analysis;
}

/**
 * מחלץ אודיו מונו ומחשב מעטפת. `onPhase` מאפשר לדווח התקדמות לצ'אט,
 * כי החילוץ הוא השלב האיטי (ffmpeg.wasm), לא החישוב.
 */
export async function loadAudioAnalysis(
  file: File,
  onPhase?: (message: string) => void,
): Promise<AudioAnalysis> {
  const key = fingerprint(file);
  const hit = cache.get(key);
  if (hit) return hit;

  onPhase?.("מחלץ אודיו לניתוח גל-קול…");
  const { extractAudio } = await import("@/lib/ffmpeg");
  const blob = await extractAudio(file); // mono 16kHz
  const buffer = await blob.arrayBuffer();

  const Ctor: typeof AudioContext = (window as unknown as { AudioContext: typeof AudioContext }).AudioContext
    || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const context = new Ctor();
  let decoded: AudioBuffer;
  try {
    decoded = await context.decodeAudioData(buffer.slice(0));
  } finally {
    context.close().catch(() => {});
  }

  onPhase?.("מודד מעטפת אנרגיה…");
  const samples = decoded.getChannelData(0).slice();
  const envelope = computeEnvelope(samples, decoded.sampleRate);
  return remember(key, {
    samples,
    sampleRate: decoded.sampleRate,
    envelope,
    durationSec: decoded.duration,
  });
}

/** מחזיר ניתוח שכבר חושב, בלי לחשב מחדש. */
export function cachedAnalysis(file: File): AudioAnalysis | null {
  return cache.get(fingerprint(file)) ?? null;
}

export function clearAudioAnalysisCache(): void {
  cache.clear();
}
