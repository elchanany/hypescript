"use client";

// Real filmstrip thumbnails — captured from a hidden <video> by seeking and drawing to a
// canvas (NO ffmpeg.wasm). Cached as data URLs by content fingerprint + time + height,
// outside React/History. Seeks per source are serialized to avoid seek races.

const fp = (source: File | Blob | string) => {
  if (typeof source === "string") return source;
  const f = source as File;
  return `${f.name || "blob"}_${f.size || 0}_${(f as any).lastModified || 0}`;
};

// Pure: evenly-spaced sample times across a clip's source window (bucket centers). Unit-tested.
export function thumbTimes(sourceIn: number, sourceOut: number, count: number): number[] {
  const span = Math.max(0.0001, sourceOut - sourceIn);
  const n = Math.max(1, count);
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(sourceIn + span * ((i + 0.5) / n));
  return out;
}

// Pure: how many thumbnails fit a clip of the given pixel width. Unit-tested.
export function filmstripCount(widthPx: number, thumbWidthPx: number, max = 14): number {
  return Math.max(1, Math.min(max, Math.floor(widthPx / Math.max(1, thumbWidthPx))));
}

interface Src { el: HTMLVideoElement; ready: Promise<void>; queue: Promise<unknown>; }
const sources = new Map<string, Src>();
const cache = new Map<string, string>();

function getSource(source: File | Blob | string): Src {
  const key = fp(source);
  let s = sources.get(key);
  if (!s) {
    const el = document.createElement("video");
    el.muted = true;
    el.playsInline = true;
    el.preload = "auto";
    el.crossOrigin = "anonymous";
    el.src = typeof source === "string" ? source : URL.createObjectURL(source);
    const ready = new Promise<void>((res, rej) => {
      if (el.readyState >= 2) {
        res();
        return;
      }
      el.onloadeddata = () => res();
      el.onloadedmetadata = () => {
        if (el.readyState >= 2) res();
      };
      el.onerror = () => rej(new Error("thumbnail: video load failed"));
    });
    s = { el, ready, queue: Promise.resolve() };
    sources.set(key, s);
  }
  return s;
}

function seek(el: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((res) => {
    if (Math.abs(el.currentTime - t) < 0.05 && el.readyState >= 2) {
      res();
      return;
    }
    let done = false;
    const to = setTimeout(() => {
      if (!done) {
        done = true;
        el.removeEventListener("seeked", onSeeked);
        res();
      }
    }, 1500);
    const onSeeked = () => {
      if (done) return;
      done = true;
      clearTimeout(to);
      el.removeEventListener("seeked", onSeeked);
      res();
    };
    el.addEventListener("seeked", onSeeked);
    try {
      el.currentTime = Math.max(0, Math.min(el.duration || 99999, t));
    } catch {
      done = true;
      clearTimeout(to);
      el.removeEventListener("seeked", onSeeked);
      res();
    }
  });
}

export async function getThumbnail(source: File | Blob | string, timeSec: number, height = 44): Promise<string> {
  const key = `${fp(source)}@${timeSec.toFixed(2)}#${height}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const src = getSource(source);
  const run = src.queue.then(async () => {
    const cached = cache.get(key);
    if (cached) return cached;
    try {
      await src.ready;
    } catch {
      // Continue even if ready promise threw, check readyState
    }
    await seek(src.el, timeSec);
    const vw = src.el.videoWidth || 16, vh = src.el.videoHeight || 9;
    const w = Math.max(1, Math.round(height * (vw / vh)));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = height;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("no 2d ctx");
    ctx.drawImage(src.el, 0, 0, w, height);
    const url = c.toDataURL("image/jpeg", 0.55);
    cache.set(key, url);
    return url;
  });
  src.queue = run.catch(() => {});
  return run;
}
