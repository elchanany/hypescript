"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Captions, Download, ExternalLink, Film, Image as ImageIcon, Loader2, Maximize, Music, Pause, Play, Plus, Volume2, VolumeX, X } from "@/components/icons";
import { safeDownloadName } from "@/lib/render/videoCard";

type MKind = "video" | "audio" | "image" | "srt";

interface Props {
  url: string;
  name: string;
  mkind: MKind;
  /** מוסיף את הפריט לספריית המדיה של הפרויקט. חסר => הכפתור לא מוצג. */
  onAddToProject?: (file: File) => void | Promise<void>;
}

const LABEL: Record<MKind, string> = {
  video: "סרטון מוכן",
  audio: "קריינות",
  image: "פריים",
  srt: "כתוביות SRT",
};

/** כרטיס פלט מדיה מעוצב — נגן שמע עם פעימות, וידאו, תמונה, SRT. */
export default function ChatMediaCard({ url, name, mkind, onAddToProject }: Props) {
  const Icon = mkind === "video" ? Film : mkind === "image" ? ImageIcon : mkind === "audio" ? Music : Captions;
  const [zoomed, setZoomed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  // הכרטיס מציג פריים בגובה 200px לכל היותר, ופריים של ייצוא בגודל מלא נהיה
  // שם קטן מכדי לבדוק אותו. לחיצה פותחת אותו בגודל מלא (B-15).
  const addToProject = useCallback(async () => {
    if (!onAddToProject || adding || added) return;
    setAdding(true);
    try {
      const blob = await (await fetch(url)).blob();
      await onAddToProject(new File([blob], name, { type: blob.type || undefined }));
      setAdded(true);
    } catch {
      /* נשאר ניתן לניסיון חוזר */
    } finally {
      setAdding(false);
    }
  }, [onAddToProject, adding, added, url, name]);

  return (
    <div className={`out2 out-${mkind}`}>
      <div className="oh"><Icon size={14} />{LABEL[mkind]}</div>
      {mkind === "video" && <VideoPlayer src={url} />}
      {mkind === "image" && (
        <button type="button" className="out-img-btn" onClick={() => setZoomed(true)} title="לחץ להגדלה">
          <img className="out-img" src={url} alt={name} />
        </button>
      )}
      {mkind === "audio" && <BeatAudioPlayer src={url} />}
      {mkind === "srt" && <SrtPreview url={url} />}
      <div style={{ display: "flex", gap: 8 }}>
        <a className="btn primary sm out-dl" style={{ flex: 1 }} href={url} download={mkind === "video" ? safeDownloadName(name) : name}>
          <Download size={14} strokeWidth={2} />הורד {name}
        </a>
        {mkind === "video" && (
          <a className="btn sm" href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} strokeWidth={2} />פתח בחלון חדש
          </a>
        )}
        {onAddToProject && mkind !== "srt" && (
          <button type="button" className="btn sm" onClick={addToProject} disabled={adding || added}>
            {adding ? <Loader2 size={14} className="spin" /> : <Plus size={14} strokeWidth={2} />}
            {added ? "נוסף לפרויקט" : "הוסף לפרויקט"}
          </button>
        )}
      </div>
      {zoomed && <Lightbox url={url} name={name} onClose={() => setZoomed(false)} />}
    </div>
  );
}

/** תצוגת גודל-מלא לפריים. Escape או לחיצה ברקע סוגרים. */
function Lightbox({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="out-lightbox" role="dialog" aria-modal="true" aria-label={name} onClick={onClose}>
      <button type="button" className="iconbtn out-lightbox-close" onClick={onClose} aria-label="סגור"><X size={18} /></button>
      <img src={url} alt={name} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [muted, setMuted] = useState(false);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setT(v.currentTime);
    const onMeta = () => setDur(v.duration || 0);
    const onEnd = () => setPlaying(false);
    const onErr = () => setErr(true);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("ended", onEnd);
    v.addEventListener("error", onErr);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("ended", onEnd);
      v.removeEventListener("error", onErr);
    };
  }, [src]);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { void v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const toggleFullscreen = () => {
    const v = videoRef.current;
    if (!v) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void v.requestFullscreen?.();
  };

  return (
    <div className="vplayer">
      <video ref={videoRef} className="out-video" src={src} playsInline preload="metadata"
        controlsList="nodownload" onClick={toggle} />
      {err && <div className="vplayer-err">לא ניתן לטעון את הווידאו</div>}
      <div className="vplayer-bar">
        <button type="button" className="iconbtn" onClick={toggle} aria-label={playing ? "השהה" : "נגן"}>
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <input
          className="vplayer-seek"
          type="range"
          min={0}
          max={Math.max(0.01, dur)}
          step={0.01}
          value={t}
          onChange={(e) => {
            const v = +e.target.value;
            setT(v);
            if (videoRef.current) videoRef.current.currentTime = v;
          }}
        />
        <span className="vplayer-time">{fmt(t)} / {fmt(dur)}</span>
        <button type="button" className="iconbtn" onClick={toggleMute} aria-label={muted ? "הפעל קול" : "השתק"}>
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
        <button type="button" className="iconbtn" onClick={toggleFullscreen} aria-label="מסך מלא">
          <Maximize size={15} />
        </button>
      </div>
    </div>
  );
}

function BeatAudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setT(a.currentTime);
    const onMeta = () => setDur(a.duration || 0);
    const onEnd = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, [src]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { void a.play(); setPlaying(true); }
    else { a.pause(); setPlaying(false); }
  };

  const pct = dur > 0 ? Math.min(100, (t / dur) * 100) : 0;
  const bars = 24;

  return (
    <div className="beat-player">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button type="button" className="beat-play" onClick={toggle} aria-label={playing ? "השהה" : "נגן"}>
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <div className="beat-main">
        <div className="beat-bars" aria-hidden>
          {Array.from({ length: bars }, (_, i) => {
            const h = 30 + ((i * 37) % 55);
            const active = (i / bars) * 100 <= pct;
            return <i key={i} style={{ height: `${h}%` }} className={active ? "on" : ""} />;
          })}
        </div>
        <input
          className="beat-seek"
          type="range"
          min={0}
          max={Math.max(0.01, dur)}
          step={0.01}
          value={t}
          onChange={(e) => {
            const v = +e.target.value;
            setT(v);
            if (audioRef.current) audioRef.current.currentTime = v;
          }}
        />
        <div className="beat-time">{fmt(t)} / {fmt(dur)}</div>
      </div>
    </div>
  );
}

function SrtPreview({ url }: { url: string }) {
  const [text, setText] = useState("טוען…");
  useEffect(() => {
    let cancelled = false;
    fetch(url).then((r) => r.text()).then((t) => {
      if (!cancelled) setText(t.slice(0, 600) + (t.length > 600 ? "…" : ""));
    }).catch(() => { if (!cancelled) setText("לא ניתן להציג תצוגה מקדימה"); });
    return () => { cancelled = true; };
  }, [url]);
  return <pre className="out-srt" dir="rtl">{text}</pre>;
}

function fmt(s: number) {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}
