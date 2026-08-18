"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Word } from "@/lib/models";
import {
  assembledStart, Clip, MediaAsset, MediaKind, clipAudioFades, clipVolume, firstVideo, mediaById, totalDur, trimClip, uid,
} from "@/lib/editor/model";
import {
  audioMuted, audioTrack, createVideoTrack, primaryVideoTrackId, SCHEMA_VERSION, videoLocked, videoTrack,
} from "@/lib/editor/project";
import { migrateState } from "@/lib/editor/migrate";
import { scriptToClips } from "@/lib/editor/scriptClips";
import { Sub, edlToSubs, edlToSubsWithScript, parseSrt, subsToSrt } from "@/lib/editor/subtitlesEdl";
import { defaultCanvasFor } from "@/lib/editor/canvasCoords";
import { closeGap, isGapClip, trimGap } from "@/lib/editor/timelineOps";
import { EditorApi, runCommand } from "@/lib/editor/commands";
import { ensureBuiltinCommands } from "@/lib/editor/commands.builtin";
import { listRunnableCommands } from "@/lib/editor/commandSurface";
import { clipsOnTrack, flattenVideoTracks, projectDuration, replaceTrackClips } from "@/lib/editor/tracks";
import { Overlay, TitlePopupPreset, nextZ } from "@/lib/editor/overlay";
import { TEXT_PRESETS, type TextPreset } from "@/lib/creative/textPresets";
import type { GiphyAssetItem } from "@/lib/creative/giphy";
import type { VectorElement } from "@/lib/creative/iconify";
import type { VectorShape } from "@/lib/creative/shapes";
import type { MotionAsset } from "@/lib/creative/motionAssets";
import { loadGoogleFont } from "@/lib/creative/fonts";
import { deleteProject, ensureProject, kvGet, kvSet, listProjects, pk, ProjectMeta, renameProject, setCurrentProject, touchProject } from "@/lib/storage";
import { useEditor } from "@/hooks/useEditor";
import { Copy, Scissors, Eye, Trash2, SquareDashed, Type, Layers, Lock, Volume2, ChevronsUpDown, Plus, Pencil } from "@/components/icons";
import { ContextMenu, CtxItem } from "@/components/ui";
import { ConfirmDialog, NameDialog } from "@/components/Modal";
import { toast } from "@/lib/ui/toast";
import TopBar from "@/components/TopBar";
import ToolRail, { LeftTab } from "@/components/ToolRail";
import MediaPanel from "@/components/MediaPanel";
import CaptionsPanel from "@/components/CaptionsPanel";
import TextPanel from "@/components/TextPanel";
import CreativePanel from "@/components/CreativePanel";
import InspectorPanel from "@/components/InspectorPanel";
import TimelineToolbar from "@/components/TimelineToolbar";
import Chat from "@/components/Chat";
import VideoPreview, { PreviewHandle } from "@/components/VideoPreview";
import Timeline from "@/components/Timeline";
import ExportDialog, { ExportResult } from "@/components/ExportDialog";
import { getProjectPolicy } from "@/lib/projects/policy";
import { deleteCloudProject, getCloudAssetDownloadUrl, getCloudProject, renameCloudProject, renderCloudProject, saveCloudProjectState, uploadCloudAsset } from "@/lib/cloud/client";
import { createProjectWithPolicy } from "@/lib/projects/create";
import { DEFAULT_POLICY } from "@/lib/projects/types";
import EditorTour from "@/components/EditorTour";
import { LoadingState, UploadProgressCard } from "@/components/LoadingState";
import { clampRatio, type TransferProgress } from "@/lib/ui/progress";
import MobileEditorNav, { type MobileEditorSurface } from "@/components/MobileEditorNav";
import { PROJECT_QUERY_KEY, requestedProjectId } from "@/lib/projects/navigation";
import { renamedMediaName } from "@/lib/media/naming";

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const editorClipboardRef = useRef<{ kind: "clip"; value: Clip } | { kind: "overlay"; value: Overlay } | { kind: "sub"; value: Sub } | null>(null);
  /** Which track the clip was clicked on — inspector title (וידאו/שמע). */
  const [selectionTrack, setSelectionTrack] = useState<"video" | "audio" | null>(null);
  const [avLinked, setAvLinked] = useState(true);
  const [script, setScript] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<TransferProgress | null>(null);
  const [error, setError] = useState("");
  const [rendering, setRendering] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [exportError, setExportError] = useState("");
  const [renderElapsed, setRenderElapsed] = useState(0);
  const renderAbortRef = useRef<AbortController | null>(null);
  const renderStartedAtRef = useRef(0);
  const [groqOk, setGroqOk] = useState(true);
  const [tourOpen, setTourOpen] = useState(false);
  const [mobileSurface, setMobileSurface] = useState<MobileEditorSurface>("preview");

  useEffect(() => {
    if (!rendering) return;
    const tick = () => setRenderElapsed((Date.now() - renderStartedAtRef.current) / 1000);
    tick();
    const timer = window.setInterval(tick, 500);
    return () => window.clearInterval(timer);
  }, [rendering]);

  useEffect(() => () => {
    renderAbortRef.current?.abort();
  }, []);

  // revokes the PREVIOUS url when exportResult changes (and the current one on unmount)
  useEffect(() => () => {
    if (exportResult?.url) URL.revokeObjectURL(exportResult.url);
  }, [exportResult?.url]);

  useEffect(() => {
    if (error) toast.error("הפעולה לא הושלמה", error);
  }, [error]);

  // layout state
  const [leftTab, setLeftTab] = useState<LeftTab>("media");
  const [chatOpen, setChatOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [chatWidth, setChatWidth] = useState(460);
  const chatWidthRef = useRef(460); chatWidthRef.current = chatWidth;
  const [dockSide, setDockSide] = useState<"left" | "right">("right");
  const dockSideRef = useRef<"left" | "right">("right"); dockSideRef.current = dockSide;
  const [tlHeight, setTlHeight] = useState(380);
  const tlHeightRef = useRef(380); tlHeightRef.current = tlHeight;
  const [resizingTimeline, setResizingTimeline] = useState(false);
  const [leftW, setLeftW] = useState(264);
  const leftWRef = useRef(264); leftWRef.current = leftW;
  const [inspW, setInspW] = useState(300);
  const inspWRef = useRef(300); inspWRef.current = inspW;
  const [zoom, setZoom] = useState(1);
  const [snap, setSnap] = useState(true);
  const [saving, setSaving] = useState(false);
  const cloudSyncWarned = useRef(false);
  const [clipMenu, setClipMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [trackMenu, setTrackMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [subMenu, setSubMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [assetMenu, setAssetMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [commandMenu, setCommandMenu] = useState<{ x: number; y: number } | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const previewRef = useRef<PreviewHandle>(null);
  const quoteSink = useRef<((seconds: number) => void) | null>(null);
  const pendingQuoteRef = useRef<number | null>(null);
  const mentionSink = useRef<((asset: MediaAsset) => void) | null>(null);
  const pendingMentionRef = useRef<MediaAsset | null>(null);
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
      setClips: (next) => { clipsRef.current = next; setClips(next); },
      getOverlays: () => overlaysRef.current,
      setOverlays: (next) => { overlaysRef.current = next; setOverlays(next); },
      updateOverlay: (id, patch) => {
        overlaysRef.current = overlaysRef.current.map((item) => item.id === id ? { ...item, ...patch } : item);
        updateOverlay(id, patch);
      },
      removeOverlay: (id) => {
        overlaysRef.current = overlaysRef.current.filter((item) => item.id !== id);
        removeOverlay(id);
      },
      addOverlay: (overlay) => {
        overlaysRef.current = [...overlaysRef.current, overlay];
        addOverlay(overlay);
      },
      updateClip: (id, patch) => {
        clipsRef.current = clipsRef.current?.map((item) => item.id === id ? { ...item, ...patch } : item) || null;
        updateClip(id, patch);
      },
      getMedia: () => mediaRef.current,
      removeMediaAsset: (id) => setMedia((items) => {
        const asset = items.find((item) => item.id === id);
        if (!asset) return items;
        if (asset.url) URL.revokeObjectURL(asset.url);
        const referenced = !!clipsRef.current?.some((clip) => clip.sourceId === id)
          || overlaysRef.current.some((overlay) => overlay.assetId === id);
        return referenced
          ? items.map((item) => item.id === id ? { ...item, file: new File([], item.name, { type: item.file.type }), url: "", missing: true } : item)
          : items.filter((item) => item.id !== id);
      }),
      addMediaAsset: (asset) => {
        const next = mediaRef.current.some((item) => item.id === asset.id)
          ? mediaRef.current
          : [...mediaRef.current, asset];
        mediaRef.current = next;
        setMedia(next);
      },
      getSubs: () => subsRef.current,
      setSubs: (next) => { subsRef.current = next; setSubs(next); },
      getTracks: () => tracksRef.current,
      setTracks: (next) => { tracksRef.current = next; setTracks(next); },
      getCanvas: () => canvasRef.current,
      setCanvas: (next) => { canvasRef.current = next; setCanvas(next); },
      addVideoTrack: () => {
        const { tracks: next, track } = createVideoTrack(tracksRef.current);
        tracksRef.current = next;
        setTracks(next);
        return track.id;
      },
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

  const mentionMedia = (asset: MediaAsset) => {
    setChatOpen(true);
    localStorage.setItem("hs_chatOpen", "1");
    if (mentionSink.current) mentionSink.current(asset);
    else pendingMentionRef.current = asset;
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
    | { kind: "media"; id: string; name: string }
    | { kind: "overlayText"; id: string; text: string }
  >({ kind: "none" });
  const relinkInputRef = useRef<HTMLInputElement>(null);
  const relinkTargetIdRef = useRef<string | null>(null);
  const uploadingAssetsRef = useRef<Set<string>>(new Set());

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
    const tourDone = localStorage.getItem("hs_editor_tour_done") === "1";
    if (!tourDone) {
      setTourOpen(true);
      setChatOpen(true);
    }
    const o = localStorage.getItem("hs_chatOpen"); if (o !== null && tourDone) setChatOpen(o === "1");
    const focus = localStorage.getItem("hs_chatFocus"); if (focus === "1") { setFocusMode(true); setChatOpen(true); }
    const w = parseInt(localStorage.getItem("hs_chatw") || "0", 10); if (w >= 320) setChatWidth(Math.min(720, w));
    const ds = localStorage.getItem("hs_dockside"); if (ds === "left" || ds === "right") setDockSide(ds);
    const h = parseInt(localStorage.getItem("hs_tlh") || "0", 10);
    const maxTimeline = Math.max(220, window.innerHeight - 230);
    if (h >= 180) setTlHeight(Math.min(maxTimeline, h));
    else setTlHeight(Math.max(280, Math.min(maxTimeline, Math.round(window.innerHeight * 0.38))));
    const lw = parseInt(localStorage.getItem("hs_leftw") || "0", 10); if (lw >= 220) setLeftW(Math.min(440, lw));
    const iw = parseInt(localStorage.getItem("hs_inspw") || "0", 10); if (iw >= 260) setInspW(Math.min(460, iw));
  }, []);

  const startResizeChat = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX; const startW = chatWidthRef.current;
    const onMove = (ev: PointerEvent) => {
      const delta = dockSideRef.current === "right" ? (startX - ev.clientX) : (ev.clientX - startX);
      setChatWidth(Math.max(360, Math.min(720, startW + delta)));
    };
    const onUp = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); localStorage.setItem("hs_chatw", String(chatWidthRef.current)); document.body.style.userSelect = ""; };
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp);
  };
  const resetChatWidth = () => { setChatWidth(460); localStorage.setItem("hs_chatw", "460"); };
  const resizeChatByKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const direction = dockSideRef.current === "right" ? (e.key === "ArrowLeft" ? 1 : -1) : (e.key === "ArrowRight" ? 1 : -1);
    const next = Math.max(360, Math.min(720, chatWidthRef.current + direction * 24));
    setChatWidth(next); localStorage.setItem("hs_chatw", String(next));
  };
  const toggleDockSide = () => setDockSide((s) => { const n = s === "right" ? "left" : "right"; localStorage.setItem("hs_dockside", n); return n; });
  const startResizeTL = (e: React.PointerEvent) => {
    e.preventDefault();
    const handle = e.currentTarget as HTMLDivElement;
    const pointerId = e.pointerId;
    const startY = e.clientY; const startH = tlHeightRef.current;
    const clampHeight = (height: number) => Math.max(180, Math.min(Math.max(220, window.innerHeight - 230), height));
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId === pointerId) setTlHeight(clampHeight(startH + (startY - ev.clientY)));
    };
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
      localStorage.setItem("hs_tlh", String(tlHeightRef.current));
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      setResizingTimeline(false);
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ns-resize";
    setResizingTimeline(true);
    handle.setPointerCapture(pointerId);
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  };
  const startResizeLeft = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX; const startW = leftWRef.current;
    const onMove = (ev: PointerEvent) => setLeftW(Math.max(180, Math.min(440, startW + (ev.clientX - startX))));
    const onUp = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); localStorage.setItem("hs_leftw", String(leftWRef.current)); document.body.style.userSelect = ""; };
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp);
  };
  const resetTimeline = () => {
    const next = Math.max(280, Math.min(Math.max(220, window.innerHeight - 230), Math.round(window.innerHeight * 0.38)));
    setTlHeight(next); localStorage.setItem("hs_tlh", String(next));
  };
  const resizeTimelineByKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const next = Math.max(180, Math.min(Math.max(220, window.innerHeight - 230), tlHeightRef.current + (e.key === "ArrowUp" ? 24 : -24)));
    setTlHeight(next); localStorage.setItem("hs_tlh", String(next));
  };
  const resetLeft = () => { setLeftW(264); localStorage.setItem("hs_leftw", "264"); };
  const resizeLeftByKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = Math.max(220, Math.min(440, leftWRef.current + (e.key === "ArrowRight" ? 24 : -24)));
    setLeftW(next); localStorage.setItem("hs_leftw", String(next));
  };
  const startResizeInsp = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX; const startW = inspWRef.current;
    const onMove = (ev: PointerEvent) => setInspW(Math.max(210, Math.min(460, startW - (ev.clientX - startX))));
    const onUp = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); localStorage.setItem("hs_inspw", String(inspWRef.current)); document.body.style.userSelect = ""; };
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp);
  };
  const resetInsp = () => { setInspW(300); localStorage.setItem("hs_inspw", "300"); };
  const resizeInspectorByKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = Math.max(260, Math.min(460, inspWRef.current + (e.key === "ArrowLeft" ? 24 : -24)));
    setInspW(next); localStorage.setItem("hs_inspw", String(next));
  };
  const toggleChat = () => setChatOpen((o) => { localStorage.setItem("hs_chatOpen", o ? "0" : "1"); return !o; });
  const selectMobileSurface = (surface: MobileEditorSurface) => {
    setMobileSurface(surface);
    localStorage.setItem("hs_mobile_surface", surface);
    if (surface === "chat" && !chatOpen) {
      setChatOpen(true);
      localStorage.setItem("hs_chatOpen", "1");
    }
  };
  const toggleFocusMode = () => setFocusMode((current) => {
    const next = !current;
    localStorage.setItem("hs_chatFocus", next ? "1" : "0");
    if (next) { setChatOpen(true); localStorage.setItem("hs_chatOpen", "1"); }
    return next;
  });

  useEffect(() => {
    const saved = localStorage.getItem("hs_mobile_surface") as MobileEditorSurface | null;
    if (saved && ["preview", "tools", "timeline", "inspector", "chat"].includes(saved)) setMobileSurface(saved);
  }, []);

  useEffect(() => {
    if (!chatOpen && mobileSurface === "chat") {
      setMobileSurface("preview");
      localStorage.setItem("hs_mobile_surface", "preview");
    }
  }, [chatOpen, mobileSurface]);

  useEffect(() => {
    (async () => {
      const existing = await listProjects();
      if (!existing.length) { window.location.replace("/dashboard?welcome=1"); return; }
      const requested = requestedProjectId(existing, new URLSearchParams(window.location.search).get(PROJECT_QUERY_KEY));
      const id = requested || await ensureProject();
      if (requested) {
        await setCurrentProject(requested);
        window.history.replaceState({}, "", "/");
      }
      setProjects(existing);
      setProjectId(id);
    })();
  }, []);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setRestored(false);
    (async () => {
      const policy = await getProjectPolicy(projectId);
      let raw: any = null;
      let cloudMediaMeta: any[] = [];

      // Always fetch latest cloud state first if this is a cloud project
      if (policy?.cloudProjectId && policy.dataMode !== "local") {
        try {
          const cloud = await getCloudProject(policy.cloudProjectId);
          if (cloud?.project?.editor_state && Object.keys(cloud.project.editor_state).length > 0) {
            raw = cloud.project.editor_state;
            await kvSet(pk(projectId, "state"), raw);
            if (raw.chatStore) {
              await kvSet(pk(projectId, "chat"), raw.chatStore);
            }
            const rawMedia = Array.isArray(raw.media) ? raw.media : (Array.isArray(raw.mediaMeta) ? raw.mediaMeta : []);
            if (rawMedia.length > 0) {
              cloudMediaMeta = rawMedia;
            }
          }
        } catch { /* offline / local fallback */ }
      }

      if (!raw) {
        raw = await kvGet<any>(pk(projectId, "state"));
        const rawMedia = Array.isArray(raw?.media) ? raw.media : (Array.isArray(raw?.mediaMeta) ? raw.mediaMeta : []);
        if (rawMedia.length > 0 && cloudMediaMeta.length === 0) {
          cloudMediaMeta = rawMedia;
        }
      }

      const sm = await kvGet<any[]>(pk(projectId, "media"));
      if (cancelled) return;

      const localMap = new Map((sm || []).map((m) => [m.id, m]));
      const sourceList = cloudMediaMeta.length > 0
        ? cloudMediaMeta.map((cm) => {
            const local = localMap.get(cm.id);
            return { ...cm, blob: local?.blob || null, missing: local ? !!local.missing : false };
          })
        : (sm || []);

      const out: MediaAsset[] = [];
      for (const m of sourceList) {
        const file = m.blob instanceof File ? m.blob
          : m.blob instanceof Blob ? new File([m.blob], m.name || "media", { type: m.blob.type || "" })
          : null;
        let url = "";
        let missing = !file;

        if (file) {
          url = URL.createObjectURL(file);
          missing = false;
        } else if (m.cloudAssetId) {
          try {
            url = await getCloudAssetDownloadUrl(m.cloudAssetId);
            missing = false;
          } catch {
            missing = true;
          }
        }

        const restoredFile = file || new File([], m.name || "media", { type: "" });
        out.push({
          id: m.id,
          name: m.name,
          kind: m.kind,
          duration: m.duration,
          file: restoredFile,
          url,
          missing,
          cloudAssetId: m.cloudAssetId,
          cloudObjectKey: m.cloudObjectKey,
          cloudState: m.cloudState || (m.cloudAssetId ? "available" : undefined),
        });
      }

      if (cancelled) return;
      setMedia((prev) => {
        prev.forEach((m) => { if (m.url && m.url.startsWith("blob:")) URL.revokeObjectURL(m.url); });
        return out;
      });

      setWords(raw?.words ?? null);
      const st = migrateState(raw);
      resetEditor({ clips: st.clips, subs: st.subs, tracks: st.tracks, overlays: st.overlays, canvas: st.canvas, captionStyle: st.captionStyle });
      setCur(0); setSelectedId(null); setSelectedOverlayId(null); setSelectedSubId(null); setSelectionTrack(null);
      setRestored(true);
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    if (!restored || !projectId) return;
    kvSet(pk(projectId, "media"), media.map((m) => ({ id: m.id, name: m.name, kind: m.kind, duration: m.duration, blob: m.missing ? null : m.file, missing: !!m.missing, cloudAssetId: m.cloudAssetId, cloudObjectKey: m.cloudObjectKey, cloudState: m.cloudState })));
    touchProject(projectId);
  }, [media, restored, projectId]);

  useEffect(() => {
    if (!restored || !projectId) return;
    setSaving(true);
    const t = setTimeout(async () => {
      const chatStore = await kvGet<unknown>(pk(projectId, "chat"));
      const mediaMeta = media.map((m) => ({
        id: m.id,
        name: m.name,
        kind: m.kind,
        duration: m.duration,
        cloudAssetId: m.cloudAssetId,
        cloudObjectKey: m.cloudObjectKey,
        cloudState: m.cloudState,
      }));
      const state = {
        schemaVersion: SCHEMA_VERSION,
        words,
        clips,
        subs,
        tracks,
        overlays,
        canvas,
        captionStyle,
        chatStore: chatStore || undefined,
        media: mediaMeta,
        mediaMeta,
      };
      await kvSet(pk(projectId, "state"), state);
      const policy = await getProjectPolicy(projectId);
      if (policy?.cloudProjectId && policy.dataMode !== "local") {
        try {
          await saveCloudProjectState(policy.cloudProjectId, state);
          cloudSyncWarned.current = false;
        } catch (syncError) {
          if (!cloudSyncWarned.current) {
            cloudSyncWarned.current = true;
            toast.error("השמירה בענן נכשלה", syncError instanceof Error ? `${syncError.message} · העותק המקומי נשמר` : "העותק המקומי נשמר");
          }
        }
      }
      touchProject(projectId); setSaving(false);
    }, 500);
    return () => clearTimeout(t);
  }, [words, clips, subs, tracks, overlays, canvas, captionStyle, restored, projectId, media]);

  // Auto-sync un-uploaded local media assets to Cloudflare R2 in the background
  useEffect(() => {
    if (!restored || !projectId) return;
    let cancelled = false;
    (async () => {
      const policy = await getProjectPolicy(projectId);
      if (!policy?.cloudProjectId || policy.dataMode === "local" || policy.storageBackend !== "r2") return;

      const unSynced = media.filter(
        (m) => !m.missing && m.file && m.file.size > 0 && !m.cloudAssetId && !uploadingAssetsRef.current.has(m.id)
      );
      if (!unSynced.length) return;

      for (const asset of unSynced) {
        if (cancelled) return;
        uploadingAssetsRef.current.add(asset.id);
        try {
          const cloud = await uploadCloudAsset(policy.cloudProjectId, asset.file);
          if (cancelled) return;
          setMedia((current) =>
            current.map((item) =>
              item.id === asset.id
                ? { ...item, cloudAssetId: cloud.assetId, cloudObjectKey: cloud.objectKey, cloudState: "available" }
                : item
            )
          );
        } catch (err) {
          console.warn("Background cloud upload failed for asset:", asset.name, err);
        } finally {
          uploadingAssetsRef.current.delete(asset.id);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [media, restored, projectId]);

  const clearProjectWorkspace = () => {
    // A project switch used to leave the previous project's clips alive for one
    // render while its media list was already empty. That transient combination
    // looked exactly like deleted media. Clear both sides atomically before the
    // new project is selected; real missing references are restored afterwards.
    setRestored(false);
    setMedia((current) => {
      current.forEach((asset) => { if (asset.url) URL.revokeObjectURL(asset.url); });
      return [];
    });
    setWords(null);
    const empty = migrateState(null);
    resetEditor({
      clips: empty.clips,
      subs: empty.subs,
      tracks: empty.tracks,
      overlays: empty.overlays,
      canvas: empty.canvas,
      captionStyle: empty.captionStyle,
    });
    setCur(0);
    setSelectedId(null);
    setSelectedOverlayId(null);
    setSelectedSubId(null);
    setSelectionTrack(null);
  };

  const switchProject = async (id: string) => {
    if (id === projectId) return;
    clearProjectWorkspace();
    await setCurrentProject(id);
    setProjectId(id);
  };
  const newProject = () => setProjDlg("create");
  const renameCurrent = () => { if (projectId) setProjDlg("rename"); };
  const deleteCurrent = () => { if (projectId) setProjDlg("delete"); };

  const submitCreate = async (name: string) => {
    try {
      const id = await createProjectWithPolicy({ name: name || "פרויקט", policy: DEFAULT_POLICY() });
      await setCurrentProject(id);
      const nextProjects = await listProjects();
      clearProjectWorkspace();
      setProjects(nextProjects);
      setProjectId(id);
      setProjDlg("none");
      toast.success("הפרויקט נוצר ונפתח", name);
    } catch (cause) {
      toast.error("יצירת הפרויקט נכשלה", cause instanceof Error ? cause.message : undefined);
    }
  };
  const submitRename = async (name: string) => {
    if (!projectId) return;
    setProjDlg("none");
    const policy = await getProjectPolicy(projectId);
    if (policy?.cloudProjectId) await renameCloudProject(policy.cloudProjectId, name);
    await renameProject(projectId, name);
    setProjects(await listProjects());
    toast.success("השם עודכן", name);
  };
  const submitDelete = async () => {
    if (!projectId) return;
    setProjDlg("none");
    const oldName = projects.find((p) => p.id === projectId)?.name || "";
    const policy = await getProjectPolicy(projectId);
    if (policy?.cloudProjectId) await deleteCloudProject(policy.cloudProjectId);
    await deleteProject(projectId);
    const list = await listProjects(); setProjects(list);
    clearProjectWorkspace();
    if (list.length) { await setCurrentProject(list[0].id); setProjectId(list[0].id); }
    else { const id = await createProjectWithPolicy({ name: "פרויקט 1", policy: DEFAULT_POLICY() }); setProjects(await listProjects()); setProjectId(id); }
    toast.success("הפרויקט נמחק", oldName);
  };

  useEffect(() => {
    if (main && !clips && editorApiRef.current) {
      const result = runCommand("clip.add", editorApiRef.current, { sourceId: main.id, trackId: primaryVideoTrackId(tracks) });
      if (!result.ok) setError(result.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [main]);

  const addFiles = async (files: FileList | File[] | null, onProgress?: (ratio: number) => void) => {
    if (!files) return false;
    const arr = Array.from(files);
    if (!arr.length) return false;
    const totalBytes = arr.reduce((sum, file) => sum + file.size, 0);
    const startedAt = Date.now();
    const loadedByFile = new Map<string, number>();
    const publishProgress = (file: File, ratio: number) => {
      loadedByFile.set(`${file.name}:${file.size}:${file.lastModified}`, file.size * clampRatio(ratio));
      const loadedBytes = Array.from(loadedByFile.values()).reduce((sum, value) => sum + value, 0);
      const next = { count: arr.length, fileName: file.name, loadedBytes, totalBytes, ratio: totalBytes ? loadedBytes / totalBytes : 1, startedAt };
      setUploadProgress(next); setProgress(next.ratio); onProgress?.(next.ratio);
    };
    const policy = projectId ? await getProjectPolicy(projectId) : null;
    const shouldUpload = !!policy?.cloudProjectId && policy.storageBackend === "r2" && policy.dataMode !== "local";
    try {
      setPhase(shouldUpload ? "מעלה את הקבצים…" : "מכין את הקבצים…");
      const assets = await Promise.all(arr.map(async (f) => {
        publishProgress(f, shouldUpload ? 0 : 0.08);
        const kind = kindOf(f);
        const matchingMissing = mediaRef.current.find((item) => item.missing && item.name === f.name && item.kind === kind);
        const asset: MediaAsset = { id: matchingMissing?.id || uid("m"), name: f.name, kind, file: f, duration: await probeDuration(f, kind), url: URL.createObjectURL(f), missing: false };
        if (shouldUpload && policy?.cloudProjectId) {
          const cloud = await uploadCloudAsset(policy.cloudProjectId, f, (ratio) => publishProgress(f, ratio));
          asset.cloudAssetId = cloud.assetId;
          asset.cloudObjectKey = cloud.objectKey;
          asset.cloudState = "available";
        }
        publishProgress(f, 1);
        return asset;
      }));
      setMedia((current) => {
        const restoredIds = new Set(assets.map((asset) => asset.id));
        return [...current.filter((item) => !restoredIds.has(item.id)), ...assets];
      });
      onProgress?.(1);
      if (shouldUpload) toast.success("הקבצים הועלו בהצלחה", arr.length === 1 ? arr[0].name : `${arr.length} קבצים מוכנים לעריכה`);
      return true;
    } catch (uploadError) {
      const technical = uploadError instanceof Error ? uploadError.message : "";
      const message = technical.includes("too_large") ? "הקובץ גדול מהמכסה הזמינה בחשבון."
        : technical.includes("network") ? "החיבור נקטע בזמן ההעלאה. אפשר לנסות שוב."
          : "לא הצלחנו להעלות את הקובץ. העותק המקומי נשמר ואפשר לנסות שוב.";
      setError(message);
      return false;
    } finally {
      window.setTimeout(() => setUploadProgress(null), 900);
      setPhase(""); setProgress(0);
    }
  };

  const seek = (a: number) => { setCur(a); previewRef.current?.seek(a); };

  const removeMedia = (id: string) => {
    if (!editorApiRef.current) return;
    const result = runCommand("media.remove", editorApiRef.current, { id });
    if (!result.ok) setError(result.error);
    else toast.success("המדיה הוסרה", "מופעים קיימים בציר סומנו כחסרים וניתן לקשר את הקובץ מחדש.");
  };
  const renameMedia = (id: string, requestedName: string) => {
    const asset = mediaRef.current.find((item) => item.id === id);
    if (!asset) return;
    const name = renamedMediaName(asset.name, requestedName);
    setMedia((items) => items.map((item) => item.id === id ? { ...item, name } : item));
    toast.success("שם הקובץ עודכן", name);
  };
  const relinkMedia = async (id: string, file: File) => {
    const previous = mediaRef.current.find((item) => item.id === id);
    if (!previous) return;
    const kind = kindOf(file);
    if (kind !== previous.kind) {
      setError(`נבחר קובץ מסוג ${kind}, אך המקור החסר הוא ${previous.kind}.`);
      return;
    }
    const duration = await probeDuration(file, kind);
    setMedia((items) => items.map((item) => item.id === id
      ? { ...item, name: file.name, file, duration: duration || item.duration, url: URL.createObjectURL(file), missing: false }
      : item));
    toast.success("הקובץ קושר מחדש", file.name);
  };
  const addImageOverlay = (asset: MediaAsset) => {
    const api = editorApiRef.current;
    if (!api) return;
    const end = Math.max(cur + 4, totalEdited || 4);
    const apply = (iw?: number, ih?: number) => {
      const result = runCommand("overlay.addImage", api, { assetId: asset.id, start: cur, end, width: iw, height: ih, preset: "logo_top_left" });
      if (!result.ok) setError(result.error);
    };
    const img = new Image();
    img.onload = () => apply(img.naturalWidth, img.naturalHeight);
    img.onerror = () => apply();
    img.src = asset.url;
  };
  const convertSelectedImageClipToLogo = async () => {
    const api = editorApiRef.current;
    const clip = clips?.find((item) => item.id === selectedId);
    const asset = clip ? mediaById(media, clip.sourceId) : null;
    if (!api || !clip || !asset || asset.kind !== "image") return;
    const trackId = clip.trackId || primaryVideoTrackId(tracks);
    const trackClips = clipsOnTrack(clips || [], trackId, primaryVideoTrackId(tracks));
    const trackIndex = trackClips.findIndex((item) => item.id === clip.id);
    const start = assembledStart(trackClips, Math.max(0, trackIndex));
    const end = start + Math.max(0.1, clip.end - clip.start);
    const intrinsic = await new Promise<{ width?: number; height?: number }>((resolve) => {
      const img = new Image(); img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight }); img.onerror = () => resolve({}); img.src = asset.url;
    });
    const added = runCommand("overlay.addImage", api, { assetId: asset.id, start, end, ...intrinsic });
    if (!added.ok) { setError(added.error); return; }
    const created = api.getOverlays().at(-1);
    if (!created) return;
    const ratio = created.transform.w / Math.max(1, created.transform.h);
    let w = canvas.width * 0.16, h = w / ratio;
    if (h > canvas.height * 0.22) { h = canvas.height * 0.22; w = h * ratio; }
    const styled = runCommand("overlay.update", api, { id: created.id, patch: { transform: { ...created.transform, w, h, x: canvas.width * 0.035 + w / 2, y: canvas.height * 0.045 + h / 2, rotation: 0 } } });
    if (!styled.ok) { setError(styled.error); return; }
    const removed = runCommand("clip.delete.ripple", api, { id: clip.id });
    if (!removed.ok) { setError(removed.error); return; }
    selectOverlay(created.id); seek(start);
    toast.success("התמונה הומרה ללוגו", "אפשר לגרור ולהקטין על הסרטון או להשתמש ב-X/Y/רוחב/גובה בצד.");
  };
  const addMediaClip = (asset: MediaAsset, atIndex?: number) => {
    const api = editorApiRef.current;
    if (!api) return;
    const trackId = asset.kind === "audio" ? (audioTrack(tracks)?.id || "trk_audio") : primaryVideoTrackId(tracks);
    const result = runCommand("clip.add", api, { sourceId: asset.id, trackId, at_index: atIndex });
    if (!result.ok) { setError(result.error); return; }
    setSelectedOverlayId(null);
    setSelectedSubId(null);
    setSelectionTrack(asset.kind === "audio" ? "audio" : "video");
  };
  const dropMediaOnTimeline = (assetId: string, atIndex: number, trackId?: string, timelineStart?: number) => {
    const asset = mediaById(media, assetId);
    if (!asset) return;
    const api = editorApiRef.current;
    if (!api) return;
    let tid = trackId;
    if (trackId === "__new_track__") {
      const { tracks: next, track } = createVideoTrack(tracks);
      setTracks(next);
      tid = track.id;
    } else {
      const requested = tracks.find((track) => track.id === trackId);
      tid = asset.kind === "audio"
        ? (audioTrack(tracks)?.id || "trk_audio")
        : requested?.type === "video" ? requested.id : primaryVideoTrackId(tracks);
    }
    const result = runCommand("clip.add", api, {
      sourceId: asset.id,
      trackId: tid,
      at_index: atIndex,
      timeline_start: timelineStart,
      start: 0,
      end: asset.duration,
    });
    if (!result.ok) { setError(result.error); return; }
    setSelectedOverlayId(null);
    setSelectedSubId(null);
    setSelectionTrack(asset.kind === "audio" ? "audio" : "video");
  };
  const moveClipAtTimeline = (id: string, trackId: string, timelineStart: number) => {
    const api = editorApiRef.current;
    if (!api) return;
    let tid = trackId;
    if (trackId === "__new_track__") {
      const { tracks: next, track } = createVideoTrack(tracks);
      setTracks(next);
      tid = track.id;
    } else {
      const clip = clipsRef.current?.find((c) => c.id === id);
      const asset = clip ? mediaById(mediaRef.current, clip.sourceId) : null;
      if (asset?.kind === "audio") {
        tid = audioTrack(tracks)?.id || "trk_audio";
      } else if (!tracks.some((t) => t.id === tid && t.type === "video")) {
        tid = primaryVideoTrackId(tracks);
      }
    }
    const result = runCommand("clip.moveAtTimeline", api, { id, trackId: tid, timeline_start: timelineStart });
    if (!result.ok) { setError(result.error); return; }
    setSelectedOverlayId(null);
    setSelectedSubId(null);
    setSelectionTrack(tracks.find((track) => track.id === tid)?.type === "audio" ? "audio" : "video");
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
  const addTextPreset = (preset: TextPreset) => {
    const api = editorApiRef.current;
    if (!api) return;
    const cw = canvas?.width || 1920;
    const ch = canvas?.height || 1080;
    const start = cur;
    const end = cur + preset.suggestedDuration;
    const w = Math.round((preset.box.width / 100) * cw);
    const h = Math.round((preset.box.height / 100) * ch);
    const x = Math.round(((preset.box.x + preset.box.width / 2) / 100) * cw);
    const y = Math.round(((preset.box.y + preset.box.height / 2) / 100) * ch);
    const fontSize = Math.round((preset.style.fontSize / 100) * Math.min(cw, ch));

    const o: Overlay = {
      id: uid("ov"),
      kind: "text",
      text: preset.sampleHe,
      color: preset.style.color,
      fontSize,
      bold: preset.style.bold,
      align: preset.style.align === "left" ? "start" : preset.style.align === "right" ? "end" : "center",
      background: preset.style.background || undefined,
      borderRadius: preset.style.borderRadius,
      borderColor: preset.style.borderColor,
      borderWidth: preset.style.borderWidth,
      fadeIn: preset.fade.in,
      fadeOut: preset.fade.out,
      start,
      end,
      zIndex: nextZ(overlays),
      transform: { x, y, w, h, rotation: 0, opacity: 1 },
    };
    api.addOverlay(o);
    api.selectOverlay(o.id);
    setSelectedId(null); setSelectedSubId(null); setSelectionTrack(null);
  };
  const addStickerOverlay = (sticker: GiphyAssetItem) => {
    const api = editorApiRef.current;
    if (!api) return;
    const assetId = uid("m_sticker");
    const asset: MediaAsset = {
      id: assetId,
      name: sticker.title || "Sticker",
      kind: "image",
      file: new File([], "sticker.gif", { type: "image/gif" }),
      duration: 5,
      url: sticker.fullUrl || sticker.previewUrl,
    };
    setMedia((prev) => [...prev, asset]);
    const cw = canvas?.width || 1920;
    const ch = canvas?.height || 1080;
    const ratio = (sticker.width && sticker.height) ? sticker.width / sticker.height : 1;
    const w = Math.round(cw * 0.22);
    const h = Math.round(w / ratio);
    const o: Overlay = {
      id: uid("ov"),
      kind: "image",
      assetId,
      start: cur,
      end: cur + 4,
      zIndex: nextZ(overlays),
      transform: { x: cw / 2, y: ch / 2, w, h, rotation: 0, opacity: 1 },
    };
    api.addOverlay(o);
    api.selectOverlay(o.id);
    setSelectedId(null); setSelectedSubId(null); setSelectionTrack(null);
  };
  const addVectorElementOverlay = (elem: VectorElement) => {
    const api = editorApiRef.current;
    if (!api) return;
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${elem.viewBox}" width="100" height="100" color="${elem.defaultColor}">${elem.svgPath}</svg>`;
    const assetId = uid("m_icon");
    const asset: MediaAsset = {
      id: assetId,
      name: elem.nameHe || "Icon",
      kind: "image",
      file: new File([], "icon.svg", { type: "image/svg+xml" }),
      duration: 5,
      url: `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`,
    };
    setMedia((prev) => [...prev, asset]);
    const cw = canvas?.width || 1920;
    const ch = canvas?.height || 1080;
    const w = Math.round(cw * 0.12);
    const o: Overlay = {
      id: uid("ov"),
      kind: "image",
      assetId,
      start: cur,
      end: cur + 4,
      zIndex: nextZ(overlays),
      transform: { x: cw / 2, y: ch / 2, w, h: w, rotation: 0, opacity: 1 },
    };
    api.addOverlay(o);
    api.selectOverlay(o.id);
    setSelectedId(null); setSelectedSubId(null); setSelectionTrack(null);
  };
  const addShapeOverlay = (shape: VectorShape) => {
    const api = editorApiRef.current;
    if (!api) return;
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${shape.viewBox}" width="100" height="100" color="${shape.defaultFill}">${shape.svgContent}</svg>`;
    const assetId = uid("m_shape");
    const asset: MediaAsset = {
      id: assetId,
      name: shape.nameHe || "Shape",
      kind: "image",
      file: new File([], "shape.svg", { type: "image/svg+xml" }),
      duration: 5,
      url: `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`,
    };
    setMedia((prev) => [...prev, asset]);
    const cw = canvas?.width || 1920;
    const ch = canvas?.height || 1080;
    const w = Math.round(cw * 0.2);
    const o: Overlay = {
      id: uid("ov"),
      kind: "image",
      assetId,
      start: cur,
      end: cur + 4,
      zIndex: nextZ(overlays),
      transform: { x: cw / 2, y: ch / 2, w, h: w, rotation: 0, opacity: 1 },
    };
    api.addOverlay(o);
    api.selectOverlay(o.id);
    setSelectedId(null); setSelectedSubId(null); setSelectionTrack(null);
  };
  const addMotionAssetOverlay = (motion: MotionAsset) => {
    const api = editorApiRef.current;
    if (!api) return;
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${motion.viewBox}" width="${motion.width}" height="${motion.height}">${motion.animatedSvgMarkup}</svg>`;
    const assetId = uid("m_motion");
    const asset: MediaAsset = {
      id: assetId,
      name: motion.nameHe || "Motion",
      kind: "image",
      file: new File([], "motion.svg", { type: "image/svg+xml" }),
      duration: motion.defaultDuration || 3,
      url: `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`,
    };
    setMedia((prev) => [...prev, asset]);
    const cw = canvas?.width || 1920;
    const ch = canvas?.height || 1080;
    const ratio = motion.width / Math.max(1, motion.height);
    const w = Math.round(cw * 0.25);
    const h = Math.round(w / ratio);
    const o: Overlay = {
      id: uid("ov"),
      kind: "image",
      assetId,
      start: cur,
      end: cur + (motion.defaultDuration || 3),
      zIndex: nextZ(overlays),
      transform: { x: cw / 2, y: ch / 2, w, h, rotation: 0, opacity: 1 },
    };
    api.addOverlay(o);
    api.selectOverlay(o.id);
    setSelectedId(null); setSelectedSubId(null); setSelectionTrack(null);
  };
  const selectClip = (id: string | null, track: "video" | "audio" = "video") => {
    setSelectedId(id);
    setSelectedIds(id ? [id] : []);
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
    setSelectedIds(id ? [id] : []);
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
    const commands: Array<{ id: "clip.trim" | "clip.setEnabled" | "clip.setVolume" | "clip.setAudioFades" | "clip.setOpacity" | "clip.setColorAdjustments" | "clip.setVisualFades" | "clip.setFlip"; args: Record<string, unknown> }> = [];
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
    if (patch.flipX != null || patch.flipY != null) commands.push({ id: "clip.setFlip", args: { id, flipX: patch.flipX, flipY: patch.flipY } });
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
          provider: "auto",
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
    if (rendering) { setExportOpen(true); return; }
    if (exportResult?.url) URL.revokeObjectURL(exportResult.url);
    const controller = new AbortController();
    renderAbortRef.current = controller;
    renderStartedAtRef.current = Date.now();
    setExportResult(null); setExportError(""); setExportOpen(true); setRenderElapsed(0);
    setError(""); setRendering(true); setProgress(0);
    try {
      let edl = flattenVideoTracks(clips, tracks);
      const aid = audioTrack(tracks)?.id;
      const audioClips = aid ? clipsOnTrack(clips, aid, primaryVideoTrackId(tracks)) : [];
      if (!edl.length && audioClips.length) edl = [{ id: uid("g"), sourceId: "__gap__", start: 0, end: totalDur(audioClips), trackId: primaryVideoTrackId(tracks) }];
      const policy = projectId ? await getProjectPolicy(projectId) : null;
      const cloudCapable = policy?.capabilities.render?.execution === "cloud" && !!policy.cloudProjectId
        && edl.every((clip) => isGapClip(clip) || !!mediaById(media, clip.sourceId)?.cloudAssetId)
        && audioClips.every((clip) => isGapClip(clip) || !!mediaById(media, clip.sourceId)?.cloudAssetId)
        && overlays.every((overlay) => overlay.kind === "image" && !!mediaById(media, overlay.assetId || "")?.cloudAssetId)
        && !(burnCaptions && subs?.length);
      let blob: Blob | null = null;
      if (cloudCapable && policy?.cloudProjectId) {
        try {
          setPhase("מכין את הסרטון בשרת המהיר…");
          blob = await renderCloudProject({
            projectId: policy.cloudProjectId,
            clips: edl.map((clip) => isGapClip(clip)
              ? ({ gap: true, start: 0, end: clip.end - clip.start })
              : ({ assetId: mediaById(media, clip.sourceId)!.cloudAssetId!, start: clip.start, end: clip.end })),
            audioClips: (() => { let timelineStart = 0; return audioClips.flatMap((clip) => {
              const duration = clip.end - clip.start;
              const startAt = timelineStart;
              timelineStart += duration;
              if (isGapClip(clip)) return [];
              const fades = clipAudioFades(clip);
              return [{ assetId: mediaById(media, clip.sourceId)!.cloudAssetId!, start: clip.start, end: clip.end, timelineStart: startAt, volume: clipVolume(clip), ...fades }];
            }); })(),
            overlays: [...overlays].sort((a, b) => a.zIndex - b.zIndex).map((overlay) => ({
              assetId: mediaById(media, overlay.assetId || "")!.cloudAssetId!, start: overlay.start, end: overlay.end,
              x: overlay.transform.x, y: overlay.transform.y, width: overlay.transform.w, height: overlay.transform.h,
              rotation: overlay.transform.rotation, opacity: overlay.transform.opacity, fadeIn: overlay.fadeIn, fadeOut: overlay.fadeOut,
            })),
            target: { width: canvas.width, height: canvas.height, fps: policy.fps },
          }, (r) => { setPhase("מעבד את הסרטון…"); setProgress(r); }, controller.signal);
        } catch (cloudErr) {
          if (controller.signal.aborted) throw cloudErr;
          console.warn("Cloud render unavailable, falling back to local render:", cloudErr);
          blob = null;
        }
      }

      if (!blob) {
        const { getRenderBackend } = await import("@/lib/render/RenderBackend");
        const backend = getRenderBackend();
        setPhase("מכין את הסרטון במכשיר…");
        blob = await backend.renderProject(
          { media, clips: edl, audioMuted: audioMuted(tracks), overlays, canvas, audioClips, subs, captionStyle, burnCaptions: burnCaptions && !!subs?.length },
          (r) => { setPhase("מרנדר את הסרטון במכשיר…"); setProgress(Math.min(1, r)); },
          controller.signal,
        );
      }
      const name = (main?.name.replace(/\.[^.]+$/, "") || "video") + "_edited.mp4";
      const url = URL.createObjectURL(blob);
      setExportResult({ url, name, size: blob.size });
      setChatOpen(true); localStorage.setItem("hs_chatOpen", "1");
      setProgress(1);
      setPhase("הרינדור הושלם");
      toast.success("הייצוא הושלם", burnCaptions && subs?.length ? "כולל כתוביות צרובות" : undefined);
    } catch (e: any) {
      const message = controller.signal.aborted ? "הייצוא בוטל." : (e?.message || String(e));
      setExportError(message);
      setError(message);
      setPhase("");
    }
    finally { renderAbortRef.current = null; setRendering(false); }
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
    if (selectedIds.length > 1) {
      for (const id of selectedIds) {
        if (overlays.some((o) => o.id === id)) {
          runCommand("overlay.delete", editorApiRef.current!, { id });
        } else if (clips?.some((c) => c.id === id)) {
          deleteClipById(id, leaveGap);
        }
      }
      setSelectedIds([]);
      setSelectedId(null);
      setSelectedOverlayId(null);
      return;
    }
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
  const toggleOverlayLock = (id: string) => { const item = overlays.find((o) => o.id === id); if (item) updateOverlay(id, { locked: !item.locked }); };
  const toggleOverlayVisibility = (id: string) => { const item = overlays.find((o) => o.id === id); if (item) updateOverlay(id, { hidden: !item.hidden }); };
  const reorderOverlay = (id: string, dir: -1 | 1) => {
    const ordered = [...overlays].sort((a, b) => a.zIndex - b.zIndex);
    const index = ordered.findIndex((o) => o.id === id);
    const other = ordered[index + dir];
    const current = ordered[index];
    if (!current || !other) return;
    setOverlays(overlays.map((o) => o.id === current.id ? { ...o, zIndex: other.zIndex } : o.id === other.id ? { ...o, zIndex: current.zIndex } : o));
  };

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

  const copySelection = () => {
    if (selectedOverlay) editorClipboardRef.current = { kind: "overlay", value: { ...selectedOverlay, transform: { ...selectedOverlay.transform } } };
    else if (selectedSub) editorClipboardRef.current = { kind: "sub", value: { ...selectedSub } };
    else if (selectedClip) editorClipboardRef.current = { kind: "clip", value: { ...selectedClip } };
    else return false;
    return true;
  };
  const pasteSelection = () => {
    const item = editorClipboardRef.current;
    if (!item) return false;
    if (item.kind === "clip") {
      const id = uid("c");
      const clone = { ...item.value, id };
      setClips((current) => {
        if (!current) return [clone];
        const primary = primaryVideoTrackId(tracks);
        const trackId = clone.trackId || primary;
        const onTrack = clipsOnTrack(current, trackId, primary);
        const sourceIndex = Math.max(0, onTrack.findIndex((clip) => clip.id === item.value.id));
        return replaceTrackClips(current, trackId, [...onTrack.slice(0, sourceIndex + 1), clone, ...onTrack.slice(sourceIndex + 1)], primary);
      });
      setSelectedId(id); setSelectionTrack((clone.trackId || "").includes("audio") ? "audio" : "video");
    } else if (item.kind === "overlay") {
      const id = uid("ov");
      const offset = 0.1;
      addOverlay({ ...item.value, id, start: item.value.start + offset, end: item.value.end + offset, zIndex: Math.max(0, ...overlays.map((o) => o.zIndex)) + 1, transform: { ...item.value.transform } });
      setSelectedOverlayId(id);
    } else {
      const id = uid("sub");
      setSubs((current) => [...(current || []), { ...item.value, id, start: item.value.start + 0.1, end: item.value.end + 0.1 }]);
      setSelectedSubId(id);
    }
    return true;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable || t.closest?.("input, textarea, [contenteditable='true']"))) return;
      const isSpace = e.code === "Space" || e.key === " " || e.key === "Spacebar";
      const meta = e.ctrlKey || e.metaKey;
      if (isSpace && !meta && !e.altKey) { e.preventDefault(); e.stopPropagation(); previewRef.current?.toggle(); return; }
      if (meta && e.key.toLowerCase() === "k") { e.preventDefault(); setCommandMenu({ x: Math.max(12, window.innerWidth / 2 - 150), y: Math.max(12, window.innerHeight / 3) }); }
      else if (meta && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (meta && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
      else if (meta && e.key.toLowerCase() === "c" && copySelection()) { e.preventDefault(); }
      else if (meta && e.key.toLowerCase() === "x" && copySelection()) { e.preventDefault(); deleteSel(false); }
      else if (meta && e.key.toLowerCase() === "v" && pasteSelection()) { e.preventDefault(); }
      else if (e.key === "ArrowLeft" && !e.altKey) { e.preventDefault(); seek(Math.max(0, curRef.current - (e.shiftKey ? 1 : 1 / 30))); }
      else if (e.key === "ArrowRight" && !e.altKey) { e.preventDefault(); seek(Math.min(timelineDuration, curRef.current + (e.shiftKey ? 1 : 1 / 30))); }
      else if (e.key === "Home") { e.preventDefault(); seek(0); }
      else if (e.key === "End") { e.preventDefault(); seek(timelineDuration); }
      else if (e.key.toLowerCase() === "k" && !meta) { e.preventDefault(); previewRef.current?.toggle(); }
      else if ((e.key === "Delete" || e.key === "Backspace") && (selectedId || selectedOverlayId || selectedSubId)) { e.preventDefault(); deleteSel(e.shiftKey); }
      else if (e.key === "Escape") { setSelectedId(null); setSelectedOverlayId(null); setSelectedSubId(null); setSelectionTrack(null); }
      else if (e.key.toLowerCase() === "s" && !meta && clips?.length) { e.preventDefault(); splitAtPlayhead(); }
      else if (e.key.toLowerCase() === "m" && !meta && !e.altKey) { e.preventDefault(); setSnap((value) => !value); }
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

  useEffect(() => {
    const applyTips = () => {
      document.querySelectorAll<HTMLElement>("button:not([data-tip]), [role='button']:not([data-tip])").forEach((el) => {
        const label = el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent?.trim();
        if (label) el.dataset.tip = label.replace(/\s+/g, " ").slice(0, 120);
      });
    };
    applyTips();
    const observer = new MutationObserver(applyTips);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const working = busy || rendering;
  const dedicatedAudioClips = clips && audioTrack(tracks) ? clipsOnTrack(clips, audioTrack(tracks)!.id, primaryVideoTrackId(tracks)) : [];
  const totalEdited = clips ? Math.max(projectDuration(clips, tracks), totalDur(dedicatedAudioClips)) : duration;
  // Once an EDL exists, its assembled time is the source of truth. Including
  // the unedited source duration here stretched a 60s edit across a 1048s ruler.
  const timelineDuration = Math.max(clips ? totalEdited : duration, ...overlays.map((o) => o.end), 0.001);
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
    <div className="col-resize" onPointerDown={startResizeChat} onDoubleClick={resetChatWidth} onKeyDown={resizeChatByKey} tabIndex={0}
      title="גרור לשינוי רוחב · דאבל-קליק לאיפוס" role="separator" aria-orientation="vertical" aria-label="שינוי רוחב פאנל הסוכן" />
  );
  const agentDock = chatOpen ? (
    <>
      {dockSide === "right" && dockHandle}
      <aside className="agent-dock" style={{ width: chatWidth }} data-tour="chat">
        <Chat media={media} onAddMedia={addFiles} onClose={toggleChat} words={words} clips={clips} subs={subs}
          script={script} overlays={overlays} canvas={canvas} projectId={projectId}
          captionStyle={captionStyle}
          editorApi={editorApiRef.current} tracks={tracks}
          latestExport={exportResult}
          onProject={({ words: w, clips: c, subs: s, overlays: ovs, tracks: tr, viaEditor }) => {
            setWords(w);
            if (viaEditor) return; // כבר נדחף דרך EditorApi/CommandBus
            setProject(c, s);
            if (ovs) setOverlays(ovs);
            if (tr?.length) setTracks(tr);
          }}
          playhead={cur} selectionLabel={agentSelLabel} dockSide={dockSide} onToggleDock={toggleDockSide}
          quoteSink={quoteSink} pendingQuoteRef={pendingQuoteRef}
          mentionSink={mentionSink} pendingMentionRef={pendingMentionRef} />
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
        { label: "שנה שם", icon: Pencil, onClick: () => setNameDlg({ kind: "media", id: assetMenuTarget.id, name: assetMenuTarget.name }) },
        { label: assetMenuTarget.kind === "image" ? "הוסף כתמונה מלאה לציר" : "הוסף לציר הזמן", icon: Plus, onClick: () => addMediaClip(assetMenuTarget) },
        ...(assetMenuTarget.kind === "image" ? [{ label: "הוסף כשכבה / לוגו", icon: Layers, onClick: () => addImageOverlay(assetMenuTarget) }] : []),
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
    <div className="editor-root" onContextMenu={(e) => {
      if (e.defaultPrevented) return;
      e.preventDefault();
      setCommandMenu({ x: e.clientX, y: e.clientY });
    }}>
      <TopBar
        canvas={canvas} onChangeCanvas={setCanvas}
        projectName={projectName} projects={projects} projectId={projectId} saving={saving}
        onSwitch={switchProject} onNew={newProject} onRename={renameCurrent} onDelete={deleteCurrent}
        canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo}
        chatOpen={chatOpen} onToggleChat={toggleChat}
        focusMode={focusMode} onToggleFocusMode={toggleFocusMode}
        canExport={!!clips?.length} rendering={rendering} renderProgress={progress} onExport={() => rendering ? setExportOpen(true) : void render()}
        onOpenTour={() => setTourOpen(true)}
      />

      {!restored && <div className="editor-hydration-loading"><LoadingState label="טוען את הפרויקט, המדיה וציר הזמן…" lines={4} /></div>}

      {!groqOk && <div className="banner2">תמלול הגיבוי באיכות מופחתת אינו זמין כרגע. תמלול ElevenLabs הראשי ממשיך כרגיל.</div>}

      <EditorTour
        open={tourOpen}
        onClose={() => {
          setTourOpen(false);
          localStorage.removeItem("hs_editor_tour_pending");
          localStorage.setItem("hs_editor_tour_done", "1");
        }}
        onFinish={() => {
          setTourOpen(false);
          localStorage.removeItem("hs_editor_tour_pending");
          localStorage.setItem("hs_editor_tour_done", "1");
          setFocusMode(false);
          setChatOpen(true);
          localStorage.setItem("hs_chatFocus", "0");
          localStorage.setItem("hs_chatOpen", "1");
          window.dispatchEvent(new CustomEvent("hypescript:chat-example", { detail: "הסר שתיקות ונשימות, צור כתוביות בעברית והכן לי סרטון מוכן לייצוא." }));
        }}
      />

      <ExportDialog
        open={exportOpen}
        rendering={rendering}
        progress={progress}
        elapsedSeconds={renderElapsed}
        phase={phase}
        error={exportError}
        result={exportResult}
        onClose={() => setExportOpen(false)}
        onCancel={() => renderAbortRef.current?.abort()}
        onRetry={() => void render()}
      />

      {/* ChatGPT-Style Centered Conversation Mode */}
      {focusMode && (
        <div className="chat-focus-shell chat-gpt-conversation-shell">
          <div className="chat-gpt-container">
            <Chat
              media={media} onAddMedia={addFiles} onClose={toggleFocusMode} words={words} clips={clips} subs={subs}
              script={script} overlays={overlays} canvas={canvas} projectId={projectId} captionStyle={captionStyle}
              editorApi={editorApiRef.current} tracks={tracks} latestExport={exportResult}
              onProject={({ words: w, clips: c, subs: s, overlays: ovs, tracks: tr, viaEditor }) => {
                setWords(w); if (viaEditor) return; setProject(c, s); if (ovs) setOverlays(ovs); if (tr?.length) setTracks(tr);
              }}
              playhead={cur} selectionLabel={agentSelLabel} quoteSink={quoteSink} pendingQuoteRef={pendingQuoteRef}
              mentionSink={mentionSink} pendingMentionRef={pendingMentionRef}
              inFocusMode={true}
              renderVideoPreview={() => (
                <VideoPreview
                  ref={previewRef} media={media} clips={clips} tracks={tracks} subs={subs} onTime={setCur}
                  selectedSubId={selectedSubId} onSelectSub={selectSub} onEditSub={editSub}
                  onCaptionPosition={(position) => {
                    if (!editorApiRef.current) return;
                    const result = runCommand("caption.setStyle", editorApiRef.current, { position });
                    if (!result.ok) setError(result.error);
                  }}
                  onCopyPosition={quotePlace} audioMuted={audioMuted(tracks)}
                  canvas={canvas} onChangeCanvas={setCanvas} overlays={overlays} selectedOverlayId={selectedOverlayId}
                  onSelectOverlay={selectOverlay} onBeginOverlay={beginTransaction}
                  onOverlayLive={(u) => setOverlaysLive(u)} onCommitOverlay={commitTransaction} onCancelOverlay={cancelTransaction}
                  onEditOverlayText={(id, current) => setNameDlg({ kind: "overlayText", id, text: current })}
                  onCanvasDetected={onCanvasDetected} captionStyle={captionStyle}
                  onRelinkMedia={(id) => { relinkTargetIdRef.current = id; relinkInputRef.current?.click(); }}
                />
              )}
            />
          </div>
        </div>
      )}

      {!focusMode && <div className="shell-body" data-mobile-surface={mobileSurface}>
        {dockSide === "left" && agentDock}
        <ToolRail active={leftTab} onSelect={(tab) => { setLeftTab(tab); selectMobileSurface("tools"); }} />

        <div className="leftpanel" style={{ width: leftW }} data-tour="media">
          {leftTab === "media" ? (
            <MediaPanel media={media} mainId={main?.id} uploadProgress={uploadProgress} onUpload={addFiles} onAddClip={addMediaClip} onAddOverlay={addImageOverlay} onMention={mentionMedia} onRename={(asset) => setNameDlg({ kind: "media", id: asset.id, name: asset.name })} onRemove={removeMedia} onRelink={relinkMedia}
              onAssetMenu={(id, x, y) => setAssetMenu({ id, x, y })} />
          ) : leftTab === "text" ? (
            <TextPanel
              onAddText={addTextOverlay}
              onAddPopup={(presetName) => {
                const preset = TEXT_PRESETS.find((p) => p.id === presetName);
                if (preset) addTextPreset(preset);
              }}
              onAddPreset={addTextPreset}
              onSelectFont={(family) => {
                loadGoogleFont(family);
                setCaptionStyle((s) => ({ ...s, fontFamily: family }));
              }}
            />
          ) : leftTab === "captions" ? (
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
          ) : (
            <CreativePanel
              kind={leftTab}
              clip={selectedClip}
              onApply={(patch) => selectedClip && updateClipFromInspector(selectedClip.id, patch)}
              onAddTextTemplate={addTextPreset}
              onAddSticker={addStickerOverlay}
              onAddVectorElement={addVectorElementOverlay}
              onAddShape={addShapeOverlay}
              onAddMotionAsset={addMotionAssetOverlay}
              captionStyle={captionStyle}
              onCaptionStyle={(patch) => {
                if (!editorApiRef.current) { setCaptionStyle((s) => ({ ...s, ...patch })); return; }
                const res = runCommand("caption.setStyle", editorApiRef.current, patch);
                if (!res.ok) setError(res.error);
              }}
              selectedFont={captionStyle?.fontFamily}
              onSelectFont={(family) => {
                loadGoogleFont(family);
                setCaptionStyle((s) => ({ ...s, fontFamily: family }));
              }}
            />
          )}
        </div>
        <div className="col-resize" onPointerDown={startResizeLeft} onDoubleClick={resetLeft} onKeyDown={resizeLeftByKey} tabIndex={0}
          title="גרור לשינוי רוחב · דאבל-קליק לאיפוס" role="separator" aria-orientation="vertical" aria-label="שינוי רוחב פאנל מדיה" />

        <div className="main-area">
          <div className="upper">
            <div className="center-col" data-tour="preview">
              <VideoPreview ref={previewRef} media={media} clips={clips} tracks={tracks} subs={subs} onTime={setCur}
                selectedSubId={selectedSubId} onSelectSub={selectSub} onEditSub={editSub}
                onCaptionPosition={(position) => {
                  if (!editorApiRef.current) return;
                  const result = runCommand("caption.setStyle", editorApiRef.current, { position });
                  if (!result.ok) setError(result.error);
                }}
                onCopyPosition={quotePlace} audioMuted={audioMuted(tracks)}
                canvas={canvas} onChangeCanvas={setCanvas} overlays={overlays} selectedOverlayId={selectedOverlayId}
                onSelectOverlay={selectOverlay}
                onBeginOverlay={beginTransaction}
                onOverlayLive={(u) => setOverlaysLive(u)}
                onCommitOverlay={commitTransaction}
                onCancelOverlay={cancelTransaction}
                onEditOverlayText={(id, current) => setNameDlg({ kind: "overlayText", id, text: current })}
                onCanvasDetected={onCanvasDetected}
                captionStyle={captionStyle}
                onRelinkMedia={(id) => { relinkTargetIdRef.current = id; relinkInputRef.current?.click(); }} />
              {(working || phase) && (
                <div className="status-strip">
                  <span className="s-msg">{phase}</span>
                  {working && <div className="s-bar"><div style={{ width: `${Math.round(progress * 100)}%` }} /></div>}
                </div>
              )}
              {uploadProgress && <div className="preview-upload-float"><UploadProgressCard value={uploadProgress} /></div>}
            </div>

            <div className="col-resize" onPointerDown={startResizeInsp} onDoubleClick={resetInsp} onKeyDown={resizeInspectorByKey} tabIndex={0}
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
              onConvertImageClipToOverlay={selectedClip && mediaById(media, selectedClip.sourceId)?.kind === "image" ? convertSelectedImageClipToLogo : undefined}
              onUpdateOverlay={(patch) => {
                if (!selectedOverlay || !editorApiRef.current) return;
                const result = runCommand("overlay.update", editorApiRef.current, { id: selectedOverlay.id, patch });
                if (!result.ok) setError(result.error);
              }}
              onUpdateSub={(patch) => selectedSub && updateSubFromInspector(selectedSub, patch)}
              canvas={canvas}
              onChangeCanvas={setCanvas}
              captionStyle={captionStyle}
              onCaptionStyle={(patch) => {
                if (!editorApiRef.current) return;
                const result = runCommand("caption.setStyle", editorApiRef.current, patch);
                if (!result.ok) setError(result.error);
              }}
              projectName={projectName} mediaCount={media.length} sourceDuration={duration} editedDuration={totalEdited}
            />
          </div>

          <div className="timeline-region" style={{ height: tlHeight }} data-tour="timeline">
            <div className={`tl-resize${resizingTimeline ? " is-resizing" : ""}`} onPointerDown={startResizeTL} onDoubleClick={resetTimeline} onKeyDown={resizeTimelineByKey}
              title="גרור לשינוי גובה · חצים למעלה/למטה · דאבל-קליק לאיפוס" role="separator" tabIndex={0}
              aria-orientation="horizontal" aria-label="שינוי הגובה בין הנגן לטיימליין"><span /></div>
            <TimelineToolbar
              selInfo={selectedOverlay ? `${(selectedOverlay.end - selectedOverlay.start).toFixed(1)}s` : selectedClip ? `${(selectedClip.end - selectedClip.start).toFixed(1)}s` : ""}
              canSplit={!!clips?.length && !vLocked && !selectedIsGap} canDelete={(!!selectedId && !vLocked) || !!selectedOverlayId || !!selectedSubId}
              onSplit={splitAtPlayhead} onDelete={deleteSel}
              onDeleteLeaveGap={() => deleteSel(true)} canLeaveGap={!!selectedClip && !selectedIsGap && !vLocked}
              canRoll={!!selectedId && !vLocked && !!clips && clips.length >= 2 && !selectedIsGap}
              canSlip={!!selectedId && !vLocked && !selectedIsGap}
              onRoll={rollSelected} onSlip={slipSelected}
              zoom={zoom} onZoom={setZoom} onFit={() => setZoom(1)}
              avLinked={avLinked} onAvLinked={setAvLinked}
            />
            {clips || media.length > 0 ? (
              <Timeline
                media={media} clips={clips || []} subs={subs} overlays={overlays} tracks={tracks}
                maxDuration={timelineDuration}
                currentAssembled={cur} selectedId={selectedId} selectedIds={selectedIds} selectedOverlayId={selectedOverlayId}
                selectedSubId={selectedSubId} selectionTrack={selectionTrack} avLinked={avLinked}
                zoom={zoom} onZoom={setZoom} snap={snap}
                onSeek={seek} onSelect={selectClip} onSelectMulti={(ids) => setSelectedIds(ids)} onSelectOverlay={selectOverlay} onSelectSub={selectSub}
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
                onSubMenu={(id, x, y) => setSubMenu({ id, x, y })}
                onTrackMenu={(id, x, y) => setTrackMenu({ id, x, y })}
                onDropMedia={dropMediaOnTimeline}
                onMoveAtTime={moveClipAtTimeline}
                onAddVideoTrack={addVideoTrack}
                onOverlayTrimBegin={beginTransaction}
                onOverlayTrim={setOverlayRangeLive}
                onOverlayTrimEnd={commitTransaction}
                onOverlayMove={setOverlayMoveLive}
                onOverlayToggleLock={toggleOverlayLock}
                onOverlayToggleVisibility={toggleOverlayVisibility}
                onOverlayReorder={reorderOverlay}
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
      </div>}

      {!focusMode && <MobileEditorNav
        active={mobileSurface}
        onSelect={selectMobileSurface}
        hasSelection={!!selectedClip || !!selectedOverlay || !!selectedSub}
      />}

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
        open={nameDlg.kind === "media"}
        title="שינוי שם קובץ"
        label="שם הקובץ"
        initial={nameDlg.kind === "media" ? nameDlg.name : ""}
        confirmLabel="שמור"
        onClose={() => setNameDlg({ kind: "none" })}
        onSubmit={(name) => {
          if (nameDlg.kind === "media") renameMedia(nameDlg.id, name);
          setNameDlg({ kind: "none" });
        }}
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
      <input
        ref={relinkInputRef}
        type="file"
        accept="video/*,image/*,audio/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          const id = relinkTargetIdRef.current;
          if (f && id) relinkMedia(id, f);
          e.currentTarget.value = "";
          relinkTargetIdRef.current = null;
        }}
      />
    </div>
  );
}
