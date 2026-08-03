"use client";

import { useMemo, useRef, useState } from "react";
import { Clip, MediaAsset, assembledStart, clipDur, clipEnabled, mediaById, totalDur } from "@/lib/editor/model";
import { Sub } from "@/lib/editor/subtitlesEdl";
import { Overlay } from "@/lib/editor/overlay";
import { sortedTracks, TrackMeta, videoTrack } from "@/lib/editor/project";
import { Film, AudioLines, Captions, Layers, Lock, Unlock, Volume2, VolumeX, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { IconButton } from "@/components/ui";
import Filmstrip from "@/components/Filmstrip";
import Waveform from "@/components/Waveform";

interface Props {
  media: MediaAsset[];
  clips: Clip[];
  subs?: Sub[] | null;
  overlays?: Overlay[];
  tracks: TrackMeta[];
  maxDuration: number;
  currentAssembled: number;
  selectedId: string | null;
  selectedOverlayId?: string | null;
  zoom: number;
  snap: boolean;
  onSeek: (assembled: number) => void;
  onSelect: (id: string | null) => void;
  onSelectOverlay?: (id: string | null) => void;
  onTrimBegin: () => void;
  onTrim: (id: string, start: number, end: number) => void;
  onTrimEnd: () => void;
  onReorder: (id: string, toIndex: number) => void;
  onClipMenu: (id: string, x: number, y: number) => void;
  renameTrack: (id: string, name: string) => void;
  toggleLock: (id: string) => void;
  toggleMute: (id: string) => void;
  cycleHeight: (id: string) => void;
  reorderTrack: (id: string, dir: -1 | 1) => void;
}

// Muted, desaturated clip tones — color carries source identity, nothing more.
const SOURCE_COLORS = ["#3f5f8f", "#5b4d8a", "#8a4d68", "#8a6a3f", "#3f7d72", "#6f7a3f"];
const TYPE_ICON = { video: Film, audio: AudioLines, caption: Captions } as const;

export default function Timeline(p: Props) {
  const { media, clips, subs, overlays = [], tracks, currentAssembled, selectedId, selectedOverlayId, zoom, snap } = p;
  const laneRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragLabel, setDragLabel] = useState<{ name: string; dur: number } | null>(null);
  const drag = useRef<{ mode: "move" | "l" | "r"; id: string; x0: number; laneW: number; s0: number; e0: number; moved: boolean; px: number } | null>(null);

  const colorOf = (sourceId: string) => SOURCE_COLORS[Math.max(0, media.findIndex((m) => m.id === sourceId)) % SOURCE_COLORS.length];
  const total = Math.max(0.001, p.maxDuration || totalDur(clips));
  const pct = (t: number) => (t / total) * 100;
  const ordered = sortedTracks(tracks);
  const vTrack = videoTrack(tracks);
  const vLocked = !!vTrack?.locked;

  // snap targets in assembled time: clip boundaries + playhead.
  const snapPts = useMemo(() => {
    const pts = [0, total];
    let acc = 0;
    for (const c of clips) { pts.push(acc); acc += clipDur(c); pts.push(acc); }
    return pts;
  }, [clips, total]);
  const applySnap = (t: number) => {
    if (!snap) return t;
    const thresh = total * 0.012;
    let best = t, bd = thresh;
    for (const s of snapPts) { const d = Math.abs(s - t); if (d < bd) { bd = d; best = s; } }
    return best;
  };

  const ticks = useMemo(() => {
    const target = 6 + zoom * 3;
    const raw = total / target;
    const steps = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
    const step = steps.find((s) => s >= raw) || 600;
    const out: number[] = [];
    for (let t = 0; t <= total + 0.001; t += step) out.push(t);
    return { out, step };
  }, [total, zoom]);
  const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

  // target insertion index for a pointer x (px, client coords) over the video lane
  const dropTarget = (clientX: number): { index: number; boundary: number } => {
    const rect = laneRef.current!.getBoundingClientRect();
    const t = ((clientX - rect.left) / rect.width) * total;
    let acc = 0, index = clips.length;
    for (let i = 0; i < clips.length; i++) { const mid = acc + clipDur(clips[i]) / 2; if (t < mid) { index = i; break; } acc += clipDur(clips[i]); }
    return { index, boundary: assembledStart(clips, index) };
  };

  const onDown = (e: React.MouseEvent, clip: Clip, mode: "move" | "l" | "r") => {
    if (vLocked) return;
    e.stopPropagation();
    drag.current = { mode, id: clip.id, x0: e.clientX, laneW: laneRef.current?.clientWidth || 1, s0: clip.start, e0: clip.end, moved: false, px: e.clientX };
    if (mode === "move") { const a = mediaById(media, clip.sourceId); setDragLabel({ name: (a?.name || "").replace(/\.[^.]+$/, "") || "קטע", dur: clipDur(clip) }); }
    if (mode === "l" || mode === "r") p.onTrimBegin();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  const onMove = (e: MouseEvent) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.x0; d.px = e.clientX;
    if (Math.abs(dx) > 3) d.moved = true;
    const dt = (dx / d.laneW) * total;
    if (d.mode === "l") p.onTrim(d.id, d.s0 + dt, d.e0);
    else if (d.mode === "r") p.onTrim(d.id, d.s0, d.e0 + dt);
    else if (d.mode === "move" && d.moved) {
      // ghost + drop indicator updated imperatively (no React render per mouse move)
      const g = ghostRef.current;
      if (g) { g.style.display = "flex"; g.style.left = `${e.clientX + 12}px`; g.style.top = `${e.clientY + 14}px`; }
      const drop = dropRef.current;
      if (drop && laneRef.current) { const { boundary } = dropTarget(e.clientX); drop.style.display = "block"; drop.style.left = `${pct(boundary)}%`; }
    }
  };
  const endDragVisuals = () => {
    if (ghostRef.current) ghostRef.current.style.display = "none";
    if (dropRef.current) dropRef.current.style.display = "none";
  };
  const onUp = () => {
    const d = drag.current;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    endDragVisuals();
    if (!d) { drag.current = null; return; }
    if (d.mode === "l" || d.mode === "r") p.onTrimEnd();
    else if (d.mode === "move") {
      if (!d.moved) p.onSelect(d.id);
      else p.onReorder(d.id, dropTarget(d.px).index);
    }
    drag.current = null;
  };

  const seekFromRow = (e: React.MouseEvent, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    p.onSeek(applySnap(Math.max(0, Math.min(total, ((e.clientX - rect.left) / rect.width) * total))));
  };

  const Playhead = () => <div className="playhead2" style={{ left: `${pct(currentAssembled)}%` }} />;
  const Grid = () => (<>{ticks.out.map((t) => <div key={t} className="tl-gridline" style={{ left: `${pct(t)}%` }} />)}</>);

  return (
    <div className="tl-scroll">
      <div className="tl-ghost" ref={ghostRef}>
        <span className="g-name">{dragLabel?.name}</span>
        <span className="g-dur">{dragLabel ? `${dragLabel.dur.toFixed(1)}s` : ""}</span>
      </div>
      <div className="tl-inner" style={{ width: `${Math.max(1, zoom) * 100}%` }}>
        {/* ruler */}
        <div className="tl-rowline tl-rulerline">
          <div className="tl-corner2" />
          <div className="tl-ruler2" onClick={(e) => seekFromRow(e, e.currentTarget)}>
            {ticks.out.map((t) => (
              <div key={t} className="tl-tick2" style={{ left: `${pct(t)}%` }}><span>{fmt(t)}</span></div>
            ))}
            <Playhead />
          </div>
        </div>

        {ordered.map((track) => {
          const TypeIcon = TYPE_ICON[track.type];
          return (
            <div className="tl-rowline" key={track.id} style={{ height: track.height }}>
              <div className="tl-head2">
                <div className="hd-top">
                  <TypeIcon className="hd-type" size={14} strokeWidth={1.75} />
                  <span className="hd-name" title="לחיצה כפולה לשינוי שם"
                    onDoubleClick={() => { const n = prompt("שם הרצועה:", track.name); if (n) p.renameTrack(track.id, n); }}>
                    {track.name}
                  </span>
                </div>
                <div className="hd-ctrls">
                  <IconButton icon={ChevronUp} tip="העבר למעלה" tipPos="up" onClick={() => p.reorderTrack(track.id, -1)} />
                  <IconButton icon={ChevronDown} tip="העבר למטה" tipPos="up" onClick={() => p.reorderTrack(track.id, 1)} />
                  <IconButton icon={ChevronsUpDown} tip="גובה רצועה" tipPos="up" onClick={() => p.cycleHeight(track.id)} />
                  {track.type === "audio" && (
                    <IconButton icon={track.muted ? VolumeX : Volume2} tip={track.muted ? "בטל השתקה" : "השתק"} tipPos="up"
                      active={track.muted} onClick={() => p.toggleMute(track.id)} />
                  )}
                  <IconButton icon={track.locked ? Lock : Unlock} tip={track.locked ? "שחרר נעילה" : "נעל"} tipPos="up"
                    active={track.locked} onClick={() => p.toggleLock(track.id)} />
                </div>
              </div>

              {track.type === "video" && (
                <div className="tl-lane2" ref={laneRef}
                  onClick={(e) => { if (!drag.current) { p.onSelect(null); seekFromRow(e, e.currentTarget); } }}>
                  <Grid />
                  {clips.map((c, i) => {
                    const asset = mediaById(media, c.sourceId);
                    const short = (asset?.name || "").replace(/\.[^.]+$/, "");
                    const thumbH = Math.max(28, track.height - 8);
                    return (
                      <div key={c.id}
                        className={`clip2 ${c.id === selectedId ? "selected" : ""} ${clipEnabled(c) ? "" : "disabled"} ${vLocked ? "locked" : ""}`}
                        style={{ left: `${pct(assembledStart(clips, i))}%`, width: `${pct(clipDur(c))}%` }}
                        onMouseDown={(e) => onDown(e, c, "move")}
                        onContextMenu={(e) => { e.preventDefault(); p.onSelect(c.id); p.onClipMenu(c.id, e.clientX, e.clientY); }}
                        title={`${short} · ${clipDur(c).toFixed(1)}s`}>
                        <div className="clip-fill" style={{ background: colorOf(c.sourceId) }} />
                        {asset?.kind === "video" && <Filmstrip file={asset.file} sourceIn={c.start} sourceOut={c.end} height={thumbH} />}
                        {asset?.kind === "image" && <img className="clip-image" src={asset.url} alt="" draggable={false} />}
                        <span className="clip-accent" style={{ background: colorOf(c.sourceId) }} />
                        {!vLocked && <span className="trim l" onMouseDown={(e) => onDown(e, c, "l")} />}
                        <span className="clip-label"><span>{short || `קטע ${i + 1}`}</span><span className="cl-dur">{clipDur(c).toFixed(1)}s</span></span>
                        {!vLocked && <span className="trim r" onMouseDown={(e) => onDown(e, c, "r")} />}
                      </div>
                    );
                  })}
                  <div className="tl-drop" ref={dropRef} />
                  <Playhead />
                </div>
              )}

              {track.type === "audio" && (
                <div className={`tl-lane2 ${track.muted ? "muted" : ""}`} onClick={(e) => seekFromRow(e, e.currentTarget)}>
                  <Grid />
                  {clips.map((c, i) => {
                    const asset = mediaById(media, c.sourceId);
                    return (
                      <div key={c.id} className="clip-audio" style={{ left: `${pct(assembledStart(clips, i))}%`, width: `${pct(clipDur(c))}%` }}>
                        {asset && (asset.kind === "video" || asset.kind === "audio") && (
                          <Waveform file={asset.file} sourceIn={c.start} sourceOut={c.end} />
                        )}
                      </div>
                    );
                  })}
                  <Playhead />
                </div>
              )}

              {track.type === "caption" && (
                <div className="tl-lane2" onClick={(e) => seekFromRow(e, e.currentTarget)}>
                  <Grid />
                  {(subs || []).map((s) => (
                    <div key={s.id} className="cue2" style={{ left: `${pct(s.start)}%`, width: `${Math.max(0.4, pct(s.end - s.start))}%` }} title={s.text}>
                      <span className="cue-txt">{s.text}</span>
                    </div>
                  ))}
                  <Playhead />
                </div>
              )}
            </div>
          );
        })}

        {/* Overlay lane — visual track for image/text layers (not a TrackMeta type yet) */}
        <div className="tl-rowline" style={{ height: 40 }}>
          <div className="tl-head2">
            <div className="hd-top">
              <Layers className="hd-type" size={14} strokeWidth={1.75} />
              <span className="hd-name">שכבות</span>
            </div>
          </div>
          <div className="tl-lane2" onClick={(e) => { p.onSelectOverlay?.(null); seekFromRow(e, e.currentTarget); }}>
            <Grid />
            {overlays.map((o) => {
              const asset = o.assetId ? mediaById(media, o.assetId) : undefined;
              const label = o.kind === "text" ? (o.text || "טקסט") : ((asset?.name || "").replace(/\.[^.]+$/, "") || "תמונה");
              const dur = Math.max(0.05, o.end - o.start);
              return (
                <div key={o.id}
                  className={`clip-ov ${o.id === selectedOverlayId ? "selected" : ""} ${o.hidden ? "disabled" : ""}`}
                  style={{ left: `${pct(o.start)}%`, width: `${Math.max(0.4, pct(dur))}%` }}
                  title={`${label} · ${dur.toFixed(1)}s`}
                  onClick={(e) => { e.stopPropagation(); p.onSelectOverlay?.(o.id); }}>
                  <span className="clip-label"><span>{label}</span><span className="cl-dur">{dur.toFixed(1)}s</span></span>
                </div>
              );
            })}
            <Playhead />
          </div>
        </div>
      </div>
    </div>
  );
}
