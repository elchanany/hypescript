"use client";

import { useEffect, useRef, useState } from "react";
import { Word } from "@/lib/models";
import {
  Clip, assembledToSource, moveClip, removeClip, splitClip, totalDur, trimClip, uid,
} from "@/lib/editor/model";
import { scriptToClips } from "@/lib/editor/scriptClips";
import Chat from "@/components/Chat";
import VideoPreview, { PreviewHandle } from "@/components/VideoPreview";
import Timeline from "@/components/Timeline";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function EditorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [words, setWords] = useState<Word[] | null>(null);
  const [clips, setClips] = useState<Clip[] | null>(null);
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
  const previewRef = useRef<PreviewHandle>(null);

  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then((d) => setGroqOk(!!d.transcription?.groq)).catch(() => {});
  }, []);

  const onPick = (f: File | null) => {
    if (!f) return;
    setFile(f); setWords(null); setClips(null); setSelectedId(null); setError(""); setCur(0);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => setDuration(v.duration || 0);
    v.src = URL.createObjectURL(f);
  };

  const seek = (a: number) => { setCur(a); previewRef.current?.seek(a); };

  const analyze = async () => {
    setError("");
    if (!file) return setError("בחר קובץ וידאו קודם.");
    setBusy(true); setProgress(0);
    try {
      let ws = words;
      if (!ws) {
        const { extractAudio } = await import("@/lib/ffmpeg");
        setPhase("מחלץ אודיו…");
        const audio = await extractAudio(file, (r) => setProgress(r));
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
      const dur = Math.max(duration, ws![ws!.length - 1].end + 0.2);
      const built = script.trim() ? scriptToClips(ws!, script) : [{ id: uid(), start: 0, end: dur }];
      setClips(built.length ? built : [{ id: uid(), start: 0, end: dur }]);
      setPhase("מוכן ✓");
    } catch (e: any) { setError(e?.message || String(e)); setPhase(""); }
    finally { setBusy(false); setProgress(0); }
  };

  const render = async () => {
    if (!file || !clips?.length) return;
    setError(""); setRendering(true); setProgress(0);
    try {
      const { renderCut } = await import("@/lib/ffmpeg");
      setPhase("מרנדר בדפדפן…");
      const blob = await renderCut(file, clips, (r) => setProgress(r));
      download(blob, file.name.replace(/\.[^.]+$/, "") + "_edited.mp4");
      setPhase("הרינדור הושלם ✓");
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setRendering(false); setProgress(0); }
  };

  const splitAtPlayhead = () => {
    if (!clips?.length) return;
    const { index, source } = assembledToSource(clips, cur);
    if (index >= 0) setClips(splitClip(clips, clips[index].id, source));
  };
  const deleteSel = () => {
    if (!clips || !selectedId) return;
    setClips(removeClip(clips, selectedId)); setSelectedId(null);
  };

  const working = busy || rendering;
  const totalEdited = clips ? totalDur(clips) : duration;

  return (
    <div className="workspace">
      <section className="editor-pane">
        {!groqOk && (
          <div className="banner err">GROQ_API_KEY לא מוגדר ב-Vercel. ראה <a href="/settings">הגדרות</a>.</div>
        )}

        <VideoPreview ref={previewRef} file={file} clips={clips} onTime={setCur} />

        <div className="editor-toolbar">
          <button className="btn" onClick={() => fileInput.current?.click()}>📁 טען</button>
          <input ref={fileInput} type="file" accept="video/*" hidden onChange={(e) => onPick(e.target.files?.[0] || null)} />
          <div className="tb-sep" />
          <button className="btn" onClick={splitAtPlayhead} disabled={!clips?.length} title="פצל בראש-הנגן">🔪 פצל</button>
          <button className="btn" onClick={deleteSel} disabled={!selectedId} title="מחק קליפ נבחר">🗑️ מחק</button>
          <div className="tb-sep" />
          <button className="btn primary" onClick={analyze} disabled={working || !file}>{busy ? "מנתח…" : words ? "בנה מחדש" : "נתח"}</button>
          <button className="btn good" onClick={render} disabled={working || !clips?.length}>{rendering ? "מרנדר…" : "🎬 ייצא"}</button>
          <div className="tb-grow" />
          {file && <span className="badge">{fmt(duration)} → {fmt(totalEdited)}</span>}
        </div>

        {(working || phase || error) && (
          <div className="editor-status">
            {error ? <span className="err">⚠ {error}</span> : <span className="hint">{phase}</span>}
            {working && <div className="progress"><div style={{ width: `${Math.round(progress * 100)}%` }} /></div>}
          </div>
        )}

        {clips ? (
          <Timeline
            clips={clips} maxDuration={duration} currentAssembled={cur} selectedId={selectedId}
            onSeek={seek} onSelect={setSelectedId}
            onTrim={(id, s, e) => setClips((c) => (c ? trimClip(c, id, s, e, duration) : c))}
            onReorder={(id, to) => setClips((c) => (c ? moveClip(c, id, to) : c))}
          />
        ) : (
          <div className="tl-placeholder">טען סרטון וכתוב בצ'אט מה לעשות — או פתח “עריכה ידנית”.</div>
        )}

        <details className="manual">
          <summary>עריכה ידנית</summary>
          <textarea value={script} onChange={(e) => setScript(e.target.value)} placeholder="סקריפט: הטקסט שאמור להישאר, בסדר הרצוי (אפשר לחזור על קטע)…" />
          <div className="hint" style={{ marginTop: 6 }}>“נתח” יתמלל (פעם אחת) ויבנה קליפים לפי הסדר. גרור קליפ להזזה, גרור קצה לטרים.</div>
        </details>
      </section>

      <aside className="chat-pane">
        <Chat file={file} duration={duration} words={words} clips={clips}
          onProject={({ words: w, clips: c }) => { setWords(w); setClips(c); }} />
      </aside>
    </div>
  );
}
