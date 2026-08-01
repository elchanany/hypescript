"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Clip, MediaAsset, assembledStart, assembledToSource, clipDur, totalDur } from "@/lib/editor/model";

export interface PreviewHandle { seek: (assembled: number) => void; }

interface Props {
  media: MediaAsset[];
  clips: Clip[] | null;
  onTime: (assembled: number) => void;
}

// תצוגה מקדימה רב-מקורית: מנגנת את ה-EDL קליפ-אחרי-קליפ, מחליפה מקור לפי הצורך
// (סדר/חזרות נתמכים). קליפי תמונה/שמע מדולגים בתצוגה (יופיעו ברינדור בהמשך).
const VideoPreview = forwardRef<PreviewHandle, Props>(function VideoPreview({ media, clips, onTime }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const idx = useRef(0);
  const loaded = useRef<string | null>(null);
  const pending = useRef<{ t: number; play: boolean } | null>(null);
  const [playing, setPlaying] = useState(false);

  const edl = clips && clips.length ? clips : null;
  const byId = (id: string) => media.find((m) => m.id === id);
  const firstVid = media.find((m) => m.kind === "video");

  const ensure = (sourceId: string, t: number, play: boolean) => {
    const v = videoRef.current; if (!v) return;
    const asset = byId(sourceId); if (!asset || asset.kind !== "video") return;
    if (loaded.current === sourceId) { v.currentTime = t; if (play) v.play(); return; }
    loaded.current = sourceId; pending.current = { t, play }; v.src = asset.url; v.load();
  };

  // טעינת מקור ראשוני כשאין EDL
  useEffect(() => {
    const v = videoRef.current;
    if (!v || edl) return;
    if (firstVid && loaded.current !== firstVid.id) { loaded.current = firstVid.id; v.src = firstVid.url; v.load(); }
  }, [media, edl]);

  useImperativeHandle(ref, () => ({
    seek: (assembled: number) => {
      const v = videoRef.current; if (!v) return;
      if (edl) { const { index, source } = assembledToSource(edl, assembled); idx.current = Math.max(0, index); ensure(edl[idx.current].sourceId, source, false); }
      else v.currentTime = assembled;
    },
  }));

  const onLoaded = () => {
    const p = pending.current; const v = videoRef.current;
    if (p && v) { v.currentTime = p.t; if (p.play) { v.play(); setPlaying(true); } pending.current = null; }
  };

  const onTimeUpdate = () => {
    const v = videoRef.current; if (!v) return;
    if (!edl) { onTime(v.currentTime); return; }
    let i = idx.current;
    if (i >= edl.length) { v.pause(); return; }
    if (v.currentTime >= edl[i].end - 0.03) {
      // התקדם לקליפ-וידאו הבא (דלג על תמונה/שמע)
      do { i++; } while (i < edl.length && byId(edl[i].sourceId)?.kind !== "video");
      idx.current = i;
      if (i >= edl.length) { v.pause(); onTime(totalDur(edl)); return; }
      ensure(edl[i].sourceId, edl[i].start + 0.001, true);
      return;
    }
    onTime(assembledStart(edl, i) + Math.max(0, Math.min(clipDur(edl[i]), v.currentTime - edl[i].start)));
  };

  const toggle = () => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) {
      if (edl && (idx.current >= edl.length)) idx.current = 0;
      if (edl) ensure(edl[idx.current].sourceId, edl[idx.current].start, true);
      else { v.play(); setPlaying(true); }
    } else { v.pause(); setPlaying(false); }
  };

  const hasVideo = !!firstVid;
  return (
    <div className="preview">
      {hasVideo ? (
        <video ref={videoRef} className="preview-video" onTimeUpdate={onTimeUpdate} onLoadedData={onLoaded}
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onClick={toggle} />
      ) : (
        <div className="preview-empty">טען סרטון כדי לראות תצוגה מקדימה</div>
      )}
      <div className="preview-bar">
        <button className="btn" onClick={toggle} disabled={!hasVideo}>{playing ? "⏸" : "▶"}</button>
        {edl ? <span className="badge">{edl.length} קליפים · {totalDur(edl).toFixed(1)}s (סופי)</span>
          : <span className="hint">מקור — צור חיתוך לתצוגה ערוכה</span>}
      </div>
    </div>
  );
});

export default VideoPreview;
