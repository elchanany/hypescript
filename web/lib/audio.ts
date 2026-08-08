// ניתוח עוצמת סאונד (RMS/dB) בדפדפן. זו ראיית אנרגיה מדודה בלבד;
// היא אינה מזהה סמנטית נשימה, שיעול, דיבור או סוג רעש.

"use client";

export interface EnergyProfile {
  hop: number; // אורך חלון בשניות
  db: Float32Array; // עוצמה ב-dBFS לכל חלון
  duration: number;
  floorDb: number; // רצפת רעש מוערכת
  peakDb: number;
}

const cache = new Map<string, EnergyProfile>();

function fp(file: File) {
  return `${file.name}_${file.size}_${(file as any).lastModified || 0}`;
}

export async function analyzeAudio(file: File): Promise<EnergyProfile> {
  const key = fp(file);
  const hit = cache.get(key);
  if (hit) return hit;

  const { extractAudio } = await import("./ffmpeg");
  const blob = await extractAudio(file); // mono 16kHz
  const arr = await blob.arrayBuffer();
  const AC: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx = new AC();
  const audio = await ctx.decodeAudioData(arr.slice(0));
  const data = audio.getChannelData(0);
  const sr = audio.sampleRate;
  const hop = 0.02;
  const win = Math.max(1, Math.floor(sr * hop));
  const n = Math.floor(data.length / win);
  const db = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < win; j++) { const v = data[i * win + j]; s += v * v; }
    db[i] = 20 * Math.log10(Math.sqrt(s / win) + 1e-9);
  }
  ctx.close().catch(() => {});

  // רצפת רעש = אחוזון 15; שיא = אחוזון 95.
  const sorted = Array.from(db).sort((a, b) => a - b);
  const floorDb = sorted[Math.floor(sorted.length * 0.15)] || -60;
  const peakDb = sorted[Math.floor(sorted.length * 0.95)] || -10;

  const profile: EnergyProfile = { hop, db, duration: audio.duration, floorDb, peakDb };
  cache.set(key, profile);
  return profile;
}

// עוצמה ממוצעת (dB) בטווח זמן.
export function avgDb(p: EnergyProfile, start: number, end: number): number {
  const a = Math.max(0, Math.floor(start / p.hop));
  const b = Math.min(p.db.length, Math.ceil(end / p.hop));
  if (b <= a) return p.floorDb;
  let s = 0;
  for (let i = a; i < b; i++) s += p.db[i];
  return s / (b - a);
}

// אזורים מתחת לסף עוצמה, באורך מינימלי (לא סיווג סמנטי של שקט/נשימה).
export function findSilences(p: EnergyProfile, thresholdDb: number, minLen: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let start = -1;
  for (let i = 0; i < p.db.length; i++) {
    const quiet = p.db[i] < thresholdDb;
    if (quiet && start < 0) start = i;
    else if (!quiet && start >= 0) {
      const s = start * p.hop, e = i * p.hop;
      if (e - s >= minLen) out.push([s, e]);
      start = -1;
    }
  }
  if (start >= 0) {
    const s = start * p.hop, e = p.db.length * p.hop;
    if (e - s >= minLen) out.push([s, e]);
  }
  return out;
}
