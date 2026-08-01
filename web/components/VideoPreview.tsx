"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { KeepInterval } from "@/lib/models";
import { removedIntervals } from "@/lib/editing";

export interface PreviewHandle {
  seek: (t: number) => void;
}

interface Props {
  file: File | null;
  duration: number;
  keeps: KeepInterval[] | null;
  onTime: (t: number) => void;
}

// נגן תצוגה מקדימה עם "השמעה ערוכה": מדלג על הקטעים שהוסרו בזמן אמת,
// כך שרואים את התוצאה בלי לרנדר.
const VideoPreview = forwardRef<PreviewHandle, Props>(function VideoPreview(
  { file, duration, keeps, onTime },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState<string>("");
  const [playing, setPlaying] = useState(false);
  const [edited, setEdited] = useState(true);

  const removed = useMemo(
    () => (keeps && keeps.length ? removedIntervals(keeps, duration) : []),
    [keeps, duration],
  );

  useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  useImperativeHandle(ref, () => ({
    seek: (t: number) => {
      if (videoRef.current) videoRef.current.currentTime = t;
    },
  }));

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    let t = v.currentTime;
    if (edited && removed.length) {
      const seg = removed.find((r) => t >= r[0] - 0.02 && t < r[1]);
      if (seg) {
        v.currentTime = seg[1] + 0.001;
        t = seg[1];
      }
    }
    onTime(t);
  };

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };

  return (
    <div className="preview">
      {url ? (
        <video
          ref={videoRef}
          src={url}
          className="preview-video"
          onTimeUpdate={onTimeUpdate}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onClick={toggle}
        />
      ) : (
        <div className="preview-empty">טען סרטון כדי לראות תצוגה מקדימה</div>
      )}
      <div className="preview-bar">
        <button className="btn" onClick={toggle} disabled={!url}>{playing ? "⏸" : "▶"}</button>
        <label className="check" title="דלג על הקטעים שהוסרו">
          <input type="checkbox" checked={edited} onChange={(e) => setEdited(e.target.checked)} />
          תצוגה ערוכה
        </label>
        {keeps && keeps.length > 0 && <span className="badge">{keeps.length} קטעים · {removed.length} חיתוכים</span>}
      </div>
    </div>
  );
});

export default VideoPreview;
