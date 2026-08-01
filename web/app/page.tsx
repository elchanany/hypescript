"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Word, KeepInterval, keptDuration } from "@/lib/models";
import { scriptKeepMask } from "@/lib/align";
import { buildKeepIntervals, fillerMask, parseFillers, removedIntervals } from "@/lib/editing";
import { buildCues, buildSrt, Cue } from "@/lib/subtitles";
import Chat from "@/components/Chat";
import VideoPreview, { PreviewHandle } from "@/components/VideoPreview";
import Timeline from "@/components/Timeline";

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1);
  return `${m}:${s.padStart(4, "0")}`;
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
// בלוקי כתוביות על ציר-הזמן המקורי (לתצוגת ה-timeline).
function rawCues(words: Word[]): Cue[] {
  const out: Cue[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) out.push({ start: cur[0].start, end: cur[cur.length - 1].end, text: cur.map((w) => w.text).join(" ") });
    cur = [];
  };
  for (const w of words) {
    if (cur.length && (w.start - cur[cur.length - 1].end > 0.6 || cur.length >= 10)) flush();
    cur.push(w);
  }
  flush();
  return out;
}

export default function EditorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [words, setWords] = useState<Word[] | null>(null);
  const [keeps, setKeeps] = useState<KeepInterval[] | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const [script, setScript] = useState("");
  const [removeFillers, setRemoveFillers] = useState(true);
  const [maxChars, setMaxChars] = useState(42);

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

  const tlCues = useMemo(() => (words ? rawCues(words) : []), [words]);
  const editedSec = keeps ? keptDuration(keeps) : duration;

  const onPick = (f: File | null) => {
    if (!f) return;
    setFile(f); setWords(null); setKeeps(null); setError(""); setCurrentTime(0);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => setDuration(v.duration || 0);
    v.src = URL.createObjectURL(f);
  };

  const seek = (t: number) => { setCurrentTime(t); previewRef.current?.seek(t); };

  const analyze = async () => {
    setError("");
    if (!file) return setError("בחר קובץ וידאו קודם.");
    setBusy(true); setProgress(0);
    try {
      const { extractAudio } = await import("@/lib/ffmpeg");
      setPhase("מחלץ אודיו…");
      const audio = await extractAudio(file, (r) => setProgress(r));
      setPhase("מתמלל…"); setProgress(0);
      const fd = new FormData();
      fd.append("file", audio, "audio.mp3");
      fd.append("provider", "groq"); fd.append("model", "whisper-large-v3"); fd.append("language", "he");
      const resp = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "התמלול נכשל.");
      const ws: Word[] = (data.words || [])
        .filter((w: any) => w.start != null && w.end != null && (w.word || w.text))
        .map((w: any) => ({ text: String(w.word || w.text).trim(), start: +w.start, end: +w.end }));
      if (!ws.length) throw new Error("התמלול לא החזיר מילים.");
      setWords(ws);
      const dur = Math.max(duration, ws[ws.length - 1].end + 0.2);
      let mask = new Array(ws.length).fill(true);
      if (script.trim()) { const sm = scriptKeepMask(ws, script); mask = mask.map((m, i) => m && sm[i]); }
      if (removeFillers) { const fm = fillerMask(ws, parseFillers()); mask = mask.map((m, i) => m && !fm[i]); }
      setKeeps(buildKeepIntervals(ws, dur, 0.4, 0.1, mask));
      setPhase("הניתוח הושלם ✓");
    } catch (e: any) { setError(e?.message || String(e)); setPhase(""); }
    finally { setBusy(false); setProgress(0); }
  };

  const render = async () => {
    if (!file || !keeps) return;
    setError(""); setRendering(true); setProgress(0);
    try {
      const { renderCut } = await import("@/lib/ffmpeg");
      setPhase("מרנדר בדפדפן…");
      const blob = await renderCut(file, keeps, (r) => setProgress(r));
      download(blob, file.name.replace(/\.[^.]+$/, "") + "_edited.mp4");
      setPhase("הרינדור הושלם ✓");
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setRendering(false); setProgress(0); }
  };

  const downloadSrt = () => {
    if (!words) return;
    const cues = buildCues(words.filter((_, i) => true), keeps || [{ start: 0, end: duration }], maxChars, 2);
    download(new Blob([buildSrt(cues)], { type: "text/plain;charset=utf-8" }), (file?.name.replace(/\.[^.]+$/, "") || "subs") + ".srt");
  };

  const working = busy || rendering;

  return (
    <div className="workspace">
      <section className="editor-pane">
        {!groqOk && (
          <div className="card" style={{ borderColor: "var(--bad)", margin: 0 }}>
            <span className="err">GROQ_API_KEY לא מוגדר ב-Vercel.</span> ראה <a href="/settings" className="ok">הגדרות</a>.
          </div>
        )}

        <VideoPreview ref={previewRef} file={file} duration={duration} keeps={keeps} onTime={setCurrentTime} />
        <Timeline duration={duration} keeps={keeps} cues={tlCues} currentTime={currentTime} onSeek={seek} />

        <div className="editor-tools">
          <div className="row">
            <button className="btn" onClick={() => fileInput.current?.click()}>📁 טען וידאו</button>
            {file && <span className="badge">{file.name} · {fmt(duration)}{keeps ? ` → ${fmt(editedSec)}` : ""}</span>}
            <input ref={fileInput} type="file" accept="video/*" hidden onChange={(e) => onPick(e.target.files?.[0] || null)} />
          </div>

          <details className="manual">
            <summary>עריכה ידנית (או פשוט השתמש בסוכן ⟵)</summary>
            <textarea value={script} onChange={(e) => setScript(e.target.value)} placeholder="סקריפט: הטקסט שאמור להישאר (אופציונלי)…" />
            <div className="row" style={{ gap: 16, margin: "8px 0" }}>
              <label className="check"><input type="checkbox" checked={removeFillers} onChange={(e) => setRemoveFillers(e.target.checked)} /> הסר מהססים</label>
              <label className="check">תווים בכתובית <input type="number" min={20} max={80} value={maxChars} onChange={(e) => setMaxChars(+e.target.value)} style={{ width: 64 }} /></label>
            </div>
            <div className="row">
              <button className="btn primary" onClick={analyze} disabled={working || !file}>{busy ? "מנתח…" : "נתח"}</button>
              {keeps && <button className="btn good" onClick={render} disabled={working}>{rendering ? "מרנדר…" : "🎬 ייצא"}</button>}
              {words && <button className="btn" onClick={downloadSrt}>⬇ SRT</button>}
            </div>
            {(working || phase) && (<><div className="hint">{phase}</div><div className="progress"><div style={{ width: `${Math.round(progress * 100)}%` }} /></div></>)}
            {error && <div className="err" style={{ marginTop: 6 }}>⚠ {error}</div>}
          </details>
        </div>
      </section>

      <aside className="chat-pane">
        <Chat
          file={file}
          duration={duration}
          words={words}
          keeps={keeps}
          onProject={({ words: w, keeps: k }) => { setWords(w); setKeeps(k); }}
        />
      </aside>
    </div>
  );
}
