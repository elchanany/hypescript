import type { RenderRouteMessage } from "@/lib/render/renderRoute";
"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, ExternalLink, Film, Loader2, Maximize, Pause, Play, RotateCcw, Square, Volume2, VolumeX, X } from "@/components/icons";
import { estimateRemainingSeconds, exportPercent, formatBytes, formatDurationHe } from "@/lib/render/exportProgress";

export interface ExportResult {
  url: string;
  name: string;
  size: number;
}

interface Props {
  open: boolean;
  rendering: boolean;
  /** איפה הרינדור רץ *בפועל*. הכותרת וההערה נגזרות מזה ולא מהנחה. */
  route: RenderRouteMessage;
  progress: number;
  elapsedSeconds: number;
  phase: string;
  error: string;
  result: ExportResult | null;
  onClose: () => void;
  onCancel: () => void;
  onRetry: () => void;
}

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "00:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

function ExportVideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setT(v.currentTime);
    const onMeta = () => setDur(v.duration || 0);
    const onEnd = () => setPlaying(false);
    const onErr = () => setErr(true);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("ended", onEnd);
    v.addEventListener("error", onErr);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("ended", onEnd);
      v.removeEventListener("error", onErr);
    };
  }, [src]);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const cycleSpeed = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    v.playbackRate = next;
    setSpeed(next);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const toggleFullscreen = () => {
    const v = videoRef.current;
    if (!v) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void v.requestFullscreen?.();
  };

  return (
    <div className="export-vplayer">
      <video
        ref={videoRef}
        className="export-video-el"
        src={src}
        playsInline
        preload="metadata"
        onClick={toggle}
      />
      {err && <div className="export-vplayer-err">לא ניתן לטעון את תצוגת הווידאו המקדימה</div>}
      <div className="export-vplayer-controls" dir="ltr">
        <button type="button" className="iconbtn" onClick={toggle} aria-label={playing ? "השהה" : "נגן"}>
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <input
          className="export-seek"
          type="range"
          min={0}
          max={Math.max(0.01, dur)}
          step={0.01}
          value={t}
          onChange={(e) => {
            const val = +e.target.value;
            setT(val);
            if (videoRef.current) videoRef.current.currentTime = val;
          }}
        />
        <span className="export-time">{formatTime(t)} / {formatTime(dur)}</span>
        <button type="button" className="btn ghost sm speed-btn" onClick={cycleSpeed} title="מהירות ניגון">
          {speed}x
        </button>
        <button type="button" className="iconbtn" onClick={toggleMute} aria-label={muted ? "הפעל קול" : "השתק"}>
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <button type="button" className="iconbtn" onClick={toggleFullscreen} aria-label="מסך מלא">
          <Maximize size={16} />
        </button>
      </div>
    </div>
  );
}

export default function ExportDialog({ open, rendering, route, progress, elapsedSeconds, phase, error, result, onClose, onCancel, onRetry }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  const percent = exportPercent(progress);
  const remaining = estimateRemainingSeconds(progress, elapsedSeconds);

  return (
    <div className="export-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="export-card" role="dialog" aria-modal="true" aria-labelledby="export-title" dir="rtl">
        <header className="export-head">
          <div className={`export-mark ${result ? "done" : error ? "failed" : ""}`}>
            {rendering ? <Loader2 className="spin" size={21} /> : result ? <CheckCircle2 size={21} /> : <Film size={21} />}
          </div>
          <div>
            <h2 id="export-title">{result ? "הסרטון מוכן להורדה" : error ? "הייצוא נעצר" : route.titleHe}</h2>
            <p>{result ? "הסרטון רונדר בהצלחה. תוכל לצפות בו באיכות מלאה ולהוריד למכשיר שלך." : error || phase || "מכינים את הפרויקט לרינדור…"}</p>
          </div>
          <button type="button" className="iconbtn export-close" onClick={onClose} aria-label={rendering ? "הסתר מצב ייצוא" : "סגור"}><X size={17} /></button>
        </header>

        {rendering && (
          <div className="export-running" aria-live="polite">
            <div className="export-progress-row"><strong>{percent}%</strong><span>{phase || route.titleHe}</span></div>
            <div className="export-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><i style={{ width: `${percent}%` }} /></div>
            <div className="export-stats">
              <span>עברו {formatDurationHe(elapsedSeconds)}</span>
              <span>{remaining == null ? "מחשב זמן שנותר…" : `נותרו בערך ${formatDurationHe(remaining)}`}</span>
            </div>
            <div className="export-note">{route.noteHe}</div>
            <button type="button" className="btn ghost export-cancel" onClick={onCancel}><Square size={13} />בטל ייצוא</button>
          </div>
        )}

        {result && !rendering && (
          <div className="export-result">
            <ExportVideoPlayer src={result.url} />
            <div className="export-file">
              <div>
                <strong>{result.name}</strong>
                <span>{formatBytes(result.size)} · MP4 H.264</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <a className="btn primary tall" href={result.url} download={result.name}>
                  <Download size={16} strokeWidth={2} />הורד סרטון
                </a>
                <a className="btn ghost tall" href={result.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={16} />פתח בחלון נפרד
                </a>
              </div>
            </div>
          </div>
        )}

        {error && !rendering && (
          <div className="export-error-actions">
            <button type="button" className="btn primary tall" onClick={onRetry}><RotateCcw size={15} />נסה שוב</button>
            <button type="button" className="btn ghost tall" onClick={onClose}>סגור</button>
          </div>
        )}
      </section>
    </div>
  );
}
