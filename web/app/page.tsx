"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Word } from "@/lib/models";
import {
  assembledStart, Clip, MediaAsset, MediaKind, assembledToSource, firstVideo, mediaById, moveClip, removeClip, splitClip, totalDur, trimClip, uid,
} from "@/lib/editor/model";
import { audioMuted, SCHEMA_VERSION, videoLocked, videoTrack } from "@/lib/editor/project";
import { migrateState } from "@/lib/editor/migrate";
import Inspector from "@/components/Inspector";
import { scriptToClips } from "@/lib/editor/scriptClips";
import { Sub, edlToSubs, parseSrt, subsToSrt } from "@/lib/editor/subtitlesEdl";
import { createProject, deleteProject, ensureProject, kvGet, kvSet, listProjects, pk, ProjectMeta, renameProject, setCurrentProject, touchProject } from "@/lib/storage";
import Chat from "@/components/Chat";
import VideoPreview, { PreviewHandle } from "@/components/VideoPreview";
import Timeline from "@/components/Timeline";
import { useEditor } from "@/hooks/useEditor";

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
  const {
    clips, subs, tracks, setClips, setSubs, setProject, updateClip,
    renameTrack, toggleLock, toggleMute, setTrackHeight, reorderTrack,
    beginTransaction, setClipsLive, commitTransaction,
    reset: resetEditor, undo, redo, canUndo, canRedo,
  } = useEditor();
  const [cur, setCur] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [script, setScript] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [rendering, setRendering] = useState(false);
  const [groqOk, setGroqOk] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatWidth, setChatWidth] = useState(400);
  const chatWidthRef = useRef(400); chatWidthRef.current = chatWidth;
  const [inspectorWidth, setInspectorWidth] = useState(320);
  const inspWRef = useRef(320); inspWRef.current = inspectorWidth;

  const fileInput = useRef<HTMLInputElement>(null);
  const srtInput = useRef<HTMLInputElement>(null);
  const previewRef = useRef<PreviewHandle>(null);

  const main = useMemo(() => firstVideo(media), [media]);
  const duration = main?.duration || 0;

  const [restored, setRestored] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectMeta[]>([]);

  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then((d) => setGroqOk(!!d.transcription?.groq)).catch(() => {});
    const o = localStorage.getItem("hs_chatOpen"); if (o !== null) setChatOpen(o === "1");
    const w = parseInt(localStorage.getItem("hs_chatw") || "0", 10); if (w >= 300) setChatWidth(Math.min(640, w));
    const iw = parseInt(localStorage.getItem("hs_inspw") || "0", 10); if (iw >= 240) setInspectorWidth(Math.min(480, iw));
  }, []);

  const startResizeInspector = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX; const startW = inspWRef.current;
    const onMove = (ev: MouseEvent) => setInspectorWidth(Math.max(240, Math.min(480, startW + (startX - ev.clientX))));
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); localStorage.setItem("hs_inspw", String(inspWRef.current)); document.body.style.userSelect = ""; };
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  };

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX; const startW = chatWidthRef.current;
    const onMove = (ev: MouseEvent) => setChatWidth(Math.max(300, Math.min(640, startW + (startX - ev.clientX))));
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); localStorage.setItem("hs_chatw", String(chatWidthRef.current)); document.body.style.userSelect = ""; };
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  };
  const toggleChat = () => setChatOpen((o) => { localStorage.setItem("hs_chatOpen", o ? "0" : "1"); return !o; });

  // אתחול פרויקטים (ומיגרציה מסשן ישן).
  useEffect(() => {
    (async () => {
      const id = await ensureProject();
      setProjects(await listProjects());
      setProjectId(id);
    })();
  }, []);

  // טעינת נתוני הפרויקט הנוכחי (מדיה + מצב) בכל החלפת פרויקט/רענון.
  useEffect(() => {
    if (!projectId) return;
    setRestored(false);
    (async () => {
      const sm = await kvGet<any[]>(pk(projectId, "media"));
      setMedia((prev) => { prev.forEach((m) => URL.revokeObjectURL(m.url)); return sm?.length ? sm.map((m) => ({ id: m.id, name: m.name, kind: m.kind, duration: m.duration, file: m.blob, url: URL.createObjectURL(m.blob) })) : []; });
      const raw = await kvGet<any>(pk(projectId, "state"));
      setWords(raw?.words ?? null);
      const st = migrateState(raw);
      resetEditor({ clips: st.clips, subs: st.subs, tracks: st.tracks });
      setCur(0); setSelectedId(null);
      setRestored(true);
    })();
  }, [projectId]);

  useEffect(() => {
    if (!restored || !projectId) return;
    kvSet(pk(projectId, "media"), media.map((m) => ({ id: m.id, name: m.name, kind: m.kind, duration: m.duration, blob: m.file })));
    touchProject(projectId);
  }, [media, restored, projectId]);

  useEffect(() => {
    if (!restored || !projectId) return;
    const t = setTimeout(() => { kvSet(pk(projectId, "state"), { schemaVersion: SCHEMA_VERSION, words, clips, subs, tracks }); touchProject(projectId); }, 500);
    return () => clearTimeout(t);
  }, [words, clips, subs, tracks, restored, projectId]);

  const switchProject = async (id: string) => { if (id === projectId) return; await setCurrentProject(id); setProjectId(id); };
  const newProject = async () => {
    const name = prompt("שם הפרויקט החדש:", `פרויקט ${projects.length + 1}`);
    if (name === null) return;
    const id = await createProject(name || "פרויקט");
    setProjects(await listProjects()); setProjectId(id);
  };
  const renameCurrent = async () => {
    if (!projectId) return;
    const name = prompt("שנה שם פרויקט:", projects.find((p) => p.id === projectId)?.name || "");
    if (!name) return;
    await renameProject(projectId, name); setProjects(await listProjects());
  };
  const deleteCurrent = async () => {
    if (!projectId || !confirm("למחוק את הפרויקט הנוכחי? כל המדיה, העריכה והשיחה יימחקו.")) return;
    await deleteProject(projectId);
    const list = await listProjects(); setProjects(list);
    if (list.length) { await setCurrentProject(list[0].id); setProjectId(list[0].id); }
    else { const id = await createProject("פרויקט 1"); setProjects(await listProjects()); setProjectId(id); }
  };

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

  const removeMedia = (id: string) => {
    setMedia((ms) => { const m = ms.find((x) => x.id === id); if (m) URL.revokeObjectURL(m.url); return ms.filter((x) => x.id !== id); });
    setClips((cs) => (cs ? cs.filter((c) => c.sourceId !== id) : cs));
  };
  const addMediaClip = (asset: MediaAsset) => {
    setClips((cs) => [...(cs || []), { id: uid(), sourceId: asset.id, start: 0, end: asset.duration }]);
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
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 180000);
        let data: any;
        try {
          const resp = await fetch("/api/transcribe", { method: "POST", body: fd, signal: ctrl.signal });
          data = await resp.json();
          if (!resp.ok) throw new Error(data.error || "התמלול נכשל.");
        } finally { clearTimeout(to); }
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
      const blob = await renderEDL(media, clips, (r) => setProgress(Math.min(1, r)), undefined, { audioMuted: audioMuted(tracks) });
      download(blob, (main?.name.replace(/\.[^.]+$/, "") || "video") + "_edited.mp4");
      setPhase("הרינדור הושלם ✓");
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setRendering(false); setProgress(0); }
  };

  const generateSubs = () => {
    if (!words || !main) { setError("צריך לתמלל קודם (נתח)."); return; }
    const cl = clips?.length ? clips : [{ id: uid(), sourceId: main.id, start: 0, end: duration }];
    setSubs(edlToSubs(cl, (sid) => (sid === main?.id ? words : null)));
  };
  const exportSrt = () => {
    let s = subs;
    if (!s) { if (!words || !main) return; const cl = clips?.length ? clips : [{ id: uid(), sourceId: main.id, start: 0, end: duration }]; s = edlToSubs(cl, (sid) => (sid === main?.id ? words : null)); setSubs(s); }
    download(new Blob([subsToSrt(s)], { type: "text/plain;charset=utf-8" }), (main?.name.replace(/\.[^.]+$/, "") || "subs") + ".srt");
  };
  const importSrt = (file: File | null) => {
    if (!file) return;
    file.text().then((t) => { const s = parseSrt(t); if (s.length) setSubs(s); else setError("לא זוהו כתוביות בקובץ."); });
  };
  const editSub = (id: string, text: string) => setSubs((ss) => ss?.map((s) => (s.id === id ? { ...s, text } : s)) || ss);
  const delSub = (id: string) => setSubs((ss) => ss?.filter((s) => s.id !== id) || ss);

  const splitAtPlayhead = () => {
    if (!clips?.length || videoLocked(tracks)) return;
    const { index, source } = assembledToSource(clips, cur);
    if (index >= 0) setClips(splitClip(clips, clips[index].id, source));
  };
  const deleteSel = () => { if (clips && selectedId && !videoLocked(tracks)) { setClips(removeClip(clips, selectedId)); setSelectedId(null); } };
  const cycleHeight = (id: string) => { const t = tracks.find((x) => x.id === id); if (!t) return; const hs = [36, 58, 90]; const i = hs.findIndex((h) => h >= t.height); setTrackHeight(id, hs[(i + 1) % hs.length]); };

  const selectedClip = clips?.find((c) => c.id === selectedId) || null;
  const selectedIndex = selectedClip ? clips!.indexOf(selectedClip) : -1;

  // קיצורי מקלדת (לא פעילים בזמן הקלדה בשדה טקסט).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (meta && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
      else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) { e.preventDefault(); deleteSel(); }
      else if (e.key.toLowerCase() === "s" && !meta && clips?.length) { e.preventDefault(); splitAtPlayhead(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const working = busy || rendering;
  const totalEdited = clips ? totalDur(clips) : duration;

  return (
    <div className="workspace">
      <section className="editor-pane">
        {!groqOk && <div className="banner err">GROQ_API_KEY לא מוגדר ב-Vercel. ראה <a href="/settings">הגדרות</a>.</div>}

        <VideoPreview ref={previewRef} media={media} clips={clips} subs={subs} onTime={setCur} audioMuted={audioMuted(tracks)} />

        {media.length > 0 && (
          <div className="media-strip">
            {media.map((m, i) => (
              <div key={m.id} className={`media-chip ${m.id === main?.id ? "main" : ""}`} title={m.name}>
                <span className="mc-kind">{m.kind === "video" ? "🎞️" : m.kind === "image" ? "🖼️" : "🎵"}</span>
                <span className="mc-body">
                  <span className="mc-name">{i + 1}. {m.name}</span>
                  <span className="mc-meta">{m.kind === "video" ? "וידאו" : m.kind === "image" ? "תמונה" : "שמע"} · {m.duration.toFixed(1)}s{m.id === main?.id ? " · ראשי" : ""}</span>
                </span>
                <span className="mc-actions">
                  <button onClick={() => addMediaClip(m)} title="הוסף לציר">＋</button>
                  <button onClick={() => removeMedia(m.id)} title="הסר קובץ">✕</button>
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="editor-toolbar">
          <button className="btn" onClick={() => fileInput.current?.click()}>📁 טען מדיה</button>
          <input ref={fileInput} type="file" accept="video/*,image/*,audio/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
          <div className="tb-sep" />
          <button className="btn mono" onClick={undo} disabled={!canUndo} title="בטל (Ctrl+Z)">↶</button>
          <button className="btn mono" onClick={redo} disabled={!canRedo} title="בצע מחדש (Ctrl+Shift+Z)">↷</button>
          <div className="tb-sep" />
          <button className="btn" onClick={splitAtPlayhead} disabled={!clips?.length} title="פצל בראש-הנגן (S)">🔪 פצל</button>
          <button className="btn" onClick={deleteSel} disabled={!selectedId} title="מחק (Delete)">🗑️ מחק</button>
          <div className="tb-sep" />
          <button className="btn primary" onClick={analyze} disabled={working || !main}>{busy ? "מנתח…" : words ? "בנה מחדש" : "נתח"}</button>
          <button className="btn good" onClick={render} disabled={working || !clips?.length}>{rendering ? "מרנדר…" : "🎬 ייצא"}</button>
          <button className="btn" onClick={exportSrt} disabled={!words}>💬 SRT</button>
          <div className="tb-grow" />
          <select className="prov-select" value={projectId || ""} onChange={(e) => switchProject(e.target.value)} title="פרויקטים">
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="btn" onClick={newProject} title="פרויקט חדש">🆕</button>
          <button className="btn" onClick={renameCurrent} title="שנה שם">✏️</button>
          <button className="btn" onClick={deleteCurrent} title="מחק פרויקט">🗑️</button>
          <button className="btn" onClick={toggleChat} title="הצג/הסתר צ'אט">💬</button>
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
            media={media} clips={clips} subs={subs} tracks={tracks} maxDuration={duration} currentAssembled={cur} selectedId={selectedId}
            onSeek={seek} onSelect={setSelectedId}
            onTrimBegin={beginTransaction}
            onTrim={(id, s, e) => setClipsLive((c) => (c ? trimClip(c, id, s, e, duration) : c))}
            onTrimEnd={commitTransaction}
            onReorder={(id, to) => setClips((c) => (c ? moveClip(c, id, to) : c))}
            renameTrack={renameTrack} toggleLock={toggleLock} toggleMute={toggleMute}
            cycleHeight={cycleHeight} reorderTrack={reorderTrack}
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

      {selectedClip && <div className="resizer" onMouseDown={startResizeInspector} title="גרור לשינוי רוחב ה-Inspector" />}
      {selectedClip && (
        <aside className="inspector-pane" style={{ width: inspectorWidth }}>
          <Inspector
            clip={selectedClip}
            assetName={mediaById(media, selectedClip.sourceId)?.name || "?"}
            assetKind={(mediaById(media, selectedClip.sourceId)?.kind as "video" | "image" | "audio") || "video"}
            assetDuration={mediaById(media, selectedClip.sourceId)?.duration || duration}
            trackName={videoTrack(tracks)?.name || "וידאו"}
            timelineStart={selectedIndex >= 0 && clips ? assembledStart(clips, selectedIndex) : 0}
            onUpdate={(patch) => updateClip(selectedClip.id, patch)}
          />
        </aside>
      )}

      {chatOpen && <div className="resizer" onMouseDown={startResize} title="גרור לשינוי רוחב הצ'אט" />}
      <aside className="chat-pane" style={{ width: chatOpen ? chatWidth : 0 }}>
        <Chat media={media} onAddMedia={addFiles} words={words} clips={clips} subs={subs} projectId={projectId}
          onProject={({ words: w, clips: c, subs: s }) => { setWords(w); setProject(c, s); }} />
      </aside>
      {!chatOpen && <button className="chat-reopen" onClick={toggleChat} title="פתח צ'אט">🤖</button>}
    </div>
  );
}
