"use client";

// Real audio waveform peaks — decoded once per source via Web Audio decodeAudioData
// (NO ffmpeg.wasm, so it never touches the render queue or risks the old FS hang).
// Peaks span the whole source [0, duration]; the Waveform component slices to a clip's
// [sourceIn, sourceOut]. Cached by content fingerprint, outside React/History.

export const WAVE_BUCKETS = 2400;

export interface WaveformData { peaks: Float32Array; duration: number; }

// Pure: max |sample| per bucket, normalized to the loudest bucket. Unit-tested.
export function computePeaks(data: Float32Array, buckets: number): Float32Array {
  const out = new Float32Array(buckets);
  const n = data.length;
  if (n === 0 || buckets <= 0) return out;
  const step = n / buckets;
  let max = 1e-6;
  for (let b = 0; b < buckets; b++) {
    const start = Math.floor(b * step);
    const end = Math.min(n, Math.floor((b + 1) * step));
    let peak = 0;
    for (let i = start; i < end; i++) { const v = data[i] < 0 ? -data[i] : data[i]; if (v > peak) peak = v; }
    out[b] = peak;
    if (peak > max) max = peak;
  }
  for (let b = 0; b < buckets; b++) out[b] /= max;
  return out;
}

// Pure: map a source-time window to a [startBucket, endBucket] slice. Unit-tested.
export function bucketRange(sourceIn: number, sourceOut: number, duration: number, buckets: number): [number, number] {
  if (duration <= 0) return [0, buckets];
  const a = Math.max(0, Math.min(buckets, Math.floor((sourceIn / duration) * buckets)));
  const b = Math.max(a + 1, Math.min(buckets, Math.ceil((sourceOut / duration) * buckets)));
  return [a, b];
}

const fp = (file: File) => `${file.name}_${file.size}_${(file as any).lastModified || 0}`;
const cache = new Map<string, WaveformData>();
const inflight = new Map<string, Promise<WaveformData>>();

export async function getWaveform(file: File, buckets = WAVE_BUCKETS): Promise<WaveformData> {
  const key = `${fp(file)}#${buckets}`;
  const hit = cache.get(key); if (hit) return hit;
  const running = inflight.get(key); if (running) return running;
  const job = (async () => {
    const AC: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    try {
      const buf = await file.arrayBuffer();
      const audio = await ctx.decodeAudioData(buf.slice(0));
      // peak across channels (mixdown) so stereo/mono both look right
      const chans = Math.min(2, audio.numberOfChannels);
      let mixed = audio.getChannelData(0);
      if (chans > 1) {
        const c1 = audio.getChannelData(1);
        const m = new Float32Array(mixed.length);
        for (let i = 0; i < m.length; i++) m[i] = (mixed[i] + c1[i]) * 0.5;
        mixed = m;
      }
      const data: WaveformData = { peaks: computePeaks(mixed, buckets), duration: audio.duration };
      cache.set(key, data);
      return data;
    } finally { ctx.close?.().catch?.(() => {}); }
  })();
  inflight.set(key, job);
  try { return await job; } finally { inflight.delete(key); }
}
