"use client";

import { useMemo } from "react";
import { KeepInterval } from "@/lib/models";
import { Cue } from "@/lib/subtitles";

interface Props {
  duration: number;
  keeps: KeepInterval[] | null;
  cues: Cue[];
  currentTime: number;
  onSeek: (t: number) => void;
}

// ציר-זמן רב-מסלולי בסגנון CapCut (פאזה 1: תצוגה + seek; עריכת-גרירה בהמשך).
export default function Timeline({ duration, keeps, cues, currentTime, onSeek }: Props) {
  const pct = (t: number) => (duration ? (t / duration) * 100 : 0);
  const clips = useMemo<KeepInterval[]>(
    () => (keeps && keeps.length ? keeps : duration ? [{ start: 0, end: duration }] : []),
    [keeps, duration],
  );

  const seekFromEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // RTL: קצה ימני = 0. מחשבים לפי מרחק מימין.
    const x = rect.right - e.clientX;
    onSeek(Math.max(0, Math.min(duration, (x / rect.width) * duration)));
  };

  const ticks = useMemo(() => {
    if (!duration) return [];
    const step = duration > 300 ? 60 : duration > 60 ? 15 : 5;
    const out: number[] = [];
    for (let t = 0; t <= duration; t += step) out.push(t);
    return out;
  }, [duration]);

  const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

  return (
    <div className="timeline">
      <div className="tl-ruler" onClick={seekFromEvent}>
        {ticks.map((t) => (
          <span key={t} className="tl-tick" style={{ right: `${pct(t)}%` }}>{fmt(t)}</span>
        ))}
        <div className="tl-playhead" style={{ right: `${pct(currentTime)}%` }} />
      </div>

      <Track label="וידאו" color="#3b82f6" onClick={seekFromEvent}>
        {clips.map((c, i) => (
          <div key={i} className="tl-clip" style={{ right: `${pct(c.start)}%`, width: `${pct(c.end - c.start)}%`, background: "#3b82f6" }} />
        ))}
        <div className="tl-playhead" style={{ right: `${pct(currentTime)}%` }} />
      </Track>

      <Track label="אודיו" color="#22c55e" onClick={seekFromEvent}>
        {clips.map((c, i) => (
          <div key={i} className="tl-clip audio" style={{ right: `${pct(c.start)}%`, width: `${pct(c.end - c.start)}%` }} />
        ))}
        <div className="tl-playhead" style={{ right: `${pct(currentTime)}%` }} />
      </Track>

      <Track label="כתוביות" color="#8b5cf6" onClick={seekFromEvent}>
        {cues.map((cue, i) => (
          <div key={i} className="tl-cue" style={{ right: `${pct(cue.start)}%`, width: `${Math.max(0.5, pct(cue.end - cue.start))}%` }} title={cue.text} />
        ))}
        <div className="tl-playhead" style={{ right: `${pct(currentTime)}%` }} />
      </Track>
    </div>
  );
}

function Track({ label, color, children, onClick }: { label: string; color: string; children: React.ReactNode; onClick: (e: React.MouseEvent<HTMLDivElement>) => void }) {
  return (
    <div className="tl-track">
      <div className="tl-label" style={{ color }}>{label}</div>
      <div className="tl-lane" onClick={onClick}>{children}</div>
    </div>
  );
}
