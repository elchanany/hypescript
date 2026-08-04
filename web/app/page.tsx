"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Word } from "@/lib/models";
import {
  assembledStart, Clip, MediaAsset, MediaKind, clipEnabled, firstVideo, mediaById, moveClip, totalDur, trimClip, uid,
} from "@/lib/editor/model";
import { audioMuted, SCHEMA_VERSION, videoLocked, videoTrack, isAvLinked } from "@/lib/editor/project";
import { migrateState } from "@/lib/editor/migrate";
import { scriptToClips } from "@/lib/editor/scriptClips";
import { Sub, edlToSubs, edlToSubsWithScript, parseSrt, subsToSrt } from "@/lib/editor/subtitlesEdl";
import { makeImageOverlay, makeTextOverlay } from "@/lib/editor/overlay";
import { defaultCanvasFor } from "@/lib/editor/canvasCoords";
import { closeGap, isGapClip, trimGap } from "@/lib/editor/timelineOps";
import { applyFitMode, FitMode } from "@/lib/editor/videoTransform";
import { inspectorFocusFor, selectClip as selClipEntity } from "@/lib/editor/selection";
import { EditorApi, runCommand } from "@/lib/editor/commands";
import { ensureBuiltinCommands } from "@/lib/editor/commands.builtin";
import { createProject, deleteProject, ensureProject, kvGet, kvSet, listProjects, pk, ProjectMeta, renameProject, setCurrentProject, touchProject } from "@/lib/storage";
import { useEditor } from "@/hooks/useEditor";
import { Copy, Scissors, Eye, EyeOff, Trash2, SquareDashed, Unlink, Link2, Type } from "lucide-react";
import { ContextMenu, CtxItem } from "@/components/ui";
import { ConfirmDialog, NameDialog } from "@/components/Modal";
import { toast } from "@/lib/ui/toast";
import TopBar from "@/components/TopBar";
import ToolRail, { LeftTab } from "@/components/ToolRail";
import MediaPanel from "@/components/MediaPanel";
import CaptionsPanel from "@/components/CaptionsPanel";
import TextPanel from "@/components/TextPanel";
import InspectorPanel from "@/components/InspectorPanel";
import TimelineToolbar from "@/components/TimelineToolbar";
import Chat from "@/components/Chat";
import VideoPreview, { PreviewHandle } from "@/components/VideoPreview";
import Timeline from "@/components/Timeline";

