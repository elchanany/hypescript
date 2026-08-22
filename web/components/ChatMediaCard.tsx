"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Captions, Download, ExternalLink, Film, Image as ImageIcon, Loader2, Maximize, Music, Pause, Play, Plus, Volume2, VolumeX, X } from "@/components/icons";
import { safeDownloadName } from "@/lib/render/videoCard";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { AppLocale } from "@/lib/i18n/config";

type MKind = "video" | "audio" | "image" | "srt";

interface Props {
  url: string;
  name: string;
  mkind: MKind;
  /** מוסיף את הפריט לספריית המדיה של הפרויקט. חסר => הכפתור לא מוצג. */
  onAddToProject?: (file: File) => void | Promise<void>;
}

type ChatMediaCopy = { labels: Record<MKind,string>; download:string; open:string; add:string; added:string; zoom:string; close:string; loadVideo:string; play:string; pause:string; sound:string; mute:string; full:string; loading:string; preview:string };

export const CHAT_MEDIA_COPY = {
  he:{labels:{video:"סרטון מוכן",audio:"קריינות",image:"תמונה",srt:"כתוביות SRT"},download:"הורדה",open:"פתיחה בחלון חדש",add:"הוספה לפרויקט",added:"נוסף לפרויקט",zoom:"הגדלת התמונה",close:"סגירה",loadVideo:"לא ניתן לטעון את הווידאו",play:"ניגון",pause:"השהיה",sound:"הפעלת קול",mute:"השתקה",full:"מסך מלא",loading:"טוענים…",preview:"לא ניתן להציג תצוגה מקדימה"},
  en:{labels:{video:"Finished video",audio:"Narration",image:"Image",srt:"SRT captions"},download:"Download",open:"Open in new window",add:"Add to project",added:"Added to project",zoom:"Enlarge image",close:"Close",loadVideo:"The video could not be loaded",play:"Play",pause:"Pause",sound:"Unmute",mute:"Mute",full:"Full screen",loading:"Loading…",preview:"Preview is unavailable"},
  ar:{labels:{video:"فيديو جاهز",audio:"تعليق صوتي",image:"صورة",srt:"ترجمة SRT"},download:"تنزيل",open:"فتح في نافذة جديدة",add:"إضافة إلى المشروع",added:"أضيف إلى المشروع",zoom:"تكبير الصورة",close:"إغلاق",loadVideo:"تعذر تحميل الفيديو",play:"تشغيل",pause:"إيقاف مؤقت",sound:"تشغيل الصوت",mute:"كتم",full:"ملء الشاشة",loading:"جارٍ التحميل…",preview:"المعاينة غير متاحة"},
  ru:{labels:{video:"Готовое видео",audio:"Озвучка",image:"Изображение",srt:"Субтитры SRT"},download:"Скачать",open:"Открыть в новом окне",add:"Добавить в проект",added:"Добавлено",zoom:"Увеличить изображение",close:"Закрыть",loadVideo:"Не удалось загрузить видео",play:"Воспроизвести",pause:"Пауза",sound:"Включить звук",mute:"Выключить звук",full:"Во весь экран",loading:"Загрузка…",preview:"Предпросмотр недоступен"},
  hi:{labels:{video:"तैयार वीडियो",audio:"नैरेशन",image:"चित्र",srt:"SRT कैप्शन"},download:"डाउनलोड",open:"नई विंडो में खोलें",add:"प्रोजेक्ट में जोड़ें",added:"प्रोजेक्ट में जोड़ा",zoom:"चित्र बड़ा करें",close:"बंद करें",loadVideo:"वीडियो लोड नहीं हुआ",play:"चलाएँ",pause:"रोकें",sound:"आवाज़ चालू करें",mute:"म्यूट",full:"फ़ुल स्क्रीन",loading:"लोड हो रहा है…",preview:"प्रीव्यू उपलब्ध नहीं है"},
} satisfies Record<AppLocale,ChatMediaCopy>;

/** כרטיס פלט מדיה מעוצב — נגן שמע עם פעימות, וידאו, תמונה, SRT. */
export default function ChatMediaCard({ url, name, mkind, onAddToProject }: Props) {
  const { locale, dir } = useI18n();
  const copy = CHAT_MEDIA_COPY[locale];
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
      <div className="oh"><span><Icon size={14} />{copy.labels[mkind]}</span><strong title={name}>{name}</strong></div>
      {mkind === "video" && <VideoPlayer src={url} copy={copy} />}
      {mkind === "image" && (
        <button type="button" className="out-img-btn out-media-frame" onClick={() => setZoomed(true)} title={copy.zoom}>
          <img className="out-img" src={url} alt={name} />
        </button>
      )}
      {mkind === "audio" && <BeatAudioPlayer src={url} copy={copy} />}
      {mkind === "srt" && <SrtPreview url={url} copy={copy} dir={dir} />}
      <div className="out-actions">
        <a className="btn primary sm out-dl" style={{ flex: 1 }} href={url} download={mkind === "video" ? safeDownloadName(name) : name}>
          <Download size={14} strokeWidth={2} />{copy.download}
        </a>
        {mkind === "video" && (
          <a className="btn sm" href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} strokeWidth={2} />{copy.open}
          </a>
        )}
        {onAddToProject && mkind !== "srt" && (
          <button type="button" className="btn sm" onClick={addToProject} disabled={adding || added}>
            {adding ? <Loader2 size={14} className="spin" /> : <Plus size={14} strokeWidth={2} />}
            {added ? copy.added : copy.add}
          </button>
        )}
      </div>
      {zoomed && <Lightbox url={url} name={name} closeLabel={copy.close} onClose={() => setZoomed(false)} />}
    </div>
  );
}

/** תצוגת גודל-מלא לפריים. Escape או לחיצה ברקע סוגרים. */
function Lightbox({ url, name, closeLabel, onClose }: { url: string; name: string; closeLabel: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="out-lightbox" role="dialog" aria-modal="true" aria-label={name} onClick={onClose}>
      <button type="button" className="iconbtn out-lightbox-close" onClick={onClose} aria-label={closeLabel}><X size={18} /></button>
      <img src={url} alt={name} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

function VideoPlayer({ src, copy }: { src: string; copy: ChatMediaCopy }) {
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
      {err && <div className="vplayer-err">{copy.loadVideo}</div>}
      <div className="vplayer-bar">
        <button type="button" className="iconbtn" onClick={toggle} aria-label={playing ? copy.pause : copy.play}>
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
        <button type="button" className="iconbtn" onClick={toggleMute} aria-label={muted ? copy.sound : copy.mute}>
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
        <button type="button" className="iconbtn" onClick={toggleFullscreen} aria-label={copy.full}>
          <Maximize size={15} />
        </button>
      </div>
    </div>
  );
}

function BeatAudioPlayer({ src, copy }: { src: string; copy: ChatMediaCopy }) {
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
      <button type="button" className="beat-play" onClick={toggle} aria-label={playing ? copy.pause : copy.play}>
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

function SrtPreview({ url, copy, dir }: { url: string; copy: ChatMediaCopy; dir:"rtl"|"ltr" }) {
  const [text, setText] = useState(copy.loading);
  useEffect(() => {
    let cancelled = false;
    fetch(url).then((r) => r.text()).then((t) => {
      if (!cancelled) setText(t.slice(0, 600) + (t.length > 600 ? "…" : ""));
    }).catch(() => { if (!cancelled) setText(copy.preview); });
    return () => { cancelled = true; };
  }, [url, copy]);
  return <pre className="out-srt" dir={dir}>{text}</pre>;
}

function fmt(s: number) {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}
