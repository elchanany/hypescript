"use client";

import { useMemo, useRef } from "react";
import { Clip, MediaAsset, assembledStart, clipDur, clipEnabled, totalDur } from "@/lib/editor/model";
import { Sub } from "@/lib/editor/subtitlesEdl";
import { sortedTracks, TrackMeta, videoTrack } from "@/lib/editor/project";

interface Props {
  media: MediaAsset[];
  clips: Clip[];
  subs?: Sub[] | null;
  tracks: TrackMeta[];
  maxDuration: number;
  currentAssembled: number;
  selectedId: string | null;
  onSeek: (assembled: number) => void;
  onSelect: (id: string | null) => void;
  onTrimBegin: () => void;
  onTrim: (id: string, start: number, end: number) => void;
  onTrimEnd: () => void;
  onReorder: (id: string, toIndex: number) => void;
  renameTrack: (id: string, name: string) => void;
  toggleLock: (id: string) => void;
  toggleMute: (id: string) => void;
  cycleHeight: (id: string) => void;
  reorderTrack: (id: string, dir: -1 | 1) => void;
}

const SOURCE_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#14b8a6", "#eab308"];

export default function Timeline(p: Props) {
  const { media, clips, subs, tracks, maxDuration, currentAssembled, selectedId } = p;
  const laneRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: "move" | "l" | "r"; id: string; x0: number; laneW: number; s0: number; e0: number; moved: boolean; px: number } | null>(null);

  const colorOf = (sourceId: string) => SOURCE_COLORS[Math.max(0, media.findIndex((m) => m.id === sourceId)) % SOURCE_COLORS.length];
  const total = Math.max(0.001, totalDur(clips));
  const pct = (t: number) => (t / total) * 100;
  const ordered = sortedTracks(tracks);
  const vTrack = videoTrack(tracks);
  const vLocked = !!vTrack?.locked;

  const ticks = useMemo(() => {
    const step = total > 300 ? 60 : total > 60 ? 15 : 5;
    const out: number[] = [];
    for (let t = 0; t <= total; t += step) out.push(t);
    return out;
  }, [total]);
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
    p.onSeek(Math.max(0, Math.min(total, ((e.clientX - rect.left) / rect.width) * total)));
  };

  const Playhead = () => <div className="tl-playhead" style={{ left: `${pct(currentAssembled)}%` }} />;

  return (
    <div className="timeline" dir="ltr">
      <div className="tl-row tl-ruler-row">
        <div className="tl-corner" />
        <div className="tl-ruler" onClick={(e) => seekFromRow(e, e.currentTarget)}>
          {ticks.map((t) => (<span key={t} className="tl-tick" style={{ left: `${pct(t)}%` }}>{fmt(t)}</span>))}
          <Playhead />
        </div>
      </div>

      {ordered.map((track) => (
        <div className="tl-row" key={track.id} style={{ height: track.height }}>
          <div className={`tl-header ${track.type}`}>
            <span className="th-name" title="לחיצה כפולה לשינוי שם" onDoubleClick={() => { const n = prompt("שם הרצועה:", track.name); if (n) p.renameTrack(track.id, n); }}>{track.name}</span>
            <span className="th-ctrls">
              <button className="th-btn" onClick={() => p.reorderTrack(track.id, -1)} title="למעלה">▲</button>
              <button className="th-btn" onClick={() => p.reorderTrack(track.id, 1)} title="למטה">▼</button>
              <button className="th-btn" onClick={() => p.cycleHeight(track.id)} title="גובה">⬍</button>
              {track.type === "audio" && (
                <button className={`th-btn ${track.muted ? "on" : ""}`} onClick={() => p.toggleMute(track.id)} title="השתקה">{track.muted ? "🔇" : "🔊"}</button>
              )}
              <button className={`th-btn ${track.locked ? "on" : ""}`} onClick={() => p.toggleLock(track.id)} title="נעילה">{track.locked ? "🔒" : "🔓"}</button>
            </span>
          </div>

          {track.type === "video" && (
            <div className="tl-lane" ref={laneRef} onClick={(e) => { if (!drag.current) { p.onSelect(null); seekFromRow(e, e.currentTarget); } }}>
              {clips.map((c, i) => (
                <div key={c.id}
                  className={`tl-clip clip-int ${c.id === selectedId ? "sel" : ""} ${clipEnabled(c) ? "" : "disabled"} ${vLocked ? "locked" : ""}`}
                  style={{ left: `${pct(assembledStart(clips, i))}%`, width: `${pct(clipDur(c))}%`, background: colorOf(c.sourceId) }}
                  onMouseDown={(e) => onDown(e, c, "move")}
                  title={`${c.start.toFixed(1)}–${c.end.toFixed(1)}s`}>
                  {!vLocked && <span className="tl-handle l" onMouseDown={(e) => onDown(e, c, "l")} />}
                  <span className="tl-clip-label">{i + 1}</span>
                  {!vLocked && <span className="tl-handle r" onMouseDown={(e) => onDown(e, c, "r")} />}
                </div>
              ))}
              <Playhead />
            </div>
          )}

          {track.type === "audio" && (
            <div className={`tl-lane ${track.muted ? "muted" : ""}`} onClick={(e) => seekFromRow(e, e.currentTarget)}>
              {clips.map((c, i) => (
                <div key={c.id} className="tl-clip audio" style={{ left: `${pct(assembledStart(clips, i))}%`, width: `${pct(clipDur(c))}%` }} />
              ))}
              <Playhead />
            </div>
          )}

          {track.type === "caption" && (
            <div className="tl-lane" onClick={(e) => seekFromRow(e, e.currentTarget)}>
              {(subs || []).map((s) => (
                <div key={s.id} className="tl-cue" style={{ left: `${pct(s.start)}%`, width: `${Math.max(0.4, pct(s.end - s.start))}%` }} title={s.text} />
              ))}
              <Playhead />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
