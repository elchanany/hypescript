"use client";

import { useEffect, useRef, useState } from "react";
import { GROQ_KEY } from "@/lib/keys";
import { Word, KeepInterval, keptDuration } from "@/lib/models";
import { scriptKeepMask } from "@/lib/align";
import { buildKeepIntervals, fillerMask, parseFillers, removedIntervals } from "@/lib/editing";
import { buildCues, buildSrt } from "@/lib/subtitles";

interface Result {
  words: Word[];
  keeps: KeepInterval[];
  srt: string;
  keptText: string;
  originalSec: number;
  editedSec: number;
  cuts: number;
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1);
  return `${m}:${s.padStart(4, "0")}`;
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function EditorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [script, setScript] = useState("");
  const [removeFillers, setRemoveFillers] = useState(true);
  const [threshold, setThreshold] = useState(0.4);
  const [padding, setPadding] = useState(0.1);
  const [maxChars, setMaxChars] = useState(42);

  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [rendering, setRendering] = useState(false);

  const logRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setApiKey(localStorage.getItem(GROQ_KEY) || "");
  }, []);
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logLines]);

  const log = (m: string) => setLogLines((p) => [...p, m]);

  const onPick = (f: File | null) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError("");
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => setDuration(v.duration || 0);
    v.src = URL.createObjectURL(f);
  };

  const analyze = async () => {
    setError("");
    if (!file) return setError("בחר קובץ וידאו קודם.");
    if (!apiKey) return setError("חסר מפתח Groq — הזן אותו בעמוד ההגדרות.");

    setBusy(true);
    setResult(null);
    setLogLines([]);
    setProgress(0);
    try {
      const { extractAudio } = await import("@/lib/ffmpeg");

      setPhase("טוען מנוע עיבוד (ffmpeg.wasm)…");
      log("• טוען ffmpeg.wasm בדפדפן…");

      setPhase("מחלץ אודיו…");
      const audio = await extractAudio(file, (r) => setProgress(r));
      log(`• אודיו חולץ (${(audio.size / 1024).toFixed(0)}KB) — נשלח לתמלול בלבד.`);

      setPhase("מתמלל ב-Groq…");
      setProgress(0);
      const fd = new FormData();
      fd.append("file", audio, "audio.mp3");
      fd.append("apiKey", apiKey);
      fd.append("provider", "groq");
      fd.append("model", "whisper-large-v3");
      fd.append("language", "he");
      const resp = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "התמלול נכשל.");

      const rawWords: any[] = data.words || [];
      const words: Word[] = rawWords
        .filter((w) => w.start != null && w.end != null && (w.word || w.text))
        .map((w) => ({ text: String(w.word || w.text).trim(), start: +w.start, end: +w.end }));
      if (!words.length) throw new Error("התמלול לא החזיר מילים עם חותמות זמן.");
      log(`• התקבלו ${words.length} מילים מתומללות.`);

      const dur = Math.max(duration, words[words.length - 1].end + 0.2);

      // מסכה מאוחדת: סקריפט + מהססים
      let mask = new Array(words.length).fill(true);
      if (script.trim()) {
        const sm = scriptKeepMask(words, script);
        mask = mask.map((m, i) => m && sm[i]);
        log(`• יישור לפי סקריפט: נשמרו ${sm.filter(Boolean).length}/${words.length} מילים.`);
      }
      if (removeFillers) {
        const fm = fillerMask(words, parseFillers());
        mask = mask.map((m, i) => m && !fm[i]);
        const n = fm.filter(Boolean).length;
        if (n) log(`• הוסרו ${n} מילות-מהסס/גמגום.`);
      }

      const keptWords = words.filter((_, i) => mask[i]);
      if (!keptWords.length) throw new Error("אחרי הסינון לא נשארו מילים. בדוק את הסקריפט.");

      // הסרת נשימות/שתיקות פעילה תמיד; המסכה מוסיפה חיתוך לפי סקריפט/מהססים.
      const keeps = buildKeepIntervals(words, dur, threshold, padding, mask);

      const removed = removedIntervals(keeps, dur);
      const editedSec = keptDuration(keeps);
      const cues = buildCues(keptWords, keeps, maxChars, 2);
      const srt = buildSrt(cues);
      const keptText = keptWords.map((w) => w.text).join(" ");

      log(`• ${keeps.length} קטעים נשמרים, ${removed.length} חיתוכים. הוסרו ${fmt(dur - editedSec)}.`);
      setResult({ words, keeps, srt, keptText, originalSec: dur, editedSec, cuts: removed.length });
      setPhase("הניתוח הושלם ✓");
    } catch (e: any) {
      setError(e?.message || String(e));
      setPhase("");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  const render = async () => {
    if (!file || !result) return;
    setError("");
    setRendering(true);
    setProgress(0);
    try {
      const { renderCut } = await import("@/lib/ffmpeg");
      setPhase("מרנדר וידאו בדפדפן… (עשוי לקחת זמן)");
      log("• מתחיל רינדור בדפדפן — הווידאו לא עוזב את המחשב.");
      const blob = await renderCut(file, result.keeps, (r) => setProgress(r));
      const base = file.name.replace(/\.[^.]+$/, "");
      download(blob, `${base}_edited.mp4`);
      log("• הרינדור הסתיים ✓ — הקובץ הורד.");
      setPhase("הרינדור הושלם ✓");
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setRendering(false);
      setProgress(0);
    }
  };

  const working = busy || rendering;

  return (
    <div>
      <div className="hero">
        <h1>עריכת שיעור</h1>
        <p>בחר וידאו, הדבק את הטקסט שצריך להישאר — וקבל סרטון מדויק בלי נשימות. הכל בדפדפן.</p>
      </div>

      {!apiKey && (
        <div className="card" style={{ borderColor: "var(--bad)" }}>
          <span className="err">חסר מפתח Groq.</span> עבור ל<a href="/settings" className="ok"> הגדרות </a>
          והזן מפתח כדי להתחיל.
        </div>
      )}

      {/* קלט */}
      <div className="card">
        <h2>1 · קבצים</h2>
        <div
          className="file-drop"
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onPick(e.dataTransfer.files?.[0] || null);
          }}
        >
          {file ? (
            <span><strong>{file.name}</strong> · {duration ? fmt(duration) : "…"}</span>
          ) : (
            <span>גרור לכאן קובץ וידאו או <strong>לחץ לבחירה</strong></span>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => onPick(e.target.files?.[0] || null)}
          />
        </div>

        <label className="field" style={{ marginTop: 16 }}>
          <span>סקריפט — הטקסט שצריך להישאר (אופציונלי; ריק = רק הסרת נשימות/מהססים)</span>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="הדבק כאן את הטקסט הנקי שאמור להישאר בסרטון…"
          />
        </label>
      </div>

      {/* אפשרויות */}
      <div className="card">
        <h2>2 · עריכה</h2>
        <div className="controls">
          <label className="check">
            <input type="checkbox" checked={removeFillers} onChange={(e) => setRemoveFillers(e.target.checked)} />
            הסר מהססים (אה/אמ/המ)
          </label>
          <label className="field" style={{ margin: 0 }}>
            <span>סף שתיקה (שנ')</span>
            <input type="number" step="0.05" min="0.1" max="2" value={threshold}
              onChange={(e) => setThreshold(+e.target.value)} />
          </label>
          <label className="field" style={{ margin: 0 }}>
            <span>ריפוד (שנ')</span>
            <input type="number" step="0.05" min="0" max="1" value={padding}
              onChange={(e) => setPadding(+e.target.value)} />
          </label>
          <label className="field" style={{ margin: 0 }}>
            <span>תווים בכתובית</span>
            <input type="number" step="1" min="20" max="80" value={maxChars}
              onChange={(e) => setMaxChars(+e.target.value)} />
          </label>
        </div>
      </div>

      {/* פעולות */}
      <div className="card">
        <div className="row">
          <button className="btn primary" onClick={analyze} disabled={working || !file}>
            {busy ? "מנתח…" : "▶ נתח (תמלול + חישוב חיתוכים)"}
          </button>
          {result && (
            <button className="btn good" onClick={render} disabled={working}>
              {rendering ? "מרנדר…" : "🎬 רנדר וידאו בדפדפן"}
            </button>
          )}
        </div>

        {(working || phase) && (
          <>
            <div className="hint">{phase}</div>
            <div className="progress"><div style={{ width: `${Math.round(progress * 100)}%` }} /></div>
          </>
        )}
        {error && <div className="err" style={{ marginTop: 8 }}>⚠ {error}</div>}

        <div className="log" ref={logRef}>{logLines.join("\n") || "מוכן."}</div>
      </div>

      {/* תוצאות */}
      {result && (
        <div className="card">
          <h2>3 · תוצאות</h2>
          <div className="stats">
            <div className="stat"><b>{fmt(result.originalSec)}</b><span>משך מקורי</span></div>
            <div className="stat"><b>{fmt(result.editedSec)}</b><span>משך ערוך</span></div>
            <div className="stat"><b>{fmt(result.originalSec - result.editedSec)}</b><span>הוסר</span></div>
            <div className="stat"><b>{result.cuts}</b><span>חיתוכים</span></div>
          </div>

          <div className="row" style={{ marginBottom: 14 }}>
            <button className="btn" onClick={() => download(new Blob([result.srt], { type: "text/plain;charset=utf-8" }), (file?.name.replace(/\.[^.]+$/, "") || "subs") + ".srt")}>
              ⬇ הורד SRT
            </button>
            <button className="btn" onClick={() => download(new Blob([result.keptText], { type: "text/plain;charset=utf-8" }), (file?.name.replace(/\.[^.]+$/, "") || "transcript") + "_transcript.txt")}>
              ⬇ הורד תמלול-סופי
            </button>
          </div>

          <label className="field">
            <span>הטקסט הסופי שיישאר בסרטון (להגהה)</span>
            <textarea value={result.keptText} readOnly style={{ minHeight: 100 }} />
          </label>
          <div className="hint">
            הרינדור בדפדפן מתאים לסרטונים קצרים-בינוניים. לקבצים כבדים — השתמש ב-SRT + בכלי המקומי (תיקיית <span className="badge">local/</span>).
          </div>
        </div>
      )}
    </div>
  );
}
