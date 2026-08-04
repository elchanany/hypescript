"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Clip, MediaAsset, assembledStart, assembledToSource, clipDur, clipEnabled, totalDur } from "@/lib/editor/model";
import { isGapClip } from "@/lib/editor/timelineOps";
import { Sub } from "@/lib/editor/subtitlesEdl";
import { Overlay } from "@/lib/editor/overlay";
import { CanvasSize, displayRect, VIEWER_ZOOM_PRESETS, viewerZoomLabel } from "@/lib/editor/canvasCoords";
import { CaptionStyle, DEFAULT_CAPTION_STYLE } from "@/lib/editor/captionStyle";
import { VideoTransform, defaultVideoTransformFor, resolveVideoRect, videoTransformCss } from "@/lib/editor/videoTransform";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize, MoreHorizontal, Camera, MapPin, Film, ZoomIn } from "lucide-react";
import { IconButton, ContextMenu, CtxItem } from "@/components/ui";
import PreviewOverlays from "@/components/PreviewOverlays";
import PreviewCaptions from "@/components/PreviewCaptions";
import PreviewMainVideo from "@/components/PreviewMainVideo";

export interface PreviewHandle { seek: (assembled: number) => void; toggle: () => void; }

interface Props {
  media: MediaAsset[];
  clips: Clip[] | null;
  subs?: Sub[] | null;
  onTime: (assembled: number) => void;
  onCopyPosition?: (assembled: number) => void;
  audioMuted?: boolean;
  canvas: CanvasSize;
  overlays: Overlay[];
  selectedOverlayId?: string | null;
  onSelectOverlay?: (id: string | null) => void;
  onBeginOverlay?: () => void;
  onOverlayLive?: (updater: (prev: Overlay[]) => Overlay[]) => void;
  onCommitOverlay?: () => void;
  onCancelOverlay?: () => void;
  onEditOverlayText?: (id: string, text: string) => void;
  onCanvasDetected?: (w: number, h: number) => void;
  captionStyle?: CaptionStyle;
  // Main video transform (Element Scale)
  videoTransform?: VideoTransform;
  selectedMainVideo?: boolean;
  onSelectMainVideo?: () => void;
  onBeginVideoTransform?: () => void;
  onVideoTransformLive?: (vt: VideoTransform) => void;
  onCommitVideoTransform?: () => void;
  onCancelVideoTransform?: () => void;
  // Captions as visual elements
  selectedSubId?: string | null;
  hoveredSubId?: string | null;
  onHoverSub?: (id: string | null) => void;
  onSelectSub?: (id: string | null) => void;
  onBeginSub?: () => void;
  onSubLive?: (updater: (prev: Sub[] | null) => Sub[] | null) => void;
  onCommitSub?: () => void;
  onCancelSub?: () => void;
  onEditSubText?: (id: string, text: string) => void;
  /** Clear all selections (click on empty canvas chrome). */
  onClearSelection?: () => void;
  videoLocked?: boolean;
}

