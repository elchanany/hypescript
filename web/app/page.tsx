"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Word } from "@/lib/models";
import {
  assembledStart, Clip, MediaAsset, MediaKind, assembledToSource, clipEnabled, firstVideo, mediaById, moveClip, removeClip, splitClip, totalDur, trimClip, uid,
} from "@/lib/editor/model";
import { audioMuted, SCHEMA_VERSION, videoLocked, videoTrack } from "@/lib/editor/project";
import { migrateState } from "@/lib/editor/migrate";
import { scriptToClips } from "@/lib/editor/scriptClips";
import { Sub, edlToSubs, parseSrt, subsToSrt } from "@/lib/editor/subtitlesEdl";
import { createProject, deleteProject, ensureProject, kvGet, kvSet, listProjects, pk, ProjectMeta, renameProject, setCurrentProject, touchProject } from "@/lib/storage";
import { useEditor } from "@/hooks/useEditor";
import { Copy, Scissors, Eye, EyeOff, Trash2 } from "lucide-react";
import { ContextMenu, CtxItem } from "@/components/ui";
import TopBar from "@/components/TopBar";
import ToolRail, { LeftTab } from "@/components/ToolRail";
import MediaPanel from "@/components/MediaPanel";
import CaptionsPanel from "@/components/CaptionsPanel";
import InspectorPanel from "@/components/InspectorPanel";
import TimelineToolbar from "@/components/TimelineToolbar";
import Chat from "@/components/Chat";
import VideoPreview, { PreviewHandle } from "@/components/VideoPreview";
import Timeline from "@/components/Timeline";

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

  // layout state
  const [leftTab, setLeftTab] = useState<LeftTab>("media");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(360);
  const chatWidthRef = useRef(360); chatWidthRef.current = chatWidth;
  const [tlHeight, setTlHeight] = useState(300);
  const tlHeightRef = useRef(300); tlHeightRef.current = tlHeight;
  const [zoom, setZoom] = useState(1);
  const [snap, setSnap] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clipMenu, setClipMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const previewRef = useRef<PreviewHandle>(null);

  const main = useMemo(() => firstVideo(media), [media]);
  const duration = main?.duration || 0;

  const [restored, setRestored] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectMeta[]>([]);

  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then((d) => setGroqOk(!!d.transcription?.groq)).catch(() => {});
    const o = localStorage.getItem("hs_chatOpen"); if (o !== null) setChatOpen(o === "1");
    const w = parseInt(localStorage.getItem("hs_chatw") || "0", 10); if (w >= 300) setChatWidth(Math.min(560, w));
    const h = parseInt(localStorage.getItem("hs_tlh") || "0", 10); if (h >= 200) setTlHeight(Math.min(560, h));
  }, []);

  const startResizeChat = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX; const startW = chatWidthRef.current;
    const onMove = (ev: MouseEvent) => setChatWidth(Math.max(300, Math.min(560, startW + (startX - ev.clientX))));
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); localStorage.setItem("hs_chatw", String(chatWidthRef.current)); document.body.style.userSelect = ""; };
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  };
  const startResizeTL = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY; const startH = tlHeightRef.current;
    const onMove = (ev: MouseEvent) => setTlHeight(Math.max(200, Math.min(560, startH + (startY - ev.clientY))));
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); localStorage.setItem("hs_tlh", String(tlHeightRef.current)); document.body.style.userSelect = ""; };
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  };
  const toggleChat = () => setChatOpen((o) => { localStorage.setItem("hs_chatOpen", o ? "0" : "1"); return !o; });

  useEffect(() => {
    (async () => {
      const id = await ensureProject();
      setProjects(await listProjects());
      setProjectId(id);
    })();
  }, []);

  useEffect(() => {
    if (!projectId) return;
    setRestored(false);
    (async () => {
      const sm = await kvGet<any[]>(pk(projectId, "media"));
      setMedia((prev) => {
        prev.forEach((m) => URL.revokeObjectURL(m.url));
        if (!sm?.length) return [];
        const out: MediaAsset[] = [];
        for (const m of sm) {
          // rehydrate as a real File so downstream (ffmpeg extOf, render) always has a name.
          const file = m.blob instanceof File ? m.blob
            : m.blob instanceof Blob ? new File([m.blob], m.name || "media", { type: m.blob.type || "" })
            : null;
          if (!file) continue; // skip a broken record rather than throwing (never wipe good media)
          out.push({ id: m.id, name: m.name, kind: m.kind, duration: m.duration, file, url: URL.createObjectURL(file) });
        }
        return out;
      });
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
    setSaving(true);
    const t = setTimeout(async () => {
      await kvSet(pk(projectId, "state"), { schemaVersion: SCHEMA_VERSION, words, clips, subs, tracks });
      touchProject(projectId); setSaving(false);
    }, 500);
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
      setPhase("מוכן");
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
      setPhase("הרינדור הושלם");
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setRendering(false); setProgress(0); }
  };

  const generateSubs = () => {
    if (!words || !main) { setError("צריך לתמלל קודם."); return; }
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
  const deleteClipById = (id: string) => { if (clips && !videoLocked(tracks)) { setClips(removeClip(clips, id)); if (selectedId === id) setSelectedId(null); } };
  const deleteSel = () => { if (selectedId) deleteClipById(selectedId); };
  const duplicateClip = (id: string) => {
    if (videoLocked(tracks)) return;
    setClips((cs) => { if (!cs) return cs; const i = cs.findIndex((c) => c.id === id); if (i < 0) return cs; const copy = { ...cs[i], id: uid() }; return [...cs.slice(0, i + 1), copy, ...cs.slice(i + 1)]; });
  };
  const cycleHeight = (id: string) => { const t = tracks.find((x) => x.id === id); if (!t) return; const hs = [40, 58, 90]; const i = hs.findIndex((h) => h >= t.height); setTrackHeight(id, hs[(i + 1) % hs.length]); };

  const selectedClip = clips?.find((c) => c.id === selectedId) || null;
  const selectedIndex = selectedClip ? clips!.indexOf(selectedClip) : -1;
  const menuClip = clipMenu ? clips?.find((c) => c.id === clipMenu.id) || null : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (meta && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
      else if (e.key === " ") { e.preventDefault(); previewRef.current?.toggle(); }
      else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) { e.preventDefault(); deleteSel(); }
      else if (e.key.toLowerCase() === "s" && !meta && clips?.length) { e.preventDefault(); splitAtPlayhead(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const working = busy || rendering;
  const totalEdited = clips ? totalDur(clips) : duration;
  const vLocked = videoLocked(tracks);
  const projectName = projects.find((p) => p.id === projectId)?.name || "";

  const clipMenuItems: CtxItem[] = menuClip ? [
    { label: "שכפל", icon: Copy, onClick: () => duplicateClip(menuClip.id), disabled: vLocked },
    { label: "פצל בראש-הנגן", icon: Scissors, onClick: splitAtPlayhead, disabled: vLocked },
    { label: clipEnabled(menuClip) ? "השבת" : "הפעל", icon: clipEnabled(menuClip) ? EyeOff : Eye, onClick: () => updateClip(menuClip.id, { enabled: !clipEnabled(menuClip) }) },
    { sep: true, label: "" },
    { label: "מחק", icon: Trash2, danger: true, onClick: () => deleteClipById(menuClip.id), disabled: vLocked },
  ] : [];

  return (
    <div className="editor-root">
      <TopBar
        projectName={projectName} projects={projects} projectId={projectId} saving={saving}
        onSwitch={switchProject} onNew={newProject} onRename={renameCurrent} onDelete={deleteCurrent}
        canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo}
        chatOpen={chatOpen} onToggleChat={toggleChat}
        canExport={!!clips?.length} rendering={rendering} onExport={render}
      />

      {!groqOk && <div className="banner2">GROQ_API_KEY לא מוגדר ב-Vercel. <Link href="/settings">הגדרות</Link></div>}

      <div className="shell-body">
        <ToolRail active={leftTab} onSelect={setLeftTab} />

        <div className="leftpanel">
          {leftTab === "media" ? (
            <MediaPanel media={media} mainId={main?.id} onUpload={addFiles} onAddClip={addMediaClip} onRemove={removeMedia} />
          ) : (
            <CaptionsPanel
              script={script} onScript={setScript} onAnalyze={analyze} analyzing={busy}
              hasMain={!!main} hasWords={!!words} subs={subs}
              onGenerate={generateSubs} onImportSrt={importSrt} onExportSrt={exportSrt} onEditSub={editSub} onDelSub={delSub}
            />
          )}
        </div>

        <div className="main-area">
          <div className="upper">
            <div className="center-col">
              <VideoPreview ref={previewRef} media={media} clips={clips} subs={subs} onTime={setCur} audioMuted={audioMuted(tracks)} />
              {(working || phase || error) && (
                <div className="status-strip">
                  <span className={`s-msg ${error ? "err" : ""}`}>{error || phase}</span>
                  {working && <div className="s-bar"><div style={{ width: `${Math.round(progress * 100)}%` }} /></div>}
                </div>
              )}
            </div>

            <InspectorPanel
              clip={selectedClip}
              assetName={selectedClip ? mediaById(media, selectedClip.sourceId)?.name || "?" : ""}
              assetKind={(selectedClip && (mediaById(media, selectedClip.sourceId)?.kind as "video" | "image" | "audio")) || "video"}
              assetDuration={selectedClip ? mediaById(media, selectedClip.sourceId)?.duration || duration : 0}
              trackName={videoTrack(tracks)?.name || "וידאו"}
              timelineStart={selectedIndex >= 0 && clips ? assembledStart(clips, selectedIndex) : 0}
              onUpdate={(patch) => selectedClip && updateClip(selectedClip.id, patch)}
              projectName={projectName} mediaCount={media.length} sourceDuration={duration} editedDuration={totalEdited}
            />
          </div>

          <div className="timeline-region" style={{ height: tlHeight }}>
            <div className="tl-resize" onMouseDown={startResizeTL} title="גרור לשינוי גובה" />
            <TimelineToolbar
              selInfo={selectedClip ? `${(selectedClip.end - selectedClip.start).toFixed(1)}s` : ""}
              canSplit={!!clips?.length && !vLocked} canDelete={!!selectedId && !vLocked}
              onSplit={splitAtPlayhead} onDelete={deleteSel}
              snap={snap} onSnap={setSnap} zoom={zoom} onZoom={setZoom} onFit={() => setZoom(1)}
            />
            {clips ? (
              <Timeline
                media={media} clips={clips} subs={subs} tracks={tracks} maxDuration={duration} currentAssembled={cur} selectedId={selectedId}
                zoom={zoom} snap={snap}
                onSeek={seek} onSelect={setSelectedId}
                onTrimBegin={beginTransaction}
                onTrim={(id, s, e) => setClipsLive((c) => (c ? trimClip(c, id, s, e, duration) : c))}
                onTrimEnd={commitTransaction}
                onReorder={(id, to) => setClips((c) => (c ? moveClip(c, id, to) : c))}
                onClipMenu={(id, x, y) => setClipMenu({ id, x, y })}
                renameTrack={renameTrack} toggleLock={toggleLock} toggleMute={toggleMute}
                cycleHeight={cycleHeight} reorderTrack={reorderTrack}
              />
            ) : (
              <div className="tl-empty">טען מדיה כדי להתחיל — הסרטון יופיע כאן כקטע בציר, ותוכל לחתוך, לגרור ולפצל. או בקש מהסוכן ב-AI.</div>
            )}
          </div>
        </div>

        {chatOpen && (
          <aside className="chat-drawer" style={{ width: chatWidth }}>
            <div className="drawer-resize" onMouseDown={startResizeChat} title="גרור לשינוי רוחב" />
            <Chat media={media} onAddMedia={addFiles} onClose={toggleChat} words={words} clips={clips} subs={subs} projectId={projectId}
              onProject={({ words: w, clips: c, subs: s }) => { setWords(w); setProject(c, s); }} />
          </aside>
        )}
      </div>

      {clipMenu && menuClip && <ContextMenu x={clipMenu.x} y={clipMenu.y} items={clipMenuItems} onClose={() => setClipMenu(null)} />}
    </div>
  );
}
