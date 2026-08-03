"use client";

import { useMemo, useRef } from "react";
import { Clip, MediaAsset, assembledStart, clipDur, clipEnabled, mediaById, totalDur } from "@/lib/editor/model";
import { Sub } from "@/lib/editor/subtitlesEdl";
import { sortedTracks, TrackMeta, videoTrack } from "@/lib/editor/project";
import { Film, AudioLines, Captions, Lock, Unlock, Volume2, VolumeX, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { IconButton } from "@/components/ui";
import Filmstrip from "@/components/Filmstrip";
import Waveform from "@/components/Waveform";

interface Props {
  media: MediaAsset[];
  clips: Clip[];
  subs?: Sub[] | null;
  tracks: TrackMeta[];
  maxDuration: number;
  currentAssembled: number;
  selectedId: string | null;
  zoom: number;
  snap: boolean;
  onSeek: (assembled: number) => void;
  onSelect: (id: string | null) => void;
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
  const { media, clips, subs, tracks, currentAssembled, selectedId, zoom, snap } = p;
  const laneRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: "move" | "l" | "r"; id: string; x0: number; laneW: number; s0: number; e0: number; moved: boolean; px: number } | null>(null);

  const colorOf = (sourceId: string) => SOURCE_COLORS[Math.max(0, media.findIndex((m) => m.id === sourceId)) % SOURCE_COLORS.length];
  const total = Math.max(0.001, totalDur(clips));
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

  const onDown = (e: React.MouseEvent, clip: Clip, mode: "move" | "l" | "r") => {
    if (vLocked) return;
    e.stopPropagation();
    drag.current = { mode, id: clip.id, x0: e.clientX, laneW: laneRef.current?.clientWidth || 1, s0: clip.start, e0: clip.end, moved: false, px: e.clientX };
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
  };
  const onUp = () => {
    const d = drag.current;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    if (!d) return;
    if (d.mode === "l" || d.mode === "r") p.onTrimEnd();
    else if (d.mode === "move") {
      if (!d.moved) p.onSelect(d.id);
      else {
        const rect = laneRef.current!.getBoundingClientRect();
        const t = ((d.px - rect.left) / rect.width) * total;
        let acc = 0, target = clips.length;
        for (let i = 0; i < clips.length; i++) { const mid = acc + clipDur(clips[i]) / 2; if (t < mid) { target = i; break; } acc += clipDur(clips[i]); }
        p.onReorder(d.id, target);
      }
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
                    <div key={s.id} className="cue2" style={{ left: `${pct(s.start)}%`, width: `${Math.max(0.4, pct(s.end - s.start))}%` }} title={s.text} />
                  ))}
                  <Playhead />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
