"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Word } from "@/lib/models";
import {
  Clip, MediaAsset, MediaKind, assembledToSource, firstVideo, moveClip, removeClip, splitClip, totalDur, trimClip, uid,
} from "@/lib/editor/model";
import { scriptToClips } from "@/lib/editor/scriptClips";
import { Sub, edlToSubs, parseSrt, subsToSrt } from "@/lib/editor/subtitlesEdl";
import Chat from "@/components/Chat";
import VideoPreview, { PreviewHandle } from "@/components/VideoPreview";
import Timeline from "@/components/Timeline";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
const kindOf = (f: File): MediaKind => (f.type.startsWith("image") ? "image" : f.type.startsWith("audio") ? "audio" : "video");
function probeDuration(file: File, kind: MediaKind): Promise<number> {
  return new Promise((res) => {
    if (kind === "image") return res(4);
    const el = document.createElement(kind === "audio" ? "audio" : "video");
    el.preload = "metadata";
    el.onloadedmetadata = () => res(el.duration || 0);
    el.onerror = () => res(0);
    el.src = URL.createObjectURL(file);
  });
}

export default function EditorPage() {
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [words, setWords] = useState<Word[] | null>(null);
  const [clips, setClips] = useState<Clip[] | null>(null);
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const [cur, setCur] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [script, setScript] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [rendering, setRendering] = useState(false);
  const [groqOk, setGroqOk] = useState(true);

  const fileInput = useRef<HTMLInputElement>(null);
  const srtInput = useRef<HTMLInputElement>(null);
  const previewRef = useRef<PreviewHandle>(null);

  const main = useMemo(() => firstVideo(media), [media]);
  const duration = main?.duration || 0;

  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then((d) => setGroqOk(!!d.transcription?.groq)).catch(() => {});
  }, []);

  // ברגע שנטען סרטון ואין עדיין קליפים — מציגים אותו כקליפ יחיד כדי שהציר יופיע מיד
  // (אפשר לגרור/לחתוך). הסוכן/הסקריפט מחליפים כשמריצים.
  useEffect(() => {
    if (main && !clips) setClips([{ id: uid(), sourceId: main.id, start: 0, end: main.duration }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [main]);

  const addFiles = async (files: FileList | File[] | null) => {
    if (!files) return;
    const arr = Array.from(files);
    const assets = await Promise.all(arr.map(async (f) => {
      const kind = kindOf(f);
      return { id: uid("m"), name: f.name, kind, file: f, duration: await probeDuration(f, kind), url: URL.createObjectURL(f) } as MediaAsset;
    }));
    setMedia((m) => [...m, ...assets]);
  };

  const seek = (a: number) => { setCur(a); previewRef.current?.seek(a); };

  const analyze = async () => {
    setError("");
    if (!main) return setError("טען סרטון קודם.");
    setBusy(true); setProgress(0);
    try {
      let ws = words;
      if (!ws) {
        const { extractAudio } = await import("@/lib/ffmpeg");
        setPhase("מחלץ אודיו…");
        const audio = await extractAudio(main.file, (r) => setProgress(r));
        setPhase("מתמלל…"); setProgress(0);
        const fd = new FormData();
        fd.append("file", audio, "audio.mp3"); fd.append("provider", "groq"); fd.append("model", "whisper-large-v3"); fd.append("language", "he");
        const resp = await fetch("/api/transcribe", { method: "POST", body: fd });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || "התמלול נכשל.");
        ws = (data.words || []).filter((w: any) => w.start != null && w.end != null && (w.word || w.text)).map((w: any) => ({ text: String(w.word || w.text).trim(), start: +w.start, end: +w.end }));
        if (!ws!.length) throw new Error("התמלול לא החזיר מילים.");
        setWords(ws);
      }
      const built = script.trim() ? scriptToClips(ws!, script, main.id) : [{ id: uid(), sourceId: main.id, start: 0, end: duration }];
      setClips(built.length ? built : [{ id: uid(), sourceId: main.id, start: 0, end: duration }]);
      setPhase("מוכן ✓");
    } catch (e: any) { setError(e?.message || String(e)); setPhase(""); }
    finally { setBusy(false); setProgress(0); }
  };

  const render = async () => {
    if (!media.length || !clips?.length) return;
    setError(""); setRendering(true); setProgress(0);
    try {
      const { renderEDL } = await import("@/lib/ffmpeg");
      setPhase("מרנדר בדפדפן…");
      const blob = await renderEDL(media, clips, (r) => setProgress(r));
      download(blob, (main?.name.replace(/\.[^.]+$/, "") || "video") + "_edited.mp4");
      setPhase("הרינדור הושלם ✓");
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setRendering(false); setProgress(0); }
  };

  const generateSubs = () => {
    if (!words || !main) { setError("צריך לתמלל קודם (נתח)."); return; }
    const cl = clips?.length ? clips : [{ id: uid(), sourceId: main.id, start: 0, end: duration }];
    setSubs(edlToSubs(words, cl));
  };
  const exportSrt = () => {
    let s = subs;
    if (!s) { if (!words || !main) return; const cl = clips?.length ? clips : [{ id: uid(), sourceId: main.id, start: 0, end: duration }]; s = edlToSubs(words, cl); setSubs(s); }
    download(new Blob([subsToSrt(s)], { type: "text/plain;charset=utf-8" }), (main?.name.replace(/\.[^.]+$/, "") || "subs") + ".srt");
  };
  const importSrt = (file: File | null) => {
    if (!file) return;
    file.text().then((t) => { const s = parseSrt(t); if (s.length) setSubs(s); else setError("לא זוהו כתוביות בקובץ."); });
  };
  const editSub = (id: string, text: string) => setSubs((ss) => ss?.map((s) => (s.id === id ? { ...s, text } : s)) || ss);
  const delSub = (id: string) => setSubs((ss) => ss?.filter((s) => s.id !== id) || ss);

  const splitAtPlayhead = () => {
    if (!clips?.length) return;
    const { index, source } = assembledToSource(clips, cur);
    if (index >= 0) setClips(splitClip(clips, clips[index].id, source));
  };
  const deleteSel = () => { if (clips && selectedId) { setClips(removeClip(clips, selectedId)); setSelectedId(null); } };

  const working = busy || rendering;
  const totalEdited = clips ? totalDur(clips) : duration;

  return (
    <div className="workspace">
      <section className="editor-pane">
        {!groqOk && <div className="banner err">GROQ_API_KEY לא מוגדר ב-Vercel. ראה <a href="/settings">הגדרות</a>.</div>}

        <VideoPreview ref={previewRef} media={media} clips={clips} onTime={setCur} />

        {media.length > 0 && (
          <div className="media-strip">
            {media.map((m, i) => (
              <div key={m.id} className={`media-chip ${m.id === main?.id ? "main" : ""}`} title={m.name}>
                <span className="mc-kind">{m.kind === "video" ? "🎞️" : m.kind === "image" ? "🖼️" : "🎵"}</span>
                <span className="mc-body">
                  <span className="mc-name">{i + 1}. {m.name}</span>
                  <span className="mc-meta">{m.kind === "video" ? "וידאו" : m.kind === "image" ? "תמונה" : "שמע"} · {m.duration.toFixed(1)}s{m.id === main?.id ? " · ראשי" : ""}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="editor-toolbar">
          <button className="btn" onClick={() => fileInput.current?.click()}>📁 טען מדיה</button>
          <input ref={fileInput} type="file" accept="video/*,image/*,audio/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
          <div className="tb-sep" />
          <button className="btn" onClick={splitAtPlayhead} disabled={!clips?.length}>🔪 פצל</button>
          <button className="btn" onClick={deleteSel} disabled={!selectedId}>🗑️ מחק</button>
          <div className="tb-sep" />
          <button className="btn primary" onClick={analyze} disabled={working || !main}>{busy ? "מנתח…" : words ? "בנה מחדש" : "נתח"}</button>
          <button className="btn good" onClick={render} disabled={working || !clips?.length}>{rendering ? "מרנדר…" : "🎬 ייצא"}</button>
          <button className="btn" onClick={exportSrt} disabled={!words}>💬 SRT</button>
          <div className="tb-grow" />
          {main && <span className="badge">{fmt(duration)} → {fmt(totalEdited)}</span>}
        </div>

        {(working || phase || error) && (
          <div className="editor-status">
            {error ? <span className="err">⚠ {error}</span> : <span className="hint">{phase}</span>}
            {working && <div className="progress"><div style={{ width: `${Math.round(progress * 100)}%` }} /></div>}
          </div>
        )}

        {clips ? (
          <Timeline
            media={media} clips={clips} subs={subs} maxDuration={duration} currentAssembled={cur} selectedId={selectedId}
            onSeek={seek} onSelect={setSelectedId}
            onTrim={(id, s, e) => setClips((c) => (c ? trimClip(c, id, s, e, duration) : c))}
            onReorder={(id, to) => setClips((c) => (c ? moveClip(c, id, to) : c))}
          />
        ) : (
          <div className="tl-placeholder">טען מדיה ותגיד לסוכן בצ'אט מה לעשות — הוא בונה את הציר. או “עריכה ידנית”.</div>
        )}

        <details className="manual">
          <summary>עריכה ידנית + כתוביות</summary>
          <textarea value={script} onChange={(e) => setScript(e.target.value)} placeholder="סקריפט: הטקסט שאמור להישאר, בסדר הרצוי (אפשר לחזור על קטע)…" />
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <button className="btn" onClick={generateSubs} disabled={!words}>💬 צור כתוביות</button>
            <button className="btn" onClick={() => srtInput.current?.click()}>📥 ייבא SRT</button>
            <button className="btn" onClick={exportSrt} disabled={!words && !subs}>⬇ ייצא SRT</button>
            <input ref={srtInput} type="file" accept=".srt,text/plain" hidden onChange={(e) => { importSrt(e.target.files?.[0] || null); e.currentTarget.value = ""; }} />
          </div>
          {subs && (
            <div className="subs-editor">
              {subs.map((s, i) => (
                <div key={s.id} className="sub-row">
                  <span className="sub-idx">{i + 1}</span>
                  <span className="sub-time">{s.start.toFixed(1)}–{s.end.toFixed(1)}</span>
                  <input className="sub-text" value={s.text} onChange={(e) => editSub(s.id, e.target.value)} />
                  <button className="sub-del" onClick={() => delSub(s.id)} title="מחק">✕</button>
                </div>
              ))}
            </div>
          )}
        </details>
      </section>

      <aside className="chat-pane">
        <Chat media={media} onAddMedia={addFiles} words={words} clips={clips} subs={subs}
          onProject={({ words: w, clips: c, subs: s }) => { setWords(w); setClips(c); setSubs(s); }} />
      </aside>
    </div>
  );
}
