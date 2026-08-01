"use client";

// Inspector תלוי-הקשר: מציג ועורך את מאפייני הקליפ הנבחר. כל שינוי מעדכן את
// ה-State האמיתי (דרך onUpdate -> useEditor -> History), מופיע ב-Timeline ומשפיע
// על הנגן/הייצוא. מוצגים רק מאפיינים שעובדים בפועל במנוע הנוכחי.

import { Clip, clipEnabled, clipVolume } from "@/lib/editor/model";
import { formatTimecode } from "@/lib/editor/time";

interface Props {
  clip: Clip;
  assetName: string;
  assetKind: "video" | "image" | "audio";
  assetDuration: number;
  trackName: string;
  timelineStart: number;
  onUpdate: (patch: Partial<Clip>) => void;
}

export default function Inspector({ clip, assetName, assetKind, assetDuration, trackName, timelineStart, onUpdate }: Props) {
  const dur = Math.max(0, clip.end - clip.start);
  const setIn = (v: number) => onUpdate({ start: Math.max(0, Math.min(v, clip.end - 0.05)) });
  const setOut = (v: number) => onUpdate({ end: Math.min(assetDuration || v, Math.max(v, clip.start + 0.05)) });

  return (
    <div className="inspector">
      <div className="insp-head">Inspector</div>

      <div className="insp-section">
        <div className="insp-row"><span>מקור</span><b title={assetName}>{assetName}</b></div>
        <div className="insp-row"><span>רצועה</span><b>{trackName}</b></div>
        <label className="insp-check">
          <input type="checkbox" checked={clipEnabled(clip)} onChange={(e) => onUpdate({ enabled: e.target.checked })} />
          פעיל (נכלל בייצוא ובנגן)
        </label>
      </div>

      <div className="insp-section">
        <div className="insp-row"><span>מיקום בציר</span><b className="mono">{formatTimecode(timelineStart)}</b></div>
        <label className="insp-field">
          <span>Source In (שנ')</span>
          <input type="number" step={0.05} min={0} max={clip.end} value={+clip.start.toFixed(3)} onChange={(e) => setIn(+e.target.value)} />
        </label>
        <label className="insp-field">
          <span>Source Out (שנ')</span>
          <input type="number" step={0.05} min={clip.start} max={assetDuration || undefined} value={+clip.end.toFixed(3)} onChange={(e) => setOut(+e.target.value)} />
        </label>
        <div className="insp-row"><span>משך</span><b className="mono">{dur.toFixed(2)}s</b></div>
      </div>

      {assetKind !== "image" && (
        <div className="insp-section">
          <label className="insp-field">
            <span>עוצמת שמע (ייצוא): {Math.round(clipVolume(clip) * 100)}%</span>
            <input type="range" min={0} max={2} step={0.05} value={clipVolume(clip)} onChange={(e) => onUpdate({ volume: +e.target.value })} />
          </label>
        </div>
      )}
    </div>
  );
}
