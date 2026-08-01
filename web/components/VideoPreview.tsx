"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Clip, MediaAsset, assembledStart, assembledToSource, clipDur, clipEnabled, totalDur } from "@/lib/editor/model";

export interface PreviewHandle { seek: (assembled: number) => void; }

interface Props {
  media: MediaAsset[];
  clips: Clip[] | null;
  onTime: (assembled: number) => void;
  onCopyPosition?: (assembled: number) => void;
  audioMuted?: boolean;
}

const fmtT = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// תצוגה מקדימה רב-מקורית עם סרגל נגן (seek), "העתק מיקום" וצילום פריים.
const VideoPreview = forwardRef<PreviewHandle, Props>(function VideoPreview({ media, clips, onTime, onCopyPosition, audioMuted }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const idx = useRef(0);
  const loaded = useRef<string | null>(null);
  const pending = useRef<{ t: number; play: boolean } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [copied, setCopied] = useState(false);

  const edl = clips && clips.length ? clips : null;
  const byId = (id: string) => media.find((m) => m.id === id);
  const firstVid = media.find((m) => m.kind === "video");
  const playable = (c: Clip) => byId(c.sourceId)?.kind === "video" && clipEnabled(c);

  useEffect(() => { if (videoRef.current) videoRef.current.muted = !!audioMuted; }, [audioMuted]);
  const total = edl ? totalDur(edl) : dur;

  const ensure = (sourceId: string, tt: number, play: boolean) => {
    const v = videoRef.current; if (!v) return;
    const asset = byId(sourceId); if (!asset || asset.kind !== "video") return;
    if (loaded.current === sourceId) { v.currentTime = tt; if (play) v.play(); return; }
    loaded.current = sourceId; pending.current = { t: tt, play }; v.src = asset.url; v.load();
  };

  const seekTo = (assembled: number) => {
    const v = videoRef.current; if (!v) return;
    if (edl) { const { index, source } = assembledToSource(edl, assembled); idx.current = Math.max(0, index); ensure(edl[idx.current].sourceId, source, false); }
    else v.currentTime = assembled;
    setT(assembled);
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v || edl) return;
    if (firstVid && loaded.current !== firstVid.id) { loaded.current = firstVid.id; v.src = firstVid.url; v.load(); }
  }, [media, edl]);

  useImperativeHandle(ref, () => ({ seek: seekTo }));

  const onLoaded = () => {
    const p = pending.current; const v = videoRef.current;
    if (v) setDur(edl ? totalDur(edl) : v.duration || 0);
    if (p && v) { v.currentTime = p.t; if (p.play) { v.play(); setPlaying(true); } pending.current = null; }
  };

  const onTimeUpdate = () => {
    const v = videoRef.current; if (!v) return;
    if (!edl) { setT(v.currentTime); onTime(v.currentTime); return; }
    let i = idx.current;
    if (i >= edl.length) { v.pause(); return; }
    if (v.currentTime >= edl[i].end - 0.03) {
      do { i++; } while (i < edl.length && !playable(edl[i]));
      idx.current = i;
      if (i >= edl.length) { v.pause(); setT(total); onTime(total); return; }
      ensure(edl[i].sourceId, edl[i].start + 0.001, true);
      return;
    }
    const a = assembledStart(edl, i) + Math.max(0, Math.min(clipDur(edl[i]), v.currentTime - edl[i].start));
    setT(a); onTime(a);
  };

  const toggle = () => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) {
      if (edl && idx.current >= edl.length) idx.current = 0;
      if (edl) ensure(edl[idx.current].sourceId, edl[idx.current].start, true);
      else { v.play(); setPlaying(true); }
    } else { v.pause(); setPlaying(false); }
  };

  const copyPos = () => {
    navigator.clipboard?.writeText(`[מיקום ${t.toFixed(1)} שניות]`);
    onCopyPosition?.(t);
    setCopied(true); setTimeout(() => setCopied(false), 1200);
  };
  const capture = () => {
    const v = videoRef.current; if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    c.toBlob((b) => { if (b) download(b, `frame_${t.toFixed(1)}s.png`); }, "image/png");
  };

  const hasVideo = !!firstVid;
  return (
    <div className="preview">
      {hasVideo ? (
        <video ref={videoRef} className="preview-video" onTimeUpdate={onTimeUpdate} onLoadedData={onLoaded} onDurationChange={onLoaded}
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onClick={toggle} />
      ) : (
        <div className="preview-empty">טען סרטון כדי לראות תצוגה מקדימה</div>
      )}
      <div className="preview-bar">
        <button className="btn" onClick={toggle} disabled={!hasVideo}>{playing ? "⏸" : "▶"}</button>
        <span className="pv-time">{fmtT(t)} / {fmtT(total)}</span>
        <input className="pv-seek" type="range" min={0} max={Math.max(0.1, total)} step={0.1} value={Math.min(t, total)}
          onChange={(e) => seekTo(+e.target.value)} disabled={!hasVideo} />
        <button className="btn" onClick={copyPos} disabled={!hasVideo} title="העתק את המיקום הנוכחי">{copied ? "✓ הועתק" : "📍 העתק מיקום"}</button>
        <button className="btn" onClick={capture} disabled={!hasVideo} title="צלם את הפריים הנוכחי">📸 צלם</button>
      </div>
    </div>
  );
});

export default VideoPreview;
