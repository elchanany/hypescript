"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Clip, assembledStart, assembledToSource, clipDur, totalDur } from "@/lib/editor/model";

export interface PreviewHandle {
  seek: (assembled: number) => void;
}

interface Props {
  file: File | null;
  clips: Clip[] | null; // ה-EDL; null/ריק = הסרטון המקורי
  onTime: (assembled: number) => void;
}

// נגן תצוגה מקדימה שמנגן את ה-EDL: קליפ אחרי קליפ, בסדר (כולל חזרות/סידור-מחדש),
// בלי לרנדר. כשאין EDL — מנגן את המקור.
const VideoPreview = forwardRef<PreviewHandle, Props>(function VideoPreview({ file, clips, onTime }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const idx = useRef(0);
  const [url, setUrl] = useState("");
  const [playing, setPlaying] = useState(false);

  const edl = clips && clips.length ? clips : null;

  useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  useImperativeHandle(ref, () => ({
    seek: (assembled: number) => {
      const v = videoRef.current;
      if (!v) return;
      if (edl) {
        const { index, source } = assembledToSource(edl, assembled);
        idx.current = Math.max(0, index);
        v.currentTime = source;
      } else {
        v.currentTime = assembled;
      }
    },
  }));

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    if (!edl) { onTime(v.currentTime); return; }
    let i = idx.current;
    if (i >= edl.length) { v.pause(); return; }
    if (v.currentTime >= edl[i].end - 0.03 || v.currentTime < edl[i].start - 0.3) {
      i++;
      idx.current = i;
      if (i < edl.length) { v.currentTime = edl[i].start + 0.001; }
      else { v.pause(); onTime(totalDur(edl)); return; }
    }
    const cur = edl[i];
    onTime(assembledStart(edl, i) + Math.max(0, Math.min(clipDur(cur), v.currentTime - cur.start)));
  };

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (edl && (idx.current >= edl.length || v.currentTime >= edl[Math.min(idx.current, edl.length - 1)].end)) {
        idx.current = 0; v.currentTime = edl[0].start;
      }
      v.play(); setPlaying(true);
    } else { v.pause(); setPlaying(false); }
  };

  return (
    <div className="preview">
      {url ? (
        <video ref={videoRef} src={url} className="preview-video" onTimeUpdate={onTimeUpdate}
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onClick={toggle} />
      ) : (
        <div className="preview-empty">טען סרטון כדי לראות תצוגה מקדימה</div>
      )}
      <div className="preview-bar">
        <button className="btn" onClick={toggle} disabled={!url}>{playing ? "⏸" : "▶"}</button>
        {edl ? (
          <span className="badge">{edl.length} קליפים · {totalDur(edl).toFixed(1)}s (סופי)</span>
        ) : (
          <span className="hint">מקור — צור חיתוך כדי לראות תצוגה ערוכה</span>
        )}
      </div>
    </div>
  );
});

export default VideoPreview;
