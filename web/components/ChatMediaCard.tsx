"use client";

import { useEffect, useRef, useState } from "react";
import { Captions, Download, Film, Image as ImageIcon, Music, Pause, Play } from "lucide-react";

type MKind = "video" | "audio" | "image" | "srt";

interface Props {
  url: string;
  name: string;
  mkind: MKind;
}

const LABEL: Record<MKind, string> = {
  video: "סרטון מוכן",
  audio: "קריינות",
  image: "פריים",
  srt: "כתוביות SRT",
};

/** כרטיס פלט מדיה מעוצב — נגן שמע עם פעימות, וידאו, תמונה, SRT. */
export default function ChatMediaCard({ url, name, mkind }: Props) {
  const Icon = mkind === "video" ? Film : mkind === "image" ? ImageIcon : mkind === "audio" ? Music : Captions;
  return (
    <div className={`out2 out-${mkind}`}>
      <div className="oh"><Icon size={14} />{LABEL[mkind]}</div>
      {mkind === "video" && <video className="out-video" src={url} controls playsInline />}
      {mkind === "image" && <img className="out-img" src={url} alt="" />}
      {mkind === "audio" && <BeatAudioPlayer src={url} />}
      {mkind === "srt" && <SrtPreview url={url} />}
      <a className="btn primary sm out-dl" href={url} download={name}>
        <Download size={14} strokeWidth={2} />הורד {name}
      </a>
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