const FRAME = 1 / 30;
const fmtT = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}.${String(Math.floor((s % 1) * 10))}`;
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const VideoPreview = forwardRef<PreviewHandle, Props>(function VideoPreview({
  media, clips, subs, onTime, onCopyPosition, audioMuted, canvas, overlays,
  selectedOverlayId, onSelectOverlay, onBeginOverlay, onOverlayLive, onCommitOverlay, onCancelOverlay, onEditOverlayText,
  onCanvasDetected, captionStyle,
  videoTransform, selectedMainVideo, onSelectMainVideo,
  onBeginVideoTransform, onVideoTransformLive, onCommitVideoTransform, onCancelVideoTransform,
  selectedSubId, hoveredSubId, onHoverSub, onSelectSub, onBeginSub, onSubLive, onCommitSub, onCancelSub, onEditSubText,
  onClearSelection, videoLocked,
}, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasBoxRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  const idx = useRef(0);
  const loaded = useRef<string | null>(null);
  const pending = useRef<{ t: number; play: boolean } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(1);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [inGap, setInGap] = useState(false);
  const gapRaf = useRef<number | null>(null);
  const [sourceSize, setSourceSize] = useState({ w: 1920, h: 1080 });
  const [hoverMain, setHoverMain] = useState(false);
  /** Viewer Zoom only — never mutates Element Scale / videoTransform. */
  const [viewerZoom, setViewerZoom] = useState<number | "fit">("fit");
  const layerCycle = useRef(0);

  const edl = clips && clips.length ? clips : null;
  const byId = (id: string) => media.find((m) => m.id === id);
  const firstVid = media.find((m) => m.kind === "video");
  const playable = (c: Clip) => !isGapClip(c) && byId(c.sourceId)?.kind === "video" && clipEnabled(c);

  useEffect(() => { if (videoRef.current) videoRef.current.muted = !!audioMuted; }, [audioMuted]);
  useEffect(() => { if (videoRef.current) videoRef.current.volume = vol; }, [vol]);
  useEffect(() => () => { if (gapRaf.current != null) cancelAnimationFrame(gapRaf.current); }, []);

  // measure the stage so we can letterbox the project canvas box inside it
  useEffect(() => {
    const el = stageRef.current; if (!el) return;
    const measure = () => setStageSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const box = displayRect(stageSize.w, stageSize.h, canvas, viewerZoom);
  const total = edl ? totalDur(edl) : dur;

  // Ctrl/pinch wheel over viewer → Viewer Zoom (not Element Scale)
  useEffect(() => {
    const el = stageRef.current; if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const dir = e.deltaY > 0 ? -1 : 1;
      setViewerZoom((z) => {
        const cur = z === "fit"
          ? Math.min(stageSize.w / canvas.width, stageSize.h / canvas.height) || 0.5
          : z;
        const next = Math.max(0.1, Math.min(4, cur * (dir > 0 ? 1.12 : 1 / 1.12)));
        // snap near presets
        for (const p of [0.25, 0.5, 1, 2]) if (Math.abs(next - p) < 0.04) return p;
        return +next.toFixed(3);
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [canvas.width, canvas.height, stageSize.w, stageSize.h]);

  /** Alt+Click cycles top→bottom among overlays + caption + main under the pointer. */
  const cycleLayerAt = (clientX: number, clientY: number, alt: boolean) => {
    const boxEl = canvasBoxRef.current; if (!boxEl) return;
    const r = boxEl.getBoundingClientRect();
    const scale = r.width / Math.max(1, canvas.width);
    const px = (clientX - r.left) / scale;
    const py = (clientY - r.top) / scale;
    type Hit = { kind: "overlay" | "caption" | "main"; id: string; z: number };
    const hits: Hit[] = [];
    const vt = videoTransform || defaultVideoTransformFor(canvas);
    const mainRect = resolveVideoRect(vt, canvas, sourceSize.w, sourceSize.h);
    const inMain =
      Math.abs(px - mainRect.x) <= mainRect.w / 2 && Math.abs(py - mainRect.y) <= mainRect.h / 2;
    if (inMain) hits.push({ kind: "main", id: "__main__", z: 0 });
    for (const o of overlays) {
      if (o.hidden) continue;
      if (t < o.start - 1e-3 || t > o.end + 1e-3) continue;
      const tr = o.transform;
      const localX = px; const localY = py;
      if (Math.abs(localX - tr.x) <= tr.w / 2 && Math.abs(localY - tr.y) <= tr.h / 2) {
        hits.push({ kind: "overlay", id: o.id, z: o.zIndex + 10 });
      }
    }
    for (const s of (subs || [])) {
      if (t < s.start - 0.01 || t >= s.end) continue;
      hits.push({ kind: "caption", id: s.id, z: 1000 });
    }
    hits.sort((a, b) => b.z - a.z);
    if (!hits.length) { onClearSelection?.(); return; }
    if (alt && hits.length > 1) {
      layerCycle.current = (layerCycle.current + 1) % hits.length;
    } else {
      layerCycle.current = 0;
    }
    const pick = hits[layerCycle.current];
    if (pick.kind === "overlay") onSelectOverlay?.(pick.id);
    else if (pick.kind === "caption") onSelectSub?.(pick.id);
    else onSelectMainVideo?.();
  };

  const clearGapClock = () => { if (gapRaf.current != null) { cancelAnimationFrame(gapRaf.current); gapRaf.current = null; } };

  const ensure = (sourceId: string, tt: number, play: boolean) => {
    const v = videoRef.current; if (!v) return;
    const asset = byId(sourceId); if (!asset || asset.kind !== "video") return;
    setInGap(false); clearGapClock();
    if (loaded.current === sourceId) { v.currentTime = tt; if (play) { v.play(); setPlaying(true); } return; }
    loaded.current = sourceId; pending.current = { t: tt, play }; v.src = asset.url; v.load();
  };

  const advanceFrom = (index: number, play: boolean) => {
    if (!edl) return;
    let i = index;
    while (i < edl.length && !clipEnabled(edl[i])) i++;
    idx.current = i;
    if (i >= edl.length) { videoRef.current?.pause(); setPlaying(false); setInGap(false); setT(total); onTime(total); return; }
    if (isGapClip(edl[i])) { runGap(i, assembledStart(edl, i), play); return; }
    ensure(edl[i].sourceId, edl[i].start + 0.001, play);
  };

  const runGap = (index: number, fromAssembled: number, play: boolean) => {
    if (!edl) return;
    const v = videoRef.current; v?.pause();
    clearGapClock(); setInGap(true); loaded.current = null; idx.current = index;
    const gapStart = assembledStart(edl, index);
    const gapEnd = gapStart + clipDur(edl[index]);
    let a = Math.max(gapStart, Math.min(fromAssembled, gapEnd));
    setT(a); onTime(a);
    if (!play) { setPlaying(false); return; }
    setPlaying(true);
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      a = Math.min(gapEnd, a + dt);
      setT(a); onTime(a);
      if (a >= gapEnd - 0.001) { advanceFrom(index + 1, true); return; }
      gapRaf.current = requestAnimationFrame(tick);
    };
    gapRaf.current = requestAnimationFrame(tick);
  };

  const seekTo = (assembled: number) => {
    const v = videoRef.current; if (!v) return;
    const a = Math.max(0, Math.min(total, assembled));
    clearGapClock(); setPlaying(false);
    if (edl) {
      const { index, source } = assembledToSource(edl, a);
      idx.current = Math.max(0, index);
      if (index >= 0 && isGapClip(edl[index])) { runGap(index, a, false); return; }
      setInGap(false);
      if (index >= 0) ensure(edl[index].sourceId, source, false);
    } else v.currentTime = a;
    setT(a); onTime(a);
  };
  const step = (dir: -1 | 1) => { if (playing) { videoRef.current?.pause(); setPlaying(false); clearGapClock(); } seekTo(t + dir * FRAME); };

  useEffect(() => {
    const v = videoRef.current;
    if (!v || edl) return;
    if (firstVid && loaded.current !== firstVid.id) { loaded.current = firstVid.id; v.src = firstVid.url; v.load(); }
  }, [media, edl]);

  useImperativeHandle(ref, () => ({ seek: seekTo, toggle }));

  const onLoaded = () => {
    const p = pending.current; const v = videoRef.current;
    if (v) {
      setDur(edl ? totalDur(edl) : v.duration || 0);
      v.volume = vol;
      if (v.videoWidth && v.videoHeight) {
        setSourceSize({ w: v.videoWidth, h: v.videoHeight });
        onCanvasDetected?.(v.videoWidth, v.videoHeight);
      }
    }
    if (p && v) { v.currentTime = p.t; if (p.play) { v.play(); setPlaying(true); } pending.current = null; }
  };

  const onTimeUpdate = () => {
    const v = videoRef.current; if (!v) return;
    if (!edl) { setT(v.currentTime); onTime(v.currentTime); return; }
    let i = idx.current;
    if (i >= edl.length) { v.pause(); return; }
    if (isGapClip(edl[i])) return; // gap clock owns time
    if (v.currentTime >= edl[i].end - 0.03) { advanceFrom(i + 1, true); return; }
    const a = assembledStart(edl, i) + Math.max(0, Math.min(clipDur(edl[i]), v.currentTime - edl[i].start));
    setT(a); onTime(a);
  };

  const toggle = () => {
    const v = videoRef.current; if (!v) return;
    if (playing || (!v.paused && !inGap)) {
      v.pause(); clearGapClock(); setPlaying(false); return;
    }
    if (edl) {
      if (idx.current >= edl.length) idx.current = 0;
      const i = idx.current;
      if (isGapClip(edl[i])) runGap(i, Math.max(assembledStart(edl, i), t), true);
      else ensure(edl[i].sourceId, edl[i].start + (t > assembledStart(edl, i) ? Math.min(edl[i].end - edl[i].start - 0.01, t - assembledStart(edl, i)) : 0.001), true);
    } else { v.play(); setPlaying(true); }
  };

  const quotePlace = () => { onCopyPosition?.(t); };
  const capture = () => {
    const v = videoRef.current; if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    c.toBlob((b) => { if (b) download(b, `frame_${t.toFixed(1)}s.png`); }, "image/png");
  };
  const fullscreen = () => { const el = stageRef.current; if (!el) return; if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen?.(); };

  const hasVideo = !!firstVid;
  const vt = videoTransform || defaultVideoTransformFor(canvas);
  const videoRect = resolveVideoRect(vt, canvas, sourceSize.w, sourceSize.h);
  const menuItems: CtxItem[] = [
    { label: "צלם פריים נוכחי", icon: Camera, onClick: capture, disabled: !hasVideo },
    { label: "ציטוט מקום לתיבת ההודעה", icon: MapPin, onClick: quotePlace, disabled: !hasVideo },
  ];

  return (
    <div className="preview2">
      <div className={`pv-stage ${viewerZoom !== "fit" ? "zoomed" : ""}`} ref={stageRef}>
        {hasVideo ? (
          <div
            className="pv-canvas"
            ref={canvasBoxRef}
            style={{ width: box.width || "100%", height: box.height || "100%", flex: "none" }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                if (e.altKey) cycleLayerAt(e.clientX, e.clientY, true);
                else { onClearSelection?.(); toggle(); }
              }
            }}
          >
            <video
              ref={videoRef}
              onTimeUpdate={onTimeUpdate}
              onLoadedData={onLoaded}
              onDurationChange={onLoaded}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onClick={(e) => {
                e.stopPropagation();
                if (e.altKey) { cycleLayerAt(e.clientX, e.clientY, true); return; }
                if (!selectedMainVideo) onSelectMainVideo?.();
                else toggle();
              }}
              style={{
                ...videoTransformCss(videoRect, canvas),
                visibility: inGap ? "hidden" : undefined,
                pointerEvents: "none",
                cursor: "pointer",
              }}
            />
            {inGap && <div className="pv-gap" aria-hidden />}
            {onSelectMainVideo && (
              <PreviewMainVideo
                boxRef={canvasBoxRef}
                canvas={canvas}
                videoTransform={vt}
                sourceW={sourceSize.w}
                sourceH={sourceSize.h}
                selected={!!selectedMainVideo}
                hovered={hoverMain}
                locked={!!videoLocked}
                onHover={setHoverMain}
                onSelect={() => onSelectMainVideo()}
                onBegin={() => onBeginVideoTransform?.()}
                onLive={(next) => onVideoTransformLive?.(next)}
                onCommit={() => onCommitVideoTransform?.()}
                onCancel={() => onCancelVideoTransform?.()}
                onAltCycle={(x, y) => cycleLayerAt(x, y, true)}
              />
            )}
            <PreviewCaptions
              boxRef={canvasBoxRef}
              canvas={canvas}
              subs={subs || []}
              currentTime={t}
              captionStyle={captionStyle || DEFAULT_CAPTION_STYLE}
              selectedId={selectedSubId ?? null}
              hoveredId={hoveredSubId}
              onHover={onHoverSub}
              onSelect={(id) => onSelectSub?.(id)}
              onBegin={() => onBeginSub?.()}
              onLive={(u) => onSubLive?.(u)}
              onCommit={() => onCommitSub?.()}
              onCancel={() => onCancelSub?.()}
              onEditText={(id, text) => onEditSubText?.(id, text)}
            />
            <PreviewOverlays boxRef={canvasBoxRef} canvas={canvas} overlays={overlays} media={media} currentTime={t}
              selectedId={selectedOverlayId ?? null}
              onSelect={(id) => onSelectOverlay?.(id)}
              onBegin={() => onBeginOverlay?.()}
              onLive={(u) => onOverlayLive?.(u)}
              onCommit={() => onCommitOverlay?.()}
              onCancel={() => onCancelOverlay?.()}
              onEditText={(id, text) => onEditOverlayText?.(id, text)}
              onAltCycle={(x, y) => cycleLayerAt(x, y, true)} />
          </div>
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
        <div className="tp-viewer-zoom" title="Viewer Zoom — לא משנה את גודל האלמנט בפלט">
          <ZoomIn size={14} strokeWidth={1.75} />
          <select
            value={viewerZoom === "fit" ? "fit" : String(viewerZoom)}
            onChange={(e) => {
              const v = e.target.value;
              setViewerZoom(v === "fit" ? "fit" : +v);
            }}
            aria-label="זום תצוגה"
            disabled={!hasVideo}
          >
            {VIEWER_ZOOM_PRESETS.map((p) => (
              <option key={p.label} value={p.value === "fit" ? "fit" : String(p.value)}>{p.label}</option>
            ))}
          </select>
          <span className="tp-vz-label">{viewerZoomLabel(viewerZoom)}</span>
        </div>
        <IconButton icon={MapPin} tip="ציטוט מקום — הכנס זמן לתיבת ההודעה" tipPos="up"
          onClick={quotePlace} disabled={!hasVideo} />
        <IconButton icon={MoreHorizontal} tip="עוד" tipPos="up" disabled={!hasVideo}
          onClick={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setMenu({ x: r.left, y: r.top - 8 }); }} />
        <IconButton icon={Maximize} tip="מסך מלא" tipPos="up" onClick={fullscreen} disabled={!hasVideo} />
      </div>

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}
    </div>
  );
});

export default VideoPreview;
