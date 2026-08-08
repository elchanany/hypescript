"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Word } from "@/lib/models";
import {
  assembledStart, Clip, MediaAsset, MediaKind, firstVideo, mediaById, totalDur, trimClip, uid,
} from "@/lib/editor/model";
import {
  audioMuted, createVideoTrack, primaryVideoTrackId, SCHEMA_VERSION, videoLocked, videoTrack,
} from "@/lib/editor/project";
import { migrateState } from "@/lib/editor/migrate";
import { scriptToClips } from "@/lib/editor/scriptClips";
import { Sub, edlToSubs, edlToSubsWithScript, parseSrt, subsToSrt } from "@/lib/editor/subtitlesEdl";
import { defaultCanvasFor } from "@/lib/editor/canvasCoords";
import { closeGap, isGapClip, trimGap } from "@/lib/editor/timelineOps";
import { EditorApi, runCommand } from "@/lib/editor/commands";
import { ensureBuiltinCommands } from "@/lib/editor/commands.builtin";
import { listRunnableCommands } from "@/lib/editor/commandSurface";
import { flattenVideoTracks, projectDuration } from "@/lib/editor/tracks";
import { createProject, deleteProject, ensureProject, kvGet, kvSet, listProjects, pk, ProjectMeta, renameProject, setCurrentProject, touchProject } from "@/lib/storage";
import { useEditor } from "@/hooks/useEditor";
import { Copy, Scissors, Eye, Trash2, SquareDashed, Type, Layers, Lock, Volume2, ChevronsUpDown, Plus } from "lucide-react";
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

