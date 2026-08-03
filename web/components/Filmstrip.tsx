"use client";

// Real filmstrip for a video clip's [sourceIn, sourceOut] window. Frames are captured from
// a hidden <video> (cached in lib/media/thumbnails) and laid out across the clip width.
// Thumbnail count follows the rendered width; frames fill in as they resolve.
import { memo, useEffect, useRef, useState } from "react";
import { filmstripCount, thumbTimes } from "@/lib/media/thumbnails";

const THUMB_W = 46; // target px per thumbnail

function Filmstrip({ file, sourceIn, sourceOut, height = 44 }: {
  file: File; sourceIn: number; sourceOut: number; height?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [urls, setUrls] = useState<(string | null)[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const el = wrapRef.current;
    const width = el?.clientWidth || 0;
    const count = filmstripCount(width, THUMB_W);
    const times = thumbTimes(sourceIn, sourceOut, count);
    setUrls(new Array(count).fill(null));
    (async () => {
      const { getThumbnail } = await import("@/lib/media/thumbnails");
      let anyOk = false;
      for (let i = 0; i < times.length; i++) {
        try {
          const url = await getThumbnail(file, times[i], height);
          if (cancelled) return;
          anyOk = true;
          setUrls((prev) => { const next = prev.slice(); next[i] = url; return next; });
        } catch { if (cancelled) return; }
      }
      if (!cancelled && !anyOk) setFailed(true); // no frames captured -> fall back to plain fill
    })().catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [file, sourceIn, sourceOut, height]);

  if (failed) return null; // fall back to the clip's plain fill
  return (
    <div className="filmstrip" ref={wrapRef}>
      {urls.map((u, i) => (
        <div className="fs-cell" key={i}>
          {u ? <img src={u} alt="" draggable={false} /> : <span className="strip-loading" />}
        </div>
      ))}
    </div>
  );
}

export default memo(Filmstrip);
