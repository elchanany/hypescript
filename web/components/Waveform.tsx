"use client";

// Real waveform for a clip's [sourceIn, sourceOut] window. Peaks are decoded once per
// source (Web Audio, cached in lib/media/waveform) and sliced here; redrawn on resize.
import { memo, useEffect, useRef, useState } from "react";
import { bucketRange, WaveformData, WAVE_BUCKETS } from "@/lib/media/waveform";

function Waveform({ file, sourceIn, sourceOut, color = "#5fbf8a" }: {
  file: File; sourceIn: number; sourceOut: number; color?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<WaveformData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    (async () => {
      try {
        const { getWaveform } = await import("@/lib/media/waveform");
        const d = await getWaveform(file);
        if (cancelled) return;
        dataRef.current = d; setState("ready");
      } catch (e) { console.warn("[wf]", (e as any)?.message || e); if (!cancelled) setState("error"); }
    })();
    return () => { cancelled = true; };
  }, [file]);

  useEffect(() => {
    if (state !== "ready") return;
    const draw = () => {
      const cv = canvasRef.current, d = dataRef.current, parent = canvasRef.current?.parentElement;
      if (!cv || !d || !parent) return;
      const w = Math.max(1, parent.clientWidth), h = Math.max(1, parent.clientHeight);
      const dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.width = w + "px"; cv.style.height = h + "px";
      const ctx = cv.getContext("2d"); if (!ctx) return;
      ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);
      const [s, e] = bucketRange(sourceIn, sourceOut, d.duration, d.peaks.length || WAVE_BUCKETS);
      const n = Math.max(1, e - s);
      const mid = h / 2;
      ctx.fillStyle = color;
      for (let x = 0; x < w; x++) {
        const i0 = s + Math.floor((x / w) * n);
        const i1 = s + Math.floor(((x + 1) / w) * n);
        let peak = 0;
        for (let i = i0; i < Math.max(i0 + 1, i1); i++) { const v = d.peaks[i] || 0; if (v > peak) peak = v; }
        const bh = Math.max(1, peak * (h - 2));
        ctx.fillRect(x, mid - bh / 2, 1, bh);
      }
    };
    draw(); // draw synchronously — rAF is throttled/suspended in hidden tabs
    const ro = new ResizeObserver(() => draw());
    if (canvasRef.current?.parentElement) ro.observe(canvasRef.current.parentElement);
    return () => ro.disconnect();
  }, [state, sourceIn, sourceOut, color]);

  return (
    <>
      <canvas ref={canvasRef} data-wf={state} />
      {state === "loading" && <div className="strip-loading" />}
    </>
  );
}

export default memo(Waveform);