const COMMAND_ICONS = { copy: Copy, scissors: Scissors, eye: Eye, "square-dashed": SquareDashed, trash: Trash2, type: Type, layers: Layers, lock: Lock, volume: Volume2, height: ChevronsUpDown } as const;

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
    clips, subs, tracks, overlays, canvas, setClips, setSubs, setProject, restoreSnapshot, updateClip,
    addOverlay, updateOverlay, removeOverlay, setOverlaysLive, setCanvas,
    setTracks,
    beginTransaction, setClipsLive, commitTransaction, cancelTransaction,
    setOverlays, reset: resetEditor, undo, redo, canUndo, canRedo,
    captionStyle, setCaptionStyle,
  } = useEditor();
  const [cur, setCur] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  /** Which track the clip was clicked on — inspector title (וידאו/שמע). */
  const [selectionTrack, setSelectionTrack] = useState<"video" | "audio" | null>(null);
  const [avLinked, setAvLinked] = useState(true);
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
  const [chatWidth, setChatWidth] = useState(460);
  const chatWidthRef = useRef(460); chatWidthRef.current = chatWidth;
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
  const [trackMenu, setTrackMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [subMenu, setSubMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [assetMenu, setAssetMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [commandMenu, setCommandMenu] = useState<{ x: number; y: number } | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const previewRef = useRef<PreviewHandle>(null);
  const quoteSink = useRef<((seconds: number) => void) | null>(null);
  const pendingQuoteRef = useRef<number | null>(null);
  const clipsRef = useRef<Clip[] | null>(clips); clipsRef.current = clips;
  const overlaysRef = useRef(overlays); overlaysRef.current = overlays;
  const mediaRef = useRef(media); mediaRef.current = media;
  const subsRef = useRef(subs); subsRef.current = subs;
  const tracksRef = useRef(tracks); tracksRef.current = tracks;
  const canvasRef = useRef(canvas); canvasRef.current = canvas;
  const captionStyleRef = useRef(captionStyle); captionStyleRef.current = captionStyle;
  const curRef = useRef(cur); curRef.current = cur;
  const editorApiRef = useRef<EditorApi | null>(null);
  if (!editorApiRef.current) {
    editorApiRef.current = {
      getClips: () => clipsRef.current,
      setClips: (next) => setClips(next),
      getOverlays: () => overlaysRef.current,
      setOverlays: (next) => setOverlays(next),
      updateOverlay,
      removeOverlay,
      addOverlay,
      updateClip,
      getMedia: () => mediaRef.current,
      removeMediaAsset: (id) => setMedia((items) => {
        const asset = items.find((item) => item.id === id);
        if (asset) URL.revokeObjectURL(asset.url);
        return items.filter((item) => item.id !== id);
      }),
      getSubs: () => subsRef.current,
      setSubs: (next) => setSubs(next),
      getTracks: () => tracksRef.current,
      setTracks: (next) => setTracks(next),
      getCanvas: () => canvasRef.current,
      selectClip: (id) => {
        setSelectedId(id);
        if (id) { setSelectedOverlayId(null); setSelectedSubId(null); setSelectionTrack("video"); }
        else setSelectionTrack(null);
      },
      selectOverlay: (id) => {
        setSelectedOverlayId(id);
        if (id) { setSelectedId(null); setSelectedSubId(null); setSelectionTrack(null); }
      },
      seek: (t) => { setCur(t); previewRef.current?.seek(t); },
      getPlayhead: () => curRef.current,
      getSnapshot: () => ({ clips: clipsRef.current, subs: subsRef.current, tracks: tracksRef.current, overlays: overlaysRef.current }),
      restoreSnapshot,
      getCaptionStyle: () => captionStyleRef.current,
      setCaptionStyle: (s) => setCaptionStyle(s),
      getMediaDuration: (sourceId) => mediaRef.current.find((m) => m.id === sourceId)?.duration ?? 0,
    };
  }

  const quotePlace = (seconds: number) => {
    setChatOpen(true);
    localStorage.setItem("hs_chatOpen", "1");
    // אם הצ'אט כבר פתוח — מדביקים מיד; אחרת שומרים לתור עד ש-Chat נטען
    if (quoteSink.current) {
      quoteSink.current(seconds);
      return;
    }
    pendingQuoteRef.current = seconds;
    const tryInsert = (n = 0) => {
      if (quoteSink.current) {
        const s = pendingQuoteRef.current;
        pendingQuoteRef.current = null;
        if (s != null) quoteSink.current(s);
        return;
      }
      if (n < 60) requestAnimationFrame(() => tryInsert(n + 1));
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
    const w = parseInt(localStorage.getItem("hs_chatw") || "0", 10); if (w >= 320) setChatWidth(Math.min(720, w));
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
      setChatWidth(Math.max(360, Math.min(720, startW + delta)));
    };
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); localStorage.setItem("hs_chatw", String(chatWidthRef.current)); document.body.style.userSelect = ""; };
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  };
  const resetChatWidth = () => { setChatWidth(460); localStorage.setItem("hs_chatw", "460"); };
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
      resetEditor({ clips: st.clips, subs: st.subs, tracks: st.tracks, overlays: st.overlays, canvas: st.canvas, captionStyle: st.captionStyle });
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
      await kvSet(pk(projectId, "state"), { schemaVersion: SCHEMA_VERSION, words, clips, subs, tracks, overlays, canvas, captionStyle });
      touchProject(projectId); setSaving(false);
    }, 500);
    return () => clearTimeout(t);
  }, [words, clips, subs, tracks, overlays, canvas, captionStyle, restored, projectId]);

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
    if (main && !clips && editorApiRef.current) {
      const result = runCommand("clip.add", editorApiRef.current, { sourceId: main.id, trackId: primaryVideoTrackId(tracks) });
      if (!result.ok) setError(result.error);
    }
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
    if (!editorApiRef.current) return;
    const result = runCommand("media.remove", editorApiRef.current, { id });
    if (!result.ok) setError(result.error);
  };
  const addMediaClip = (asset: MediaAsset, atIndex?: number) => {
    const api = editorApiRef.current;
    if (!api) return;
    if (asset.kind === "image") {
      // image -> canvas overlay (CapCut-style), not a main-track clip
      const end = Math.max(cur + 4, (clips ? totalDur(clips) : duration) || 4);
      const apply = (iw?: number, ih?: number) => {
        const result = runCommand("overlay.addImage", api, { assetId: asset.id, start: cur, end, width: iw, height: ih });
        if (!result.ok) setError(result.error);
      };
      const img = new Image();
      img.onload = () => apply(img.naturalWidth, img.naturalHeight);
      img.onerror = () => apply();
      img.src = asset.url;
      return;
    }
    const trackId = primaryVideoTrackId(tracks);
    const result = runCommand("clip.add", api, { sourceId: asset.id, trackId, at_index: atIndex });
    if (!result.ok) { setError(result.error); return; }
    setSelectedOverlayId(null);
    setSelectedSubId(null);
    setSelectionTrack(asset.kind === "audio" ? "audio" : "video");
  };
  const dropMediaOnTimeline = (assetId: string, atIndex: number, trackId?: string) => {
    const asset = mediaById(media, assetId);
    if (!asset) return;
    if (asset.kind === "image") { addMediaClip(asset, atIndex); return; }
    const api = editorApiRef.current;
    if (!api) return;
    const tid = trackId || primaryVideoTrackId(tracks);
    const result = runCommand("clip.add", api, { sourceId: asset.id, trackId: tid, at_index: atIndex });
    if (!result.ok) { setError(result.error); return; }
    setSelectedOverlayId(null);
    setSelectedSubId(null);
    setSelectionTrack(asset.kind === "audio" ? "audio" : "video");
  };
  const addVideoTrack = () => {
    const { tracks: next } = createVideoTrack(tracks);
    setTracks(next);
  };
  const addTextOverlay = () => {
    if (!editorApiRef.current) return;
    const result = runCommand("overlay.addText", editorApiRef.current, { text: "טקסט חדש", start: cur });
    if (!result.ok) { setError(result.error); return; }
    const created = editorApiRef.current.getOverlays().at(-1);
    if (created) setSelectedOverlayId(created.id);
    setSelectedId(null); setSelectedSubId(null); setSelectionTrack(null);
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
  const updateClipFromInspector = (id: string, patch: Partial<Clip>) => {
    const api = editorApiRef.current;
    if (!api) return;
    const commands: Array<{ id: "clip.trim" | "clip.setEnabled" | "clip.setVolume" | "clip.setAudioFades" | "clip.setOpacity" | "clip.setColorAdjustments" | "clip.setVisualFades"; args: Record<string, unknown> }> = [];
    if (patch.start != null || patch.end != null) commands.push({ id: "clip.trim", args: { id, ...patch } });
    if (patch.enabled != null) commands.push({ id: "clip.setEnabled", args: { id, enabled: patch.enabled } });
    if (patch.volume != null) commands.push({ id: "clip.setVolume", args: { id, volume: patch.volume } });
    if (patch.fadeIn != null || patch.fadeOut != null) commands.push({ id: "clip.setAudioFades", args: { id, fadeIn: patch.fadeIn, fadeOut: patch.fadeOut } });
    if (patch.opacity != null) commands.push({ id: "clip.setOpacity", args: { id, opacity: patch.opacity } });
    if (patch.contrast != null || patch.saturation != null) {
      commands.push({
        id: "clip.setColorAdjustments",
        args: { id, contrast: patch.contrast, saturation: patch.saturation },
      });
    }
    if (patch.visualFadeIn != null || patch.visualFadeOut != null) commands.push({ id: "clip.setVisualFades", args: { id, fadeIn: patch.visualFadeIn, fadeOut: patch.visualFadeOut } });
    for (const command of commands) {
      const result = runCommand(command.id, api, command.args);
      if (!result.ok) { setError(result.error); return; }
    }
  };
  const updateSubFromInspector = (sub: Sub, patch: Partial<Sub>) => {
    const api = editorApiRef.current;
    if (!api) return;
    if (patch.text != null) {
      const result = runCommand("subtitle.edit", api, { id: sub.id, text: patch.text });
      if (!result.ok) { setError(result.error); return; }
    }
    if (patch.start != null || patch.end != null) {
      const result = runCommand("subtitle.retime", api, {
        id: sub.id,
        start: patch.start ?? sub.start,
        end: patch.end ?? sub.end,
      });
      if (!result.ok) setError(result.error);
    }
  };
  const onCanvasDetected = (w: number, h: number) => {
    // only auto-set once from the first video if still at the default 1920×1080
    if (canvas.width === 1920 && canvas.height === 1080 && (w !== 1920 || h !== 1080)) setCanvas(defaultCanvasFor(w, h));
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
      const tid = primaryVideoTrackId(tracks);
      const built = script.trim() ? scriptToClips(ws!, script, main.id) : [{ id: uid(), sourceId: main.id, start: 0, end: duration, trackId: tid }];
      const tagged = (built.length ? built : [{ id: uid(), sourceId: main.id, start: 0, end: duration, trackId: tid }])
        .map((c) => (c.trackId ? c : { ...c, trackId: tid }));
      setClips(tagged);
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
      const edl = flattenVideoTracks(clips, tracks);
      const blob = await backend.renderProject(
        {
          media, clips: edl, audioMuted: audioMuted(tracks), overlays, canvas,
          subs, captionStyle, burnCaptions: burnCaptions && !!subs?.length,
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
  const editSub = (id: string, text: string) => {
    if (!editorApiRef.current) return;
    const result = runCommand("subtitle.edit", editorApiRef.current, { id, text });
    if (!result.ok) setError(result.error);
  };
  const delSub = (id: string) => {
    if (!editorApiRef.current) return;
    const result = runCommand("subtitle.delete", editorApiRef.current, { id });
    if (!result.ok) setError(result.error);
    else if (selectedSubId === id) setSelectedSubId(null);
  };

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
      const res = runCommand("subtitle.delete", editorApiRef.current!, { id: selectedSubId });
      if (!res.ok) setError(res.error); else setSelectedSubId(null);
      return;
    }
    if (selectedId) deleteClipById(selectedId, leaveGap);
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
  const cycleHeight = (id: string) => { const api = editorApiRef.current; const t = tracks.find((x) => x.id === id); if (!api || !t) return; const hs = [48, 64, 96]; const i = hs.findIndex((h) => h >= t.height); const r = runCommand("track.setHeight", api, { trackId: id, height: hs[(i + 1) % hs.length] }); if (!r.ok) setError(r.error); };
  const renameTrack = (id: string, name: string) => { const api = editorApiRef.current; if (!api) return; const r = runCommand("track.rename", api, { trackId: id, name }); if (!r.ok) setError(r.error); };
  const toggleLock = (id: string) => { const api = editorApiRef.current; const t = tracks.find((x) => x.id === id); if (!api || !t) return; const r = runCommand("track.setLocked", api, { trackId: id, locked: !t.locked }); if (!r.ok) setError(r.error); };
  const toggleMute = (id: string) => { const api = editorApiRef.current; const t = tracks.find((x) => x.id === id); if (!api || !t) return; const r = runCommand("track.setMuted", api, { trackId: id, muted: !t.muted }); if (!r.ok) setError(r.error); };
  const reorderTrack = (id: string, direction: -1 | 1) => { const api = editorApiRef.current; if (!api) return; const r = runCommand("track.reorder", api, { trackId: id, direction }); if (!r.ok && !r.error.includes("כבר בקצה") && !r.error.includes("מאותו סוג")) setError(r.error); };

  const selectedClip = clips?.find((c) => c.id === selectedId) || null;
  const selectedIsGap = !!selectedClip && isGapClip(selectedClip);
  const selectedOverlay = overlays.find((o) => o.id === selectedOverlayId) || null;
  const selectedSub = subs?.find((s) => s.id === selectedSubId) || null;
  const selectedIndex = selectedClip ? clips!.indexOf(selectedClip) : -1;
  const menuClip = clipMenu ? clips?.find((c) => c.id === clipMenu.id) || null : null;
  const inspectorFocus = selectedOverlay
    ? "overlay" as const
    : selectedSub
      ? "caption" as const
      : selectedClip
        ? (selectionTrack === "audio" ? "audio" as const : "video" as const)
        : "project" as const;
  const inspectorTrackName = selectionTrack === "audio"
    ? (tracks.find((t) => t.type === "audio")?.name || "אודיו")
    : (videoTrack(tracks)?.name || "וידאו");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "k") { e.preventDefault(); setCommandMenu({ x: Math.max(12, window.innerWidth / 2 - 150), y: Math.max(12, window.innerHeight / 3) }); }
      else if (meta && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (meta && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
      else if (e.key === " ") { e.preventDefault(); previewRef.current?.toggle(); }
      else if ((e.key === "Delete" || e.key === "Backspace") && (selectedId || selectedOverlayId || selectedSubId)) { e.preventDefault(); deleteSel(e.shiftKey); }
      else if (e.key === "Escape") { setSelectedId(null); setSelectedOverlayId(null); setSelectedSubId(null); setSelectionTrack(null); }
      else if (e.key.toLowerCase() === "s" && !meta && clips?.length) { e.preventDefault(); splitAtPlayhead(); }
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
  const totalEdited = clips ? projectDuration(clips, tracks) : duration;
  const timelineDuration = Math.max(duration, clips ? projectDuration(clips, tracks) : 0, ...overlays.map((o) => o.end), 0.001);
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
          editorApi={editorApiRef.current} tracks={tracks}
          onProject={({ words: w, clips: c, subs: s, overlays: ovs, tracks: tr, viaEditor }) => {
            setWords(w);
            if (viaEditor) return; // כבר נדחף דרך EditorApi/CommandBus
            setProject(c, s);
            if (ovs) setOverlays(ovs);
            if (tr?.length) setTracks(tr);
          }}
          playhead={cur} selectionLabel={agentSelLabel} dockSide={dockSide} onToggleDock={toggleDockSide}
          quoteSink={quoteSink} pendingQuoteRef={pendingQuoteRef} />
      </aside>
      {dockSide === "left" && dockHandle}
    </>
  ) : null;

  const clipMenuItems: CtxItem[] = menuClip && editorApiRef.current
    ? listRunnableCommands(editorApiRef.current, { clipId: menuClip.id, overlayId: null }, "context-menu")
      .flatMap(({ command, args }) => {
        const presentation = command.presentation;
        const item: CtxItem = {
          label: presentation?.labelHe?.(editorApiRef.current!, args) || command.labelHe,
          icon: presentation?.icon ? COMMAND_ICONS[presentation.icon] : undefined,
          danger: presentation?.danger,
          kbd: presentation?.shortcut,
          disabled: !!presentation?.disableWhenVideoLocked && vLocked,
          onClick: () => {
            const result = runCommand(command.id, editorApiRef.current!, args);
            if (!result.ok) setError(result.error);
          },
        };
        return presentation?.separatorBefore ? [{ sep: true, label: "" } as CtxItem, item] : [item];
      })
    : [];
  const commandMenuItems: CtxItem[] = commandMenu && editorApiRef.current
    ? listRunnableCommands(editorApiRef.current, { clipId: selectedId, overlayId: selectedOverlayId }, "shortcut")
      .map(({ command, args }) => ({
        label: command.presentation?.labelHe?.(editorApiRef.current!, args) || command.labelHe,
        icon: command.presentation?.icon ? COMMAND_ICONS[command.presentation.icon] : undefined,
        onClick: () => {
          const result = runCommand(command.id, editorApiRef.current!, args);
          if (!result.ok) setError(result.error);
        },
      }))
    : [];
  const trackMenuItems: CtxItem[] = trackMenu && editorApiRef.current
    ? listRunnableCommands(editorApiRef.current, { clipId: null, overlayId: null, trackId: trackMenu.id }, "context-menu")
      .flatMap(({ command, args }) => {
        const presentation = command.presentation;
        const item: CtxItem = {
          label: presentation?.labelHe?.(editorApiRef.current!, args) || command.labelHe,
          icon: presentation?.icon ? COMMAND_ICONS[presentation.icon] : undefined,
          danger: presentation?.danger,
          onClick: () => {
            const result = runCommand(command.id, editorApiRef.current!, args);
            if (!result.ok) setError(result.error);
          },
        };
        return presentation?.separatorBefore ? [{ sep: true, label: "" } as CtxItem, item] : [item];
      })
    : [];
  const subMenuItems: CtxItem[] = subMenu && editorApiRef.current
    ? listRunnableCommands(editorApiRef.current, { clipId: null, overlayId: null, subId: subMenu.id }, "context-menu")
      .map(({ command, args }) => ({
        label: command.presentation?.labelHe?.(editorApiRef.current!, args) || command.labelHe,
        icon: command.presentation?.icon ? COMMAND_ICONS[command.presentation.icon] : undefined,
        danger: command.presentation?.danger,
        onClick: () => {
          const result = runCommand(command.id, editorApiRef.current!, args);
          if (!result.ok) setError(result.error);
          else if (command.id === "subtitle.delete" && selectedSubId === subMenu.id) setSelectedSubId(null);
        },
      }))
    : [];
  const assetMenuTarget = assetMenu ? media.find((asset) => asset.id === assetMenu.id) : null;
  const assetMenuItems: CtxItem[] = assetMenuTarget && editorApiRef.current
    ? [
        { label: "הוסף לציר הזמן", icon: Plus, onClick: () => addMediaClip(assetMenuTarget) },
        ...listRunnableCommands(editorApiRef.current, { clipId: null, overlayId: null, assetId: assetMenuTarget.id }, "context-menu")
          .flatMap(({ command, args }) => {
            const presentation = command.presentation;
            const item: CtxItem = {
              label: presentation?.labelHe?.(editorApiRef.current!, args) || command.labelHe,
              icon: presentation?.icon ? COMMAND_ICONS[presentation.icon] : undefined,
              danger: presentation?.danger,
              onClick: () => {
                const result = runCommand(command.id, editorApiRef.current!, args);
                if (!result.ok) setError(result.error);
              },
            };
            return presentation?.separatorBefore ? [{ sep: true, label: "" } as CtxItem, item] : [item];
          }),
      ]
    : [];

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
            <MediaPanel media={media} mainId={main?.id} onUpload={addFiles} onAddClip={addMediaClip} onRemove={removeMedia}
              onAssetMenu={(id, x, y) => setAssetMenu({ id, x, y })} />
          ) : leftTab === "text" ? (
            <TextPanel onAddText={addTextOverlay} />
          ) : (
            <CaptionsPanel
              script={script} onScript={setScript} onAnalyze={analyze} analyzing={busy}
              hasMain={!!main} hasWords={!!words} subs={subs}
              onGenerate={generateSubs} onImportSrt={importSrt} onExportSrt={exportSrt} onEditSub={editSub} onDelSub={delSub}
              onSubMenu={(id, x, y) => setSubMenu({ id, x, y })}
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
              <VideoPreview ref={previewRef} media={media} clips={clips} tracks={tracks} subs={subs} onTime={setCur}
                onCopyPosition={quotePlace} audioMuted={audioMuted(tracks)}
                canvas={canvas} overlays={overlays} selectedOverlayId={selectedOverlayId}
                onSelectOverlay={selectOverlay}
                onBeginOverlay={beginTransaction}
                onOverlayLive={(u) => setOverlaysLive(u)}
                onCommitOverlay={commitTransaction}
                onCancelOverlay={cancelTransaction}
                onEditOverlayText={(id, current) => setNameDlg({ kind: "overlayText", id, text: current })}
                onCanvasDetected={onCanvasDetected}
                captionStyle={captionStyle} />
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
              timelineStart={selectedIndex >= 0 && clips ? assembledStart(clips, selectedIndex) : 0}
              onUpdate={(patch) => selectedClip && updateClipFromInspector(selectedClip.id, patch)}
              onUpdateOverlay={(patch) => {
                if (!selectedOverlay || !editorApiRef.current) return;
                const result = runCommand("overlay.update", editorApiRef.current, { id: selectedOverlay.id, patch });
                if (!result.ok) setError(result.error);
              }}
              onUpdateSub={(patch) => selectedSub && updateSubFromInspector(selectedSub, patch)}
              canvas={canvas}
              captionStyle={captionStyle}
              onCaptionStyle={(patch) => {
                if (!editorApiRef.current) return;
                const result = runCommand("caption.setStyle", editorApiRef.current, patch);
                if (!result.ok) setError(result.error);
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
              avLinked={avLinked} onAvLinked={setAvLinked}
            />
            {clips || media.length > 0 ? (
              <Timeline
                media={media} clips={clips || []} subs={subs} overlays={overlays} tracks={tracks}
                maxDuration={timelineDuration}
                currentAssembled={cur} selectedId={selectedId} selectedOverlayId={selectedOverlayId}
                selectedSubId={selectedSubId} selectionTrack={selectionTrack} avLinked={avLinked}
                zoom={zoom} onZoom={setZoom} snap={snap}
                onSeek={seek} onSelect={selectClip} onSelectOverlay={selectOverlay} onSelectSub={selectSub}
                onTrimBegin={beginTransaction}
                onTrim={(id, s, e) => setClipsLive((c) => {
                  if (!c) return c;
                  const clip = c.find((x) => x.id === id);
                  return clip && isGapClip(clip) ? trimGap(c, id, e - s) : trimClip(c, id, s, e, duration);
                })}
                onTrimEnd={commitTransaction}
                onReorder={(id, to) => {
                  if (!editorApiRef.current) return;
                  const result = runCommand("clip.move", editorApiRef.current, { id, to_index: to });
                  if (!result.ok) setError(result.error);
                }}
                onClipMenu={(id, x, y) => setClipMenu({ id, x, y })}
                onTrackMenu={(id, x, y) => setTrackMenu({ id, x, y })}
                onDropMedia={dropMediaOnTimeline}
                onAddVideoTrack={addVideoTrack}
                onOverlayTrimBegin={beginTransaction}
                onOverlayTrim={setOverlayRangeLive}
                onOverlayTrimEnd={commitTransaction}
                onOverlayMove={setOverlayMoveLive}
                renameTrack={renameTrack}
                onRequestRenameTrack={(id, name) => setNameDlg({ kind: "track", id, name })}
                toggleLock={toggleLock} toggleMute={toggleMute}
                cycleHeight={cycleHeight} reorderTrack={reorderTrack}
              />
            ) : (
              <div className="tl-empty">טען מדיה כדי להתחיל — גרור קבצים מהספרייה לציר, או לחתוך/לפצל. אפשר גם לבקש מהסוכן ב-AI.</div>
            )}
          </div>
        </div>

        {dockSide === "right" && agentDock}
      </div>

      {clipMenu && menuClip && <ContextMenu x={clipMenu.x} y={clipMenu.y} items={clipMenuItems} onClose={() => setClipMenu(null)} />}
      {commandMenu && <ContextMenu
        x={commandMenu.x}
        y={commandMenu.y}
        items={commandMenuItems.length ? commandMenuItems : [{ label: "אין פקודות זמינות לבחירה הנוכחית", disabled: true }]}
        onClose={() => setCommandMenu(null)}
      />}
      {trackMenu && <ContextMenu
        x={trackMenu.x}
        y={trackMenu.y}
        items={trackMenuItems.length ? trackMenuItems : [{ label: "אין פעולות זמינות לרצועה", disabled: true }]}
        onClose={() => setTrackMenu(null)}
      />}
      {subMenu && <ContextMenu
        x={subMenu.x}
        y={subMenu.y}
        items={subMenuItems.length ? subMenuItems : [{ label: "אין פעולות זמינות לכתובית", disabled: true }]}
        onClose={() => setSubMenu(null)}
      />}
      {assetMenu && <ContextMenu
        x={assetMenu.x}
        y={assetMenu.y}
        items={assetMenuItems.length ? assetMenuItems : [{ label: "אין פעולות זמינות לקובץ", disabled: true }]}
        onClose={() => setAssetMenu(null)}
      />}

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
          if (nameDlg.kind === "overlayText" && editorApiRef.current) {
            const result = runCommand("overlay.update", editorApiRef.current, { id: nameDlg.id, patch: { text } });
            if (!result.ok) setError(result.error);
          }
          setNameDlg({ kind: "none" });
          toast.success("הטקסט עודכן");
        }}
      />
    </div>
  );
}