ensureBuiltinCommands();

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
    clips, audioClips, subs, tracks, overlays, canvas, setClips, setAudioClips, setSubs, setProject, updateClip,
    addOverlay, updateOverlay, removeOverlay, setOverlaysLive, setCanvas,
    renameTrack, toggleLock, toggleMute, setTrackHeight, reorderTrack,
    beginTransaction, setClipsLive, setSubsLive, setAudioClipsLive, commitTransaction, cancelTransaction,
    setOverlays, reset: resetEditor, undo, redo, canUndo, canRedo,
    captionStyle, setCaptionStyle,
    videoTransform, setVideoTransform, setVideoTransformLive,
  } = useEditor();
  const [cur, setCur] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [hoveredSubId, setHoveredSubId] = useState<string | null>(null);
  /** Which track the clip was clicked on — inspector title (וידאו/שמע). */
  const [selectionTrack, setSelectionTrack] = useState<"video" | "audio" | null>(null);
  const [sourceSize, setSourceSize] = useState({ w: 1920, h: 1080 });
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
  const [chatWidth, setChatWidth] = useState(380);
  const chatWidthRef = useRef(380); chatWidthRef.current = chatWidth;
  const [dockSide, setDockSide] = useState<"left" | "right">("right");
  const dockSideRef = useRef<"left" | "right">("right"); dockSideRef.current = dockSide;
  const [tlHeight, setTlHeight] = useState(300);
  const tlHeightRef = useRef(300); tlHeightRef.current = tlHeight;
  const [leftW, setLeftW] = useState(264);
  const leftWRef = useRef(264); leftWRef.current = leftW;
  const [inspW, setInspW] = useState(300);
  const inspWRef = useRef(300); inspWRef.current = inspW;
  const [zoom, setZoom] = useState(1);
  const [snap, setSnap] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clipMenu, setClipMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [subMenu, setSubMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const previewRef = useRef<PreviewHandle>(null);
  const quoteSink = useRef<((seconds: number) => void) | null>(null);
  const clipsRef = useRef<Clip[] | null>(clips); clipsRef.current = clips;
  const audioClipsRef = useRef(audioClips); audioClipsRef.current = audioClips;
  const overlaysRef = useRef(overlays); overlaysRef.current = overlays;
  const mediaRef = useRef(media); mediaRef.current = media;
  const subsRef = useRef(subs); subsRef.current = subs;
  const canvasRef = useRef(canvas); canvasRef.current = canvas;
  const captionStyleRef = useRef(captionStyle); captionStyleRef.current = captionStyle;
  const videoTransformRef = useRef(videoTransform); videoTransformRef.current = videoTransform;
  const sourceSizeRef = useRef(sourceSize); sourceSizeRef.current = sourceSize;
  const curRef = useRef(cur); curRef.current = cur;
  const editorApiRef = useRef<EditorApi | null>(null);
  if (!editorApiRef.current) {
    editorApiRef.current = {
      getClips: () => clipsRef.current,
      setClips: (next) => setClips(next),
      getAudioClips: () => audioClipsRef.current,
      setAudioClips: (next) => setAudioClips(next),
      getOverlays: () => overlaysRef.current,
      setOverlays: (next) => setOverlays(next),
      updateOverlay,
      removeOverlay,
      addOverlay,
      updateClip,
      getMedia: () => mediaRef.current,
      getSubs: () => subsRef.current,
      setSubs: (next) => setSubs(next),
      updateSub: (id, patch) => setSubs((ss) => ss?.map((s) => (s.id === id ? { ...s, ...patch } : s)) || ss),
      getCanvas: () => canvasRef.current,
      getVideoTransform: () => videoTransformRef.current,
      setVideoTransform: (vt) => setVideoTransform(vt),
      selectClip: (id, track) => {
        setSelectedId(id);
        if (id) { setSelectedOverlayId(null); setSelectedSubId(null); setSelectionTrack(track || "video"); }
        else setSelectionTrack(null);
      },
      selectOverlay: (id) => {
        setSelectedOverlayId(id);
        if (id) { setSelectedId(null); setSelectedSubId(null); setSelectionTrack(null); }
      },
      selectCaption: (id) => {
        setSelectedSubId(id);
        if (id) { setSelectedId(null); setSelectedOverlayId(null); setSelectionTrack(null); }
      },
      seek: (t) => { setCur(t); previewRef.current?.seek(t); },
      getPlayhead: () => curRef.current,
      getCaptionStyle: () => captionStyleRef.current,
      setCaptionStyle: (s) => setCaptionStyle(s),
      getMediaDuration: (sourceId) => mediaRef.current.find((m) => m.id === sourceId)?.duration ?? 0,
      getSourceSize: () => sourceSizeRef.current,
    };
  }

  const quotePlace = (seconds: number) => {
    setChatOpen(true);
    localStorage.setItem("hs_chatOpen", "1");
    const tryInsert = (n = 0) => {
      if (quoteSink.current) { quoteSink.current(seconds); return; }
      if (n < 20) requestAnimationFrame(() => tryInsert(n + 1));
    };
    tryInsert();
  };

  const main = useMemo(() => firstVideo(media), [media]);
  const duration = main?.duration || 0;

  const [restored, setRestored] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [projDlg, setProjDlg] = useState<"none" | "create" | "rename" | "delete">("none");
  const [burnCaptions, setBurnCaptions] = useState(true);
  const [nameDlg, setNameDlg] = useState<
    | { kind: "none" }
    | { kind: "track"; id: string; name: string }
    | { kind: "overlayText"; id: string; text: string }
    | { kind: "captionText"; id: string; text: string }
  >({ kind: "none" });

  useEffect(() => {
    try {
      const v = localStorage.getItem("hs_burnCaptions");
      if (v === "0") setBurnCaptions(false);
      if (v === "1") setBurnCaptions(true);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem("hs_burnCaptions", burnCaptions ? "1" : "0"); } catch { /* ignore */ }
  }, [burnCaptions]);

  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then((d) => setGroqOk(!!d.transcription?.groq)).catch(() => {});
    const o = localStorage.getItem("hs_chatOpen"); if (o !== null) setChatOpen(o === "1");
    const w = parseInt(localStorage.getItem("hs_chatw") || "0", 10); if (w >= 320) setChatWidth(Math.min(640, w));
    const ds = localStorage.getItem("hs_dockside"); if (ds === "left" || ds === "right") setDockSide(ds);
    const h = parseInt(localStorage.getItem("hs_tlh") || "0", 10); if (h >= 200) setTlHeight(Math.min(560, h));
    const lw = parseInt(localStorage.getItem("hs_leftw") || "0", 10); if (lw >= 220) setLeftW(Math.min(440, lw));
    const iw = parseInt(localStorage.getItem("hs_inspw") || "0", 10); if (iw >= 260) setInspW(Math.min(460, iw));
  }, []);

  const startResizeChat = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX; const startW = chatWidthRef.current;
    const onMove = (ev: MouseEvent) => {
      const delta = dockSideRef.current === "right" ? (startX - ev.clientX) : (ev.clientX - startX);
      setChatWidth(Math.max(320, Math.min(640, startW + delta)));
    };
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); localStorage.setItem("hs_chatw", String(chatWidthRef.current)); document.body.style.userSelect = ""; };
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  };
  const resetChatWidth = () => { setChatWidth(380); localStorage.setItem("hs_chatw", "380"); };
  const toggleDockSide = () => setDockSide((s) => { const n = s === "right" ? "left" : "right"; localStorage.setItem("hs_dockside", n); return n; });
  const startResizeTL = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY; const startH = tlHeightRef.current;
    const onMove = (ev: MouseEvent) => setTlHeight(Math.max(200, Math.min(560, startH + (startY - ev.clientY))));
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); localStorage.setItem("hs_tlh", String(tlHeightRef.current)); document.body.style.userSelect = ""; };
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  };
  const startResizeLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX; const startW = leftWRef.current;
    const onMove = (ev: MouseEvent) => setLeftW(Math.max(220, Math.min(440, startW + (ev.clientX - startX))));
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); localStorage.setItem("hs_leftw", String(leftWRef.current)); document.body.style.userSelect = ""; };
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  };
  const resetLeft = () => { setLeftW(264); localStorage.setItem("hs_leftw", "264"); };
  const startResizeInsp = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX; const startW = inspWRef.current;
    const onMove = (ev: MouseEvent) => setInspW(Math.max(260, Math.min(460, startW - (ev.clientX - startX))));
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); localStorage.setItem("hs_inspw", String(inspWRef.current)); document.body.style.userSelect = ""; };
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  };
  const resetInsp = () => { setInspW(300); localStorage.setItem("hs_inspw", "300"); };
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
      resetEditor({
        clips: st.clips, audioClips: st.audioClips, subs: st.subs, tracks: st.tracks,
        overlays: st.overlays, canvas: st.canvas, captionStyle: st.captionStyle, videoTransform: st.videoTransform,
      });
      setCur(0); setSelectedId(null); setSelectedOverlayId(null); setSelectedSubId(null); setSelectionTrack(null);
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
      await kvSet(pk(projectId, "state"), {
        schemaVersion: SCHEMA_VERSION, words, clips, audioClips, subs, tracks, overlays, canvas, captionStyle, videoTransform,
      });
      touchProject(projectId); setSaving(false);
    }, 500);
    return () => clearTimeout(t);
  }, [words, clips, audioClips, subs, tracks, overlays, canvas, captionStyle, videoTransform, restored, projectId]);

  const switchProject = async (id: string) => { if (id === projectId) return; await setCurrentProject(id); setProjectId(id); };
  const newProject = () => setProjDlg("create");
  const renameCurrent = () => { if (projectId) setProjDlg("rename"); };
  const deleteCurrent = () => { if (projectId) setProjDlg("delete"); };

  const submitCreate = async (name: string) => {
    setProjDlg("none");
    const id = await createProject(name || "פרויקט");
    setProjects(await listProjects()); setProjectId(id);
    toast.success("הפרויקט נוצר", name);
  };
  const submitRename = async (name: string) => {
    if (!projectId) return;
    setProjDlg("none");
    await renameProject(projectId, name);
    setProjects(await listProjects());
    toast.success("השם עודכן", name);
  };
  const submitDelete = async () => {
    if (!projectId) return;
    setProjDlg("none");
    const oldName = projects.find((p) => p.id === projectId)?.name || "";
    await deleteProject(projectId);
    const list = await listProjects(); setProjects(list);
    if (list.length) { await setCurrentProject(list[0].id); setProjectId(list[0].id); }
    else { const id = await createProject("פרויקט 1"); setProjects(await listProjects()); setProjectId(id); }
    toast.success("הפרויקט נמחק", oldName);
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

  const seek = (a: number) => { setCur(a); previewRef.current?.seek(a); };

  const removeMedia = (id: string) => {
    setMedia((ms) => { const m = ms.find((x) => x.id === id); if (m) URL.revokeObjectURL(m.url); return ms.filter((x) => x.id !== id); });
    setClips((cs) => (cs ? cs.filter((c) => c.sourceId !== id) : cs));
    setOverlays((os) => os.filter((o) => o.assetId !== id));
    if (selectedOverlayId) setSelectedOverlayId(null);
  };
  const addMediaClip = (asset: MediaAsset) => {
    if (asset.kind === "image") {
      // image -> canvas overlay (CapCut-style), not a main-track clip
      const end = Math.max(cur + 4, (clips ? totalDur(clips) : duration) || 4);
      const apply = (iw?: number, ih?: number) => {
        const o = makeImageOverlay(asset.id, canvas.width, canvas.height, overlays, cur, end, iw && ih ? { width: iw, height: ih } : undefined);
        addOverlay(o); setSelectedOverlayId(o.id); setSelectedId(null); setSelectedSubId(null); setSelectionTrack(null);
        // ensure playhead is inside the overlay's visible window
        if (cur < o.start || cur > o.end) seek(o.start);
      };
      const img = new Image();
      img.onload = () => apply(img.naturalWidth, img.naturalHeight);
      img.onerror = () => apply();
      img.src = asset.url;
      return;
    }
    setClips((cs) => [...(cs || []), { id: uid(), sourceId: asset.id, start: 0, end: asset.duration }]);
  };
  const addTextOverlay = () => {
    const end = Math.max(cur + 4, (clips ? totalDur(clips) : duration) || 4);
    const o = makeTextOverlay(canvas.width, canvas.height, overlays, "טקסט חדש", cur, end);
    addOverlay(o); setSelectedOverlayId(o.id); setSelectedId(null); setSelectedSubId(null); setSelectionTrack(null);
  };
  const selectClip = (id: string | null, track: "video" | "audio" = "video") => {
    setSelectedId(id);
    if (id) {
      setSelectedOverlayId(null);
      setSelectedSubId(null);
      setSelectionTrack(track);
    } else {
      setSelectionTrack(null);
    }
  };
  const selectOverlay = (id: string | null) => {
    setSelectedOverlayId(id);
    if (id) {
      setSelectedId(null);
      setSelectedSubId(null);
      setSelectionTrack(null);
      const o = overlays.find((x) => x.id === id);
      // jump playhead into the overlay window so it becomes visible in preview
      if (o && (cur < o.start - 1e-3 || cur > o.end + 1e-3)) seek(o.start + 0.01);
    }
  };
  const selectSub = (id: string | null) => {
    setSelectedSubId(id);
    if (id) {
      setSelectedId(null);
      setSelectedOverlayId(null);
      setSelectionTrack(null);
      const s = subs?.find((x) => x.id === id);
      if (s && (cur < s.start - 1e-3 || cur > s.end + 1e-3)) seek(s.start + 0.01);
    }
  };
  const updateSub = (id: string, patch: Partial<Sub>) => {
    setSubs((ss) => ss?.map((s) => (s.id === id ? { ...s, ...patch } : s)) || ss);
  };
  const onCanvasDetected = (w: number, h: number) => {
    setSourceSize({ w, h });
    // only auto-set once from the first video if still at the default 1920×1080
    if (canvas.width === 1920 && canvas.height === 1080 && (w !== 1920 || h !== 1080)) setCanvas(defaultCanvasFor(w, h));
  };

  const clearAllSelection = () => {
    setSelectedId(null); setSelectedOverlayId(null); setSelectedSubId(null); setSelectionTrack(null);
  };

  const selectMainVideo = () => {
    // Select the clip under playhead on the video track (opens Video Inspector + bbox).
    if (!clips?.length) { setSelectionTrack("video"); return; }
    const { index } = (() => {
      let acc = 0;
      for (let i = 0; i < clips.length; i++) {
        const d = Math.max(0, clips[i].end - clips[i].start);
        if (cur <= acc + d + 1e-3) return { index: i };
        acc += d;
      }
      return { index: clips.length - 1 };
    })();
    const c = clips[Math.max(0, index)];
    if (c) selectClip(c.id, "video");
  };

  const applyVideoFit = (mode: FitMode) => {
    if (!editorApiRef.current) {
      setVideoTransform((vt) => applyFitMode(vt, mode, canvas, sourceSize.w, sourceSize.h));
      return;
    }
    const res = runCommand("video.setFitMode", editorApiRef.current, { mode });
    if (!res.ok) setError(res.error);
  };

  const analyze = async () => {
    setError("");
    if (!main) return setError("טען סרטון קודם.");
    setBusy(true); setProgress(0);
    try {
      let ws = words;
      if (!ws) {
        setPhase("מתמלל…");
        const { transcribeMediaFile } = await import("@/lib/transcribe/client");
        ws = await transcribeMediaFile({
          file: main.file,
          durationSec: duration || main.duration || 0,
          provider: "groq",
          model: "whisper-large-v3",
          onPhase: setPhase,
          onProgress: setProgress,
        });
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
      const { getRenderBackend } = await import("@/lib/render/RenderBackend");
      const backend = getRenderBackend();
      setPhase("מרנדר בדפדפן…");
      const blob = await backend.renderProject(
        {
          media, clips, audioMuted: audioMuted(tracks), overlays, canvas,
          subs, captionStyle, burnCaptions: burnCaptions && !!subs?.length,
          videoTransform, sourceSize,
        },
        (r) => setProgress(Math.min(1, r)),
      );
      download(blob, (main?.name.replace(/\.[^.]+$/, "") || "video") + "_edited.mp4");
      setPhase("הרינדור הושלם");
      toast.success("הייצוא הושלם", burnCaptions && subs?.length ? "כולל כתוביות צרובות" : undefined);
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setRendering(false); setProgress(0); }
  };

  const generateSubs = () => {
    if (!words || !main) { setError("צריך לתמלל קודם."); return; }
    const cl = clips?.length ? clips : [{ id: uid(), sourceId: main.id, start: 0, end: duration }];
    const getWords = (sid: string) => (sid === main?.id ? words : null);
    const clean = script.trim();
    setSubs(clean
      ? edlToSubsWithScript(cl, getWords, clean)
      : edlToSubs(cl, getWords));
  };
  const exportSrt = () => {
    let s = subs;
    if (!s) {
      if (!words || !main) return;
      const cl = clips?.length ? clips : [{ id: uid(), sourceId: main.id, start: 0, end: duration }];
      const getWords = (sid: string) => (sid === main?.id ? words : null);
      const clean = script.trim();
      s = clean ? edlToSubsWithScript(cl, getWords, clean) : edlToSubs(cl, getWords);
      setSubs(s);
    }
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
    const res = runCommand("clip.splitAtPlayhead", editorApiRef.current!);
    if (!res.ok) setError(res.error);
  };
  const deleteClipById = (id: string, leaveGap = false) => {
    if (!clips || videoLocked(tracks) || !editorApiRef.current) return;
    const c = clips.find((x) => x.id === id);
    if (!c) return;
    const cmd = isGapClip(c) ? "gap.close" : leaveGap ? "clip.delete.leaveGap" : "clip.delete.ripple";
    const res = runCommand(cmd, editorApiRef.current, { id });
    if (!res.ok) setError(res.error);
  };
  const deleteSel = (leaveGap = false) => {
    if (selectedOverlayId) {
      const res = runCommand("overlay.delete", editorApiRef.current!, { id: selectedOverlayId });
      if (!res.ok) setError(res.error);
      return;
    }
    if (selectedSubId) {
      setSubs((ss) => ss?.filter((s) => s.id !== selectedSubId) || ss);
      setSelectedSubId(null);
      return;
    }
    if (selectedId) deleteClipById(selectedId, leaveGap);
  };
  const duplicateClip = (id: string) => {
    if (videoLocked(tracks) || !editorApiRef.current) return;
    const res = runCommand("clip.duplicate", editorApiRef.current, { id });
    if (!res.ok) setError(res.error);
  };
  const rollSelected = (delta: number) => {
    if (!selectedId || videoLocked(tracks) || !editorApiRef.current) return;
    const res = runCommand("clip.roll", editorApiRef.current, { id: selectedId, delta });
    if (!res.ok) setError(res.error);
  };
  const slipSelected = (delta: number) => {
    if (!selectedId || videoLocked(tracks) || !editorApiRef.current) return;
    const clip = clipsRef.current?.find((c) => c.id === selectedId);
    if (!clip || isGapClip(clip)) return;
    const res = runCommand("clip.slip", editorApiRef.current, { id: selectedId, delta });
    if (!res.ok) setError(res.error);
  };
  const cycleHeight = (id: string) => { const t = tracks.find((x) => x.id === id); if (!t) return; const hs = [40, 58, 90]; const i = hs.findIndex((h) => h >= t.height); setTrackHeight(id, hs[(i + 1) % hs.length]); };

  const selectedClip = (
    selectionTrack === "audio" && audioClips
      ? audioClips.find((c) => c.id === selectedId)
      : clips?.find((c) => c.id === selectedId)
  ) || null;
  const selectedIsGap = !!selectedClip && isGapClip(selectedClip);
  const selectedOverlay = overlays.find((o) => o.id === selectedOverlayId) || null;
  const selectedSub = subs?.find((s) => s.id === selectedSubId) || null;
  const selectedIndex = selectedClip
    ? (selectionTrack === "audio" && audioClips
      ? audioClips.indexOf(selectedClip)
      : (clips ? clips.indexOf(selectedClip) : -1))
    : -1;
  const menuClip = clipMenu
    ? (clips?.find((c) => c.id === clipMenu.id) || audioClips?.find((c) => c.id === clipMenu.id) || null)
    : null;
  const avLinked = isAvLinked({ audioClips });
  const audioEdl = audioClips ?? clips;
  const inspectorFocus = inspectorFocusFor(
    selectedOverlay
      ? { kind: "overlay", id: selectedOverlay.id, track: "overlay" }
      : selectedSub
        ? { kind: "caption", id: selectedSub.id, track: "caption" }
        : selectedClip
          ? selClipEntity(selectedClip.id, selectionTrack || "video", selectedIsGap)
          : { kind: "none", id: null, track: null },
    { overlayKind: selectedOverlay?.kind || null },
  );
  const inspectorTrackName = selectionTrack === "audio"
    ? (tracks.find((t) => t.type === "audio")?.name || "אודיו")
    : (videoTrack(tracks)?.name || "וידאו");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (meta && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
      else if (e.key === " ") { e.preventDefault(); previewRef.current?.toggle(); }
      else if ((e.key === "Delete" || e.key === "Backspace") && (selectedId || selectedOverlayId || selectedSubId)) { e.preventDefault(); deleteSel(e.shiftKey); }
      else if (e.key === "Escape") { clearAllSelection(); }
      else if (e.key.toLowerCase() === "s" && !meta && clips?.length) { e.preventDefault(); splitAtPlayhead(); }
      else if (meta && e.key.toLowerCase() === "d" && selectedId && !vLocked) {
        e.preventDefault();
        duplicateClip(selectedId);
      }
      else if (selectedOverlayId && !meta && !e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        const o = overlays.find((x) => x.id === selectedOverlayId);
        if (o && !o.locked) updateOverlay(o.id, { transform: { ...o.transform, x: o.transform.x + dx, y: o.transform.y + dy } });
      }
      else if (selectedSubId && !meta && !e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        const s = subs?.find((x) => x.id === selectedSubId);
        if (s) updateSub(s.id, { x: (s.x ?? canvas.width / 2) + dx, y: (s.y ?? canvas.height * 0.88) + dy });
      }
      else if (selectedId && selectionTrack !== "audio" && !selectedIsGap && !meta && !e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        setVideoTransform((vt) => ({ ...vt, fitMode: "custom", x: vt.x + dx, y: vt.y + dy }));
      }
      else if (selectedId && !videoLocked(tracks) && (e.key === "[" || e.key === "]")) {
        e.preventDefault();
        slipSelected(e.key === "]" ? 0.1 : -0.1);
      }
      else if (selectedId && !videoLocked(tracks) && e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        rollSelected(e.key === "ArrowRight" ? 0.1 : -0.1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const working = busy || rendering;
  const totalEdited = clips ? totalDur(clips) : duration;
  const timelineDuration = Math.max(duration, clips ? totalDur(clips) : 0, ...overlays.map((o) => o.end), 0.001);
  const vLocked = videoLocked(tracks);
  const projectName = projects.find((p) => p.id === projectId)?.name || "";
  const agentSelLabel = selectedOverlay
    ? (selectedOverlay.kind === "text" ? (selectedOverlay.text || "טקסט") : (mediaById(media, selectedOverlay.assetId || "")?.name || "תמונה"))
    : selectedSub
      ? (selectedSub.text.slice(0, 40) || "כתובית")
      : selectedClip ? (isGapClip(selectedClip) ? "רווח" : (mediaById(media, selectedClip.sourceId)?.name || "קטע")) : null;
  const clampOverlayRange = (start: number, end: number) => {
    const s = Math.max(0, Math.min(start, end - 0.05));
    const e = Math.max(end, s + 0.05);
    return { start: s, end: e };
  };
  const setOverlayRangeLive = (id: string, start: number, end: number) => {
    const range = clampOverlayRange(start, end);
    setOverlaysLive((os) => os.map((o) => (o.id === id ? { ...o, ...range } : o)));
  };
  const setOverlayMoveLive = (id: string, start: number, end: number) => {
    const dur = Math.max(0.05, end - start);
    const s = Math.max(0, start);
    setOverlaysLive((os) => os.map((o) => (o.id === id ? { ...o, start: s, end: s + dur } : o)));
  };

  const dockHandle = (
    <div className="col-resize" onMouseDown={startResizeChat} onDoubleClick={resetChatWidth}
      title="גרור לשינוי רוחב · דאבל-קליק לאיפוס" role="separator" aria-orientation="vertical" aria-label="שינוי רוחב פאנל הסוכן" />
  );
  const agentDock = chatOpen ? (
    <>
      {dockSide === "right" && dockHandle}
      <aside className="agent-dock" style={{ width: chatWidth }}>
        <Chat media={media} onAddMedia={addFiles} onClose={toggleChat} words={words} clips={clips} subs={subs}
          script={script} overlays={overlays} canvas={canvas} projectId={projectId}
          onProject={({ words: w, clips: c, subs: s, overlays: ovs }) => {
            setWords(w); setProject(c, s);
            if (ovs) setOverlays(ovs);
          }}
          playhead={cur} selectionLabel={agentSelLabel} dockSide={dockSide} onToggleDock={toggleDockSide}
          quoteSink={quoteSink} />
      </aside>
      {dockSide === "left" && dockHandle}
    </>
  ) : null;

  const menuSub = subMenu ? subs?.find((s) => s.id === subMenu.id) || null : null;

  const clipMenuItems: CtxItem[] = menuClip ? isGapClip(menuClip) ? [
    { label: "סגור רווח", icon: SquareDashed, onClick: () => deleteClipById(menuClip.id), disabled: vLocked },
    { label: "מחק רווח (ריפל)", icon: Trash2, danger: true, onClick: () => deleteClipById(menuClip.id), disabled: vLocked },
  ] : [
    { label: "שכפל", icon: Copy, onClick: () => duplicateClip(menuClip.id), disabled: vLocked },
    { label: "פצל בראש-הנגן", icon: Scissors, onClick: splitAtPlayhead, disabled: vLocked },
    { label: clipEnabled(menuClip) ? "השבת" : "הפעל", icon: clipEnabled(menuClip) ? EyeOff : Eye, onClick: () => updateClip(menuClip.id, { enabled: !clipEnabled(menuClip) }) },
    ...(selectionTrack === "audio" || !avLinked ? [] : [
      { label: "נתק אודיו", icon: Unlink, onClick: () => {
        const res = runCommand("av.detachAudio", editorApiRef.current!);
        if (!res.ok) setError(res.error);
      }, disabled: vLocked } as CtxItem,
    ]),
    ...(!avLinked ? [
      { label: "קשר מחדש A/V", icon: Link2, onClick: () => {
        const res = runCommand("av.relink", editorApiRef.current!);
        if (!res.ok) setError(res.error);
      }, disabled: vLocked } as CtxItem,
    ] : []),
    { sep: true, label: "" },
    { label: "מחק והשאר רווח", icon: SquareDashed, onClick: () => deleteClipById(menuClip.id, true), disabled: vLocked, kbd: "Shift+Delete" },
    { label: "מחק (ריפל)", icon: Trash2, danger: true, onClick: () => deleteClipById(menuClip.id), disabled: vLocked, kbd: "Delete" },
  ] : [];

  const subMenuItems: CtxItem[] = menuSub ? [
    { label: "ערוך טקסט", icon: Type, onClick: () => setNameDlg({ kind: "captionText", id: menuSub.id, text: menuSub.text }) },
    { label: "פצל בכתובית", icon: Scissors, onClick: () => {
      const mid = (menuSub.start + menuSub.end) / 2;
      if (mid - menuSub.start < 0.05 || menuSub.end - mid < 0.05) return;
      setSubs((ss) => {
        if (!ss) return ss;
        const i = ss.findIndex((x) => x.id === menuSub.id);
        if (i < 0) return ss;
        const left = { ...ss[i], end: mid };
        const right = { ...ss[i], id: uid("s"), start: mid };
        return [...ss.slice(0, i), left, right, ...ss.slice(i + 1)];
      });
    } },
    { label: "מזג עם הקודמת", icon: Link2, onClick: () => {
      setSubs((ss) => {
        if (!ss) return ss;
        const i = ss.findIndex((x) => x.id === menuSub.id);
        if (i <= 0) return ss;
        const prev = ss[i - 1];
        const cur = ss[i];
        const merged = { ...prev, end: cur.end, text: `${prev.text} ${cur.text}`.trim() };
        return [...ss.slice(0, i - 1), merged, ...ss.slice(i + 1)];
      });
    } },
    { label: "מזג עם הבאה", icon: Link2, onClick: () => {
      setSubs((ss) => {
        if (!ss) return ss;
        const i = ss.findIndex((x) => x.id === menuSub.id);
        if (i < 0 || i >= ss.length - 1) return ss;
        const cur = ss[i];
        const next = ss[i + 1];
        const merged = { ...cur, end: next.end, text: `${cur.text} ${next.text}`.trim() };
        return [...ss.slice(0, i), merged, ...ss.slice(i + 2)];
      });
    } },
    { sep: true, label: "" },
    { label: "מחק", icon: Trash2, danger: true, onClick: () => delSub(menuSub.id) },
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
        {dockSide === "left" && agentDock}
        <ToolRail active={leftTab} onSelect={setLeftTab} />

        <div className="leftpanel" style={{ width: leftW }}>
          {leftTab === "media" ? (
            <MediaPanel media={media} mainId={main?.id} onUpload={addFiles} onAddClip={addMediaClip} onRemove={removeMedia} />
          ) : leftTab === "text" ? (
            <TextPanel onAddText={addTextOverlay} />
          ) : (
            <CaptionsPanel
              script={script} onScript={setScript} onAnalyze={analyze} analyzing={busy}
              hasMain={!!main} hasWords={!!words} subs={subs}
              onGenerate={generateSubs} onImportSrt={importSrt} onExportSrt={exportSrt} onEditSub={editSub} onDelSub={delSub}
              captionStyle={captionStyle}
              burnCaptions={burnCaptions}
              onBurnCaptions={setBurnCaptions}
              onCaptionStyle={(patch) => {
                if (!editorApiRef.current) { setCaptionStyle((s) => ({ ...s, ...patch })); return; }
                const res = runCommand("caption.setStyle", editorApiRef.current, patch);
                if (!res.ok) setError(res.error);
              }}
            />
          )}
        </div>
        <div className="col-resize" onMouseDown={startResizeLeft} onDoubleClick={resetLeft}
          title="גרור לשינוי רוחב · דאבל-קליק לאיפוס" role="separator" aria-orientation="vertical" aria-label="שינוי רוחב פאנל מדיה" />

        <div className="main-area">
          <div className="upper">
            <div className="center-col">
              <VideoPreview ref={previewRef} media={media} clips={clips} subs={subs} onTime={setCur}
                onCopyPosition={quotePlace} audioMuted={audioMuted(tracks)}
                canvas={canvas} overlays={overlays} selectedOverlayId={selectedOverlayId}
                onSelectOverlay={selectOverlay}
                onBeginOverlay={beginTransaction}
                onOverlayLive={(u) => setOverlaysLive(u)}
                onCommitOverlay={commitTransaction}
                onCancelOverlay={cancelTransaction}
                onEditOverlayText={(id, current) => setNameDlg({ kind: "overlayText", id, text: current })}
                onCanvasDetected={onCanvasDetected}
                captionStyle={captionStyle}
                videoTransform={videoTransform}
                selectedMainVideo={!!selectedClip && selectionTrack !== "audio" && !selectedIsGap}
                onSelectMainVideo={selectMainVideo}
                onBeginVideoTransform={beginTransaction}
                onVideoTransformLive={(vt) => setVideoTransformLive(vt)}
                onCommitVideoTransform={commitTransaction}
                onCancelVideoTransform={cancelTransaction}
                selectedSubId={selectedSubId}
                hoveredSubId={hoveredSubId}
                onHoverSub={setHoveredSubId}
                onSelectSub={selectSub}
                onBeginSub={beginTransaction}
                onSubLive={(u) => setSubsLive(u)}
                onCommitSub={commitTransaction}
                onCancelSub={cancelTransaction}
                onEditSubText={(id, text) => setNameDlg({ kind: "captionText", id, text })}
                onClearSelection={clearAllSelection}
                videoLocked={vLocked}
              />
              {(working || phase || error) && (
                <div className="status-strip">
                  <span className={`s-msg ${error ? "err" : ""}`}>{error || phase}</span>
                  {working && <div className="s-bar"><div style={{ width: `${Math.round(progress * 100)}%` }} /></div>}
                </div>
              )}
            </div>

            <div className="col-resize" onMouseDown={startResizeInsp} onDoubleClick={resetInsp}
              title="גרור לשינוי רוחב · דאבל-קליק לאיפוס" role="separator" aria-orientation="vertical" aria-label="שינוי רוחב פאנל מאפיינים" />
            <InspectorPanel
              width={inspW}
              clip={selectedClip}
              overlay={selectedOverlay}
              sub={selectedSub}
              focus={inspectorFocus}
              assetName={selectedClip ? mediaById(media, selectedClip.sourceId)?.name || "?" : (selectedOverlay?.kind === "image" ? (mediaById(media, selectedOverlay.assetId || "")?.name || "?") : "")}
              assetKind={(selectedClip && (mediaById(media, selectedClip.sourceId)?.kind as "video" | "image" | "audio")) || "video"}
              assetDuration={selectedClip ? mediaById(media, selectedClip.sourceId)?.duration || duration : 0}
              trackName={inspectorTrackName}
              timelineStart={selectedIndex >= 0
                ? assembledStart(
                  (selectionTrack === "audio" && audioClips) ? audioClips : (clips || []),
                  selectedIndex,
                )
                : 0}
              onUpdate={(patch) => selectedClip && updateClip(selectedClip.id, patch)}
              onUpdateOverlay={(patch) => selectedOverlay && updateOverlay(selectedOverlay.id, patch)}
              onUpdateSub={(patch) => selectedSub && updateSub(selectedSub.id, patch)}
              canvas={canvas}
              videoTransform={videoTransform}
              onVideoTransform={(patch) => setVideoTransform((vt) => ({ ...vt, ...patch, fitMode: patch.fitMode || "custom" }))}
              onFitMode={applyVideoFit}
              avLinked={avLinked}
              onDetachAudio={() => {
                const res = runCommand("av.detachAudio", editorApiRef.current!);
                if (!res.ok) setError(res.error);
              }}
              onRelinkAudio={() => {
                const res = runCommand("av.relink", editorApiRef.current!);
                if (!res.ok) setError(res.error);
              }}
              projectName={projectName} mediaCount={media.length} sourceDuration={duration} editedDuration={totalEdited}
            />
          </div>

          <div className="timeline-region" style={{ height: tlHeight }}>
            <div className="tl-resize" onMouseDown={startResizeTL} title="גרור לשינוי גובה" />
            <TimelineToolbar
              selInfo={selectedOverlay ? `${(selectedOverlay.end - selectedOverlay.start).toFixed(1)}s` : selectedClip ? `${(selectedClip.end - selectedClip.start).toFixed(1)}s` : ""}
              canSplit={!!clips?.length && !vLocked && !selectedIsGap} canDelete={(!!selectedId && !vLocked) || !!selectedOverlayId || !!selectedSubId}
              onSplit={splitAtPlayhead} onDelete={deleteSel}
              onDeleteLeaveGap={() => deleteSel(true)} canLeaveGap={!!selectedClip && !selectedIsGap && !vLocked}
              canRoll={!!selectedId && !vLocked && !!clips && clips.length >= 2 && !selectedIsGap}
              canSlip={!!selectedId && !vLocked && !selectedIsGap}
              onRoll={rollSelected} onSlip={slipSelected}
              snap={snap} onSnap={setSnap} zoom={zoom} onZoom={setZoom} onFit={() => setZoom(1)}
            />
            {clips ? (
              <Timeline
                media={media} clips={clips} subs={subs} overlays={overlays} tracks={tracks}
                maxDuration={timelineDuration}
                currentAssembled={cur} selectedId={selectedId} selectedOverlayId={selectedOverlayId}
                selectedSubId={selectedSubId} selectionTrack={selectionTrack}
                zoom={zoom} onZoom={setZoom} snap={snap}
                onSeek={seek} onSelect={selectClip} onSelectOverlay={selectOverlay} onSelectSub={selectSub}
                onTrimBegin={beginTransaction}
                onTrim={(id, s, e) => {
                  if (selectionTrack === "audio" && audioClips) {
                    setAudioClipsLive((cs) => {
                      if (!cs) return cs;
                      const clip = cs.find((x) => x.id === id);
                      return clip && isGapClip(clip) ? trimGap(cs, id, e - s) : trimClip(cs, id, s, e, duration);
                    });
                    return;
                  }
                  setClipsLive((c) => {
                    if (!c) return c;
                    const clip = c.find((x) => x.id === id);
                    return clip && isGapClip(clip) ? trimGap(c, id, e - s) : trimClip(c, id, s, e, duration);
                  });
                }}
                onTrimEnd={commitTransaction}
                onReorder={(id, to) => setClips((c) => (c ? moveClip(c, id, to) : c))}
                onMoveToTime={(id, time) => {
                  if (!editorApiRef.current) return;
                  const res = runCommand("clip.moveToTime", editorApiRef.current, { id, time });
                  if (!res.ok) setError(res.error);
                }}
                audioClips={audioClips}
                avLinked={avLinked}
                onClipMenu={(id, x, y) => setClipMenu({ id, x, y })}
                onOverlayTrimBegin={beginTransaction}
                onOverlayTrim={setOverlayRangeLive}
                onOverlayTrimEnd={commitTransaction}
                onOverlayMove={setOverlayMoveLive}
                onSubTrimBegin={beginTransaction}
                onSubTrim={(id, start, end) => {
                  setSubsLive((ss) => ss?.map((s) => (s.id === id ? { ...s, start, end } : s)) || ss);
                }}
                onSubTrimEnd={commitTransaction}
                onSubMove={(id, start, end) => {
                  const dur = Math.max(0.05, end - start);
                  const s0 = Math.max(0, start);
                  setSubsLive((ss) => ss?.map((s) => (s.id === id ? { ...s, start: s0, end: s0 + dur } : s)) || ss);
                }}
                onSubMenu={(id, x, y) => setSubMenu({ id, x, y })}
                renameTrack={renameTrack}
                onRequestRenameTrack={(id, name) => setNameDlg({ kind: "track", id, name })}
                toggleLock={toggleLock} toggleMute={toggleMute}
                cycleHeight={cycleHeight} reorderTrack={reorderTrack}
              />
            ) : (
              <div className="tl-empty">טען מדיה כדי להתחיל — הסרטון יופיע כאן כקטע בציר, ותוכל לחתוך, לגרור ולפצל. או בקש מהסוכן ב-AI.</div>
            )}
          </div>
        </div>

        {dockSide === "right" && agentDock}
      </div>

      {clipMenu && menuClip && <ContextMenu x={clipMenu.x} y={clipMenu.y} items={clipMenuItems} onClose={() => setClipMenu(null)} />}
      {subMenu && menuSub && <ContextMenu x={subMenu.x} y={subMenu.y} items={subMenuItems} onClose={() => setSubMenu(null)} />}

      <NameDialog
        open={projDlg === "create"}
        title="פרויקט חדש"
        label="שם הפרויקט"
        initial={`פרויקט ${projects.length + 1}`}
        confirmLabel="צור"
        onClose={() => setProjDlg("none")}
        onSubmit={submitCreate}
      />
      <NameDialog
        open={projDlg === "rename"}
        title="שינוי שם"
        label="שם הפרויקט"
        initial={projects.find((p) => p.id === projectId)?.name || ""}
        confirmLabel="שמור"
        onClose={() => setProjDlg("none")}
        onSubmit={submitRename}
      />
      <ConfirmDialog
        open={projDlg === "delete"}
        title="מחיקת פרויקט"
        message="למחוק את הפרויקט הנוכחי? כל המדיה, העריכה והשיחה יימחקו מהמחשב הזה."
        confirmLabel="מחק"
        danger
        onClose={() => setProjDlg("none")}
        onConfirm={submitDelete}
      />
      <NameDialog
        open={nameDlg.kind === "track"}
        title="שם הרצועה"
        label="שם"
        initial={nameDlg.kind === "track" ? nameDlg.name : ""}
        confirmLabel="שמור"
        onClose={() => setNameDlg({ kind: "none" })}
        onSubmit={(name) => {
          if (nameDlg.kind === "track") renameTrack(nameDlg.id, name);
          setNameDlg({ kind: "none" });
          toast.success("שם הרצועה עודכן", name);
        }}
      />
      <NameDialog
        open={nameDlg.kind === "overlayText"}
        title="עריכת טקסט"
        label="טקסט"
        initial={nameDlg.kind === "overlayText" ? nameDlg.text : ""}
        confirmLabel="שמור"
        onClose={() => setNameDlg({ kind: "none" })}
        onSubmit={(text) => {
          if (nameDlg.kind === "overlayText") updateOverlay(nameDlg.id, { text });
          setNameDlg({ kind: "none" });
          toast.success("הטקסט עודכן");
        }}
      />
      <NameDialog
        open={nameDlg.kind === "captionText"}
        title="עריכת כתובית"
        label="טקסט"
        initial={nameDlg.kind === "captionText" ? nameDlg.text : ""}
        confirmLabel="שמור"
        onClose={() => setNameDlg({ kind: "none" })}
        onSubmit={(text) => {
          if (nameDlg.kind === "captionText") {
            if (editorApiRef.current) {
              const res = runCommand("caption.updateText", editorApiRef.current, { id: nameDlg.id, text });
              if (!res.ok) setError(res.error);
            } else updateSub(nameDlg.id, { text });
          }
          setNameDlg({ kind: "none" });
          toast.success("הכתובית עודכנה");
        }}
      />
    </div>
  );
}
