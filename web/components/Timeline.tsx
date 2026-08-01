"use client";

import { useMemo, useRef } from "react";
import { Clip, MediaAsset, assembledStart, clipDur, totalDur } from "@/lib/editor/model";
import { Sub } from "@/lib/editor/subtitlesEdl";

interface Props {
  media: MediaAsset[];
  clips: Clip[];
  subs?: Sub[] | null;
  maxDuration: number; // אורך המקור (לחסימת טרים)
  currentAssembled: number;
  selectedId: string | null;
  onSeek: (assembled: number) => void;
  onSelect: (id: string | null) => void;
  onTrim: (id: string, start: number, end: number) => void;
  onReorder: (id: string, toIndex: number) => void;
}

const SOURCE_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#14b8a6", "#eab308"];

// ציר-זמן אינטראקטיבי בסגנון CapCut: גרירה לסידור-מחדש + ידיות טרים, חי.
// פנימית LTR (זמן משמאל לימין) כדי לפשט את חשבון הפיקסלים.
export default function Timeline({
  media, clips, subs, maxDuration, currentAssembled, selectedId, onSeek, onSelect, onTrim, onReorder,
}: Props) {
  const colorOf = (sourceId: string) => {
    const i = media.findIndex((m) => m.id === sourceId);
    return SOURCE_COLORS[(i < 0 ? 0 : i) % SOURCE_COLORS.length];
  };
  const laneRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: "move" | "l" | "r"; id: string; x0: number; laneW: number; s0: number; e0: number; moved: boolean; px: number } | null>(null);

  const total = Math.max(0.001, totalDur(clips));
  const pct = (t: number) => (t / total) * 100;
  const ticks = useMemo(() => {
    const step = total > 300 ? 60 : total > 60 ? 15 : 5;
    const out: number[] = [];
    for (let t = 0; t <= total; t += step) out.push(t);
    return out;
  }, [total]);
  const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

  const laneW = () => laneRef.current?.clientWidth || 1;

  const onDown = (e: React.MouseEvent, clip: Clip, mode: "move" | "l" | "r") => {
    e.stopPropagation();
    drag.current = { mode, id: clip.id, x0: e.clientX, laneW: laneW(), s0: clip.start, e0: clip.end, moved: false, px: e.clientX };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const onMove = (e: MouseEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x0;
    d.px = e.clientX;
    if (Math.abs(dx) > 3) d.moved = true;
    const dt = (dx / d.laneW) * total; // שניות
    if (d.mode === "l") onTrim(d.id, d.s0 + dt, d.e0);
    else if (d.mode === "r") onTrim(d.id, d.s0, d.e0 + dt);
  };

  const onUp = () => {
    const d = drag.current;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    if (!d) return;
    if (d.mode === "move") {
      if (!d.moved) { onSelect(d.id); }
      else {
        // אינדקס יעד לפי מיקום המצביע ביחס לגבולות הקליפים
        const rect = laneRef.current!.getBoundingClientRect();
        const x = d.px - rect.left;
        const t = (x / rect.width) * total;
        let acc = 0, target = clips.length;
        for (let i = 0; i < clips.length; i++) {
          const mid = acc + clipDur(clips[i]) / 2;
          if (t < mid) { target = i; break; }
          acc += clipDur(clips[i]);
        }
        onReorder(d.id, target);
      }
    }
    drag.current = null;
  };

  const seekFromLane = (e: React.MouseEvent) => {
    if (drag.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(total, ((e.clientX - rect.left) / rect.width) * total)));
  };

  return (
    <div className="timeline" dir="ltr">
      <div className="tl-ruler" onClick={seekFromLane}>
        {ticks.map((t) => (<span key={t} className="tl-tick" style={{ left: `${pct(t)}%` }}>{fmt(t)}</span>))}
        <div className="tl-playhead" style={{ left: `${pct(currentAssembled)}%` }} />
      </div>

      <div className="tl-track">
        <div className="tl-label" style={{ color: "#3b82f6" }}>וידאו</div>
        <div className="tl-lane" ref={laneRef} onClick={(e) => { if (!drag.current) onSelect(null); seekFromLane(e); }}>
          {clips.map((c, i) => (
            <div
              key={c.id}
              className={`tl-clip clip-int ${c.id === selectedId ? "sel" : ""}`}
              style={{ left: `${pct(assembledStart(clips, i))}%`, width: `${pct(clipDur(c))}%`, background: colorOf(c.sourceId) }}
              onMouseDown={(e) => onDown(e, c, "move")}
              title={`${c.start.toFixed(1)}–${c.end.toFixed(1)}s`}
            >
              <span className="tl-handle l" onMouseDown={(e) => onDown(e, c, "l")} />
              <span className="tl-clip-label">{i + 1}</span>
              <span className="tl-handle r" onMouseDown={(e) => onDown(e, c, "r")} />
            </div>
          ))}
          <div className="tl-playhead" style={{ left: `${pct(currentAssembled)}%` }} />
        </div>
      </div>

      <div className="tl-track">
        <div className="tl-label" style={{ color: "#22c55e" }}>אודיו</div>
        <div className="tl-lane" onClick={seekFromLane}>
          {clips.map((c, i) => (
            <div key={c.id} className="tl-clip audio" style={{ left: `${pct(assembledStart(clips, i))}%`, width: `${pct(clipDur(c))}%` }} />
          ))}
          <div className="tl-playhead" style={{ left: `${pct(currentAssembled)}%` }} />
        </div>
      </div>

      {subs && subs.length > 0 && (
        <div className="tl-track">
          <div className="tl-label" style={{ color: "#a855f7" }}>כתוביות</div>
          <div className="tl-lane" onClick={seekFromLane}>
            {subs.map((s) => (
              <div key={s.id} className="tl-cue" style={{ left: `${pct(s.start)}%`, width: `${Math.max(0.4, pct(s.end - s.start))}%` }} title={s.text} />
            ))}
            <div className="tl-playhead" style={{ left: `${pct(currentAssembled)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
