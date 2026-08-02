"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Clip, MediaAsset, assembledStart, assembledToSource, clipDur, clipEnabled, totalDur } from "@/lib/editor/model";
import { Sub } from "@/lib/editor/subtitlesEdl";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize, MoreHorizontal, Camera, MapPin, Film } from "lucide-react";
import { IconButton, ContextMenu, CtxItem } from "@/components/ui";

export interface PreviewHandle { seek: (assembled: number) => void; toggle: () => void; }

interface Props {
  media: MediaAsset[];
  clips: Clip[] | null;
  subs?: Sub[] | null;
  onTime: (assembled: number) => void;
  onCopyPosition?: (assembled: number) => void;
  audioMuted?: boolean;
}

const FRAME = 1 / 30;
const fmtT = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}.${String(Math.floor((s % 1) * 10))}`;
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const VideoPreview = forwardRef<PreviewHandle, Props>(function VideoPreview({ media, clips, subs, onTime, onCopyPosition, audioMuted }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const idx = useRef(0);
  const loaded = useRef<string | null>(null);
  const pending = useRef<{ t: number; play: boolean } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(1);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const edl = clips && clips.length ? clips : null;
  const byId = (id: string) => media.find((m) => m.id === id);
  const firstVid = media.find((m) => m.kind === "video");
  const playable = (c: Clip) => byId(c.sourceId)?.kind === "video" && clipEnabled(c);

  useEffect(() => { if (videoRef.current) videoRef.current.muted = !!audioMuted; }, [audioMuted]);
  useEffect(() => { if (videoRef.current) videoRef.current.volume = vol; }, [vol]);
  const total = edl ? totalDur(edl) : dur;

  const ensure = (sourceId: string, tt: number, play: boolean) => {
    const v = videoRef.current; if (!v) return;
    const asset = byId(sourceId); if (!asset || asset.kind !== "video") return;
    if (loaded.current === sourceId) { v.currentTime = tt; if (play) v.play(); return; }
    loaded.current = sourceId; pending.current = { t: tt, play }; v.src = asset.url; v.load();
  };

  const seekTo = (assembled: number) => {
    const v = videoRef.current; if (!v) return;
    const a = Math.max(0, Math.min(total, assembled));
    if (edl) { const { index, source } = assembledToSource(edl, a); idx.current = Math.max(0, index); ensure(edl[idx.current].sourceId, source, false); }
    else v.currentTime = a;
    setT(a); onTime(a);
  };
  const step = (dir: -1 | 1) => { if (playing) { videoRef.current?.pause(); setPlaying(false); } seekTo(t + dir * FRAME); };

  useEffect(() => {
    const v = videoRef.current;
    if (!v || edl) return;
    if (firstVid && loaded.current !== firstVid.id) { loaded.current = firstVid.id; v.src = firstVid.url; v.load(); }
  }, [media, edl]);

  useImperativeHandle(ref, () => ({ seek: seekTo, toggle }));

  const onLoaded = () => {
    const p = pending.current; const v = videoRef.current;
    if (v) { setDur(edl ? totalDur(edl) : v.duration || 0); v.volume = vol; }
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

  const copyPos = () => { navigator.clipboard?.writeText(`[מיקום ${t.toFixed(1)} שניות]`); onCopyPosition?.(t); };
  const capture = () => {
    const v = videoRef.current; if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    c.toBlob((b) => { if (b) download(b, `frame_${t.toFixed(1)}s.png`); }, "image/png");
  };
  const fullscreen = () => { const el = stageRef.current; if (!el) return; if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen?.(); };

  const hasVideo = !!firstVid;
  const menuItems: CtxItem[] = [
    { label: "צלם פריים נוכחי", icon: Camera, onClick: capture, disabled: !hasVideo },
    { label: "העתק מיקום נוכחי", icon: MapPin, onClick: copyPos, disabled: !hasVideo },
  ];

  return (
    <div className="preview2">
      <div className="pv-stage" ref={stageRef}>
        {hasVideo ? (
          <>
            <video ref={videoRef} onTimeUpdate={onTimeUpdate} onLoadedData={onLoaded} onDurationChange={onLoaded}
              onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onClick={toggle} />
            {(() => { const cue = (subs || []).find((s) => t >= s.start - 0.02 && t <= s.end + 0.02); return cue ? <div className="pv-caption">{cue.text}</div> : null; })()}
          </>
        ) : (
          <div className="pv-empty"><Film size={40} strokeWidth={1.25} /><span>טען מדיה כדי לראות תצוגה מקדימה</span></div>
        )}
      </div>

      <div className="transport" dir="ltr">
        <div className="tp-vol">
          <IconButton icon={vol === 0 ? VolumeX : Volume2} tip={vol === 0 ? "בטל השתקה" : "עוצמה"} tipPos="up"
            onClick={() => setVol((v) => (v === 0 ? 1 : 0))} disabled={!hasVideo} />
          <input type="range" min={0} max={1} step={0.05} value={vol} onChange={(e) => setVol(+e.target.value)} disabled={!hasVideo} />
        </div>
        <div className="tp-grow" />
        <div className="tp-center">
          <IconButton icon={SkipBack} tip="פריים אחורה" tipPos="up" onClick={() => step(-1)} disabled={!hasVideo} />
          <button className="tp-play" onClick={toggle} disabled={!hasVideo} data-tip={playing ? "השהה (Space)" : "נגן (Space)"} data-tippos="up">
            {playing ? <Pause size={18} strokeWidth={2} /> : <Play size={18} strokeWidth={2} />}
          </button>
          <IconButton icon={SkipForward} tip="פריים קדימה" tipPos="up" onClick={() => step(1)} disabled={!hasVideo} />
          <span className="tp-time">{fmtT(Math.min(t, total))}<span className="sep">/</span><span className="total">{fmtT(total)}</span></span>
        </div>
        <div className="tp-grow" />
        <IconButton icon={MoreHorizontal} tip="עוד" tipPos="up" disabled={!hasVideo}
          onClick={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setMenu({ x: r.left, y: r.top - 8 }); }} />
        <IconButton icon={Maximize} tip="מסך מלא" tipPos="up" onClick={fullscreen} disabled={!hasVideo} />
      </div>

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}
    </div>
  );
});

export default VideoPreview;
