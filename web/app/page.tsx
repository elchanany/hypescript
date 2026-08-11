"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Word } from "@/lib/models";
import {
  assembledStart, Clip, MediaAsset, MediaKind, firstVideo, mediaById, totalDur, trimClip, uid,
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
import { clipsOnTrack, flattenVideoTracks, projectDuration } from "@/lib/editor/tracks";
import { TitlePopupPreset } from "@/lib/editor/overlay";
import { deleteProject, ensureProject, kvGet, kvSet, listProjects, pk, ProjectMeta, renameProject, setCurrentProject, touchProject } from "@/lib/storage";
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
import CreativePanel from "@/components/CreativePanel";
import InspectorPanel from "@/components/InspectorPanel";
import TimelineToolbar from "@/components/TimelineToolbar";
import Chat from "@/components/Chat";
import VideoPreview, { PreviewHandle } from "@/components/VideoPreview";
import Timeline from "@/components/Timeline";
import ExportDialog, { ExportResult } from "@/components/ExportDialog";
import { getProjectPolicy } from "@/lib/projects/policy";
import { deleteCloudProject, getCloudProject, renameCloudProject, renderCloudProject, saveCloudProjectState, uploadCloudAsset } from "@/lib/cloud/client";
import { createProjectWithPolicy } from "@/lib/projects/create";
import { DEFAULT_POLICY } from "@/lib/projects/types";

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
  const [exportOpen, setExportOpen] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [exportError, setExportError] = useState("");
  const [renderElapsed, setRenderElapsed] = useState(0);
  const renderAbortRef = useRef<AbortController | null>(null);
  const renderStartedAtRef = useRef(0);
  const [groqOk, setGroqOk] = useState(true);

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

  // layout state
  const [leftTab, setLeftTab] = useState<LeftTab>("media");
  const [chatOpen, setChatOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [chatWidth, setChatWidth] = useState(460);
  const chatWidthRef = useRef(460); chatWidthRef.current = chatWidth;
  const [dockSide, setDockSide] = useState<"left" | "right">("right");
  const dockSideRef = useRef<"left" | "right">("right"); dockSideRef.current = dockSide;
  const [tlHeight, setTlHeight] = useState(380);
  const tlHeightRef = useRef(380); tlHeightRef.current = tlHeight;
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
        if (asset) URL.revokeObjectURL(asset.url);
        return items.filter((item) => item.id !== id);
      }),
      // Browser-only I/O: assets imported from a brand kit / agent land here so
      // they persist (media → kvSet effect) and appear in the media panel.
      // נגזר את האוסף הבא באופן סינכרוני מ-mediaRef.current ומעדכנים אותו לפני
      // setMedia — כך getMedia רואה את המערך החדש מייד, בלי למוטט את מערך ה-state.
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
    const focus = localStorage.getItem("hs_chatFocus"); if (focus === "1") { setFocusMode(true); setChatOpen(true); }
    const w = parseInt(localStorage.getItem("hs_chatw") || "0", 10); if (w >= 320) setChatWidth(Math.min(720, w));
    const ds = localStorage.getItem("hs_dockside"); if (ds === "left" || ds === "right") setDockSide(ds);
    const h = parseInt(localStorage.getItem("hs_tlh") || "0", 10);
    const maxTimeline = Math.max(260, window.innerHeight - 300);
    if (h >= 220) setTlHeight(Math.min(maxTimeline, h));
    else setTlHeight(Math.max(280, Math.min(maxTimeline, Math.round(window.innerHeight * 0.38))));
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
  const resizeChatByKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const direction = dockSideRef.current === "right" ? (e.key === "ArrowLeft" ? 1 : -1) : (e.key === "ArrowRight" ? 1 : -1);
    const next = Math.max(360, Math.min(720, chatWidthRef.current + direction * 24));
    setChatWidth(next); localStorage.setItem("hs_chatw", String(next));
  };
  const toggleDockSide = () => setDockSide((s) => { const n = s === "right" ? "left" : "right"; localStorage.setItem("hs_dockside", n); return n; });
  const startResizeTL = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY; const startH = tlHeightRef.current;
    const onMove = (ev: MouseEvent) => setTlHeight(Math.max(240, Math.min(Math.max(260, window.innerHeight - 300), startH + (startY - ev.clientY))));
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
  const resetTimeline = () => {
    const next = Math.max(280, Math.min(Math.max(260, window.innerHeight - 300), Math.round(window.innerHeight * 0.38)));
    setTlHeight(next); localStorage.setItem("hs_tlh", String(next));
  };
  const resizeTimelineByKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const next = Math.max(240, Math.min(Math.max(260, window.innerHeight - 300), tlHeightRef.current + (e.key === "ArrowUp" ? 24 : -24)));
    setTlHeight(next); localStorage.setItem("hs_tlh", String(next));
  };
  const resetLeft = () => { setLeftW(264); localStorage.setItem("hs_leftw", "264"); };
  const resizeLeftByKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = Math.max(220, Math.min(440, leftWRef.current + (e.key === "ArrowRight" ? 24 : -24)));
    setLeftW(next); localStorage.setItem("hs_leftw", String(next));
  };
  const startResizeInsp = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX; const startW = inspWRef.current;
    const onMove = (ev: MouseEvent) => setInspW(Math.max(260, Math.min(460, startW - (ev.clientX - startX))));
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); localStorage.setItem("hs_inspw", String(inspWRef.current)); document.body.style.userSelect = ""; };
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  };
  const resetInsp = () => { setInspW(300); localStorage.setItem("hs_inspw", "300"); };
  const resizeInspectorByKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = Math.max(260, Math.min(460, inspWRef.current + (e.key === "ArrowLeft" ? 24 : -24)));
    setInspW(next); localStorage.setItem("hs_inspw", String(next));
  };
  const toggleChat = () => setChatOpen((o) => { localStorage.setItem("hs_chatOpen", o ? "0" : "1"); return !o; });
  const toggleFocusMode = () => setFocusMode((current) => {
    const next = !current;
    localStorage.setItem("hs_chatFocus", next ? "1" : "0");
    if (next) { setChatOpen(true); localStorage.setItem("hs_chatOpen", "1"); }
    return next;
  });

  useEffect(() => {
    (async () => {
      const existing = await listProjects();
      const id = existing.length
        ? await ensureProject()
        : await createProjectWithPolicy({ name: "פרויקט 1", policy: DEFAULT_POLICY() });
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
          out.push({ id: m.id, name: m.name, kind: m.kind, duration: m.duration, file, url: URL.createObjectURL(file), cloudAssetId: m.cloudAssetId, cloudObjectKey: m.cloudObjectKey, cloudState: m.cloudState });
        }
        return out;
      });
      let raw = await kvGet<any>(pk(projectId, "state"));
      const policy = await getProjectPolicy(projectId);
      if (!raw && policy?.cloudProjectId) {
        try {
          const cloud = await getCloudProject(policy.cloudProjectId);
          raw = cloud.project.editor_state;
          if (raw && Object.keys(raw).length > 0) await kvSet(pk(projectId, "state"), raw);
        } catch { /* local cache remains usable while offline */ }
      }
      setWords(raw?.words ?? null);
      const st = migrateState(raw);
      resetEditor({ clips: st.clips, subs: st.subs, tracks: st.tracks, overlays: st.overlays, canvas: st.canvas, captionStyle: st.captionStyle });
      setCur(0); setSelectedId(null); setSelectedOverlayId(null); setSelectedSubId(null); setSelectionTrack(null);
      setRestored(true);
    })();
  }, [projectId]);

  useEffect(() => {
    if (!restored || !projectId) return;
    kvSet(pk(projectId, "media"), media.map((m) => ({ id: m.id, name: m.name, kind: m.kind, duration: m.duration, blob: m.file, cloudAssetId: m.cloudAssetId, cloudObjectKey: m.cloudObjectKey, cloudState: m.cloudState })));
    touchProject(projectId);
  }, [media, restored, projectId]);

  useEffect(() => {
    if (!restored || !projectId) return;
    setSaving(true);
    const t = setTimeout(async () => {
      const state = { schemaVersion: SCHEMA_VERSION, words, clips, subs, tracks, overlays, canvas, captionStyle };
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
  }, [words, clips, subs, tracks, overlays, canvas, captionStyle, restored, projectId]);

  const switchProject = async (id: string) => { if (id === projectId) return; await setCurrentProject(id); setProjectId(id); };
  const newProject = () => setProjDlg("create");
  const renameCurrent = () => { if (projectId) setProjDlg("rename"); };
  const deleteCurrent = () => { if (projectId) setProjDlg("delete"); };

  const submitCreate = async (name: string) => {
    setProjDlg("none");
    const id = await createProjectWithPolicy({ name: name || "פרויקט", policy: DEFAULT_POLICY() });
    setProjects(await listProjects()); setProjectId(id);
    toast.success("הפרויקט נוצר", name);
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

  const addFiles = async (files: FileList | File[] | null) => {
    if (!files) return;
    const arr = Array.from(files);
    const policy = projectId ? await getProjectPolicy(projectId) : null;
    const shouldUpload = !!policy?.cloudProjectId && policy.storageBackend === "r2" && policy.dataMode !== "local";
    try {
      if (shouldUpload) setPhase("מעלה מדיה מוצפנת לענן…");
      const assets = await Promise.all(arr.map(async (f, index) => {
        const kind = kindOf(f);
        const asset: MediaAsset = { id: uid("m"), name: f.name, kind, file: f, duration: await probeDuration(f, kind), url: URL.createObjectURL(f) };
        if (shouldUpload && policy?.cloudProjectId) {
          const cloud = await uploadCloudAsset(policy.cloudProjectId, f, (ratio) => setProgress((index + ratio) / arr.length));
          asset.cloudAssetId = cloud.assetId;
          asset.cloudObjectKey = cloud.objectKey;
          asset.cloudState = "available";
        }
        return asset;
      }));
      setMedia((current) => [...current, ...assets]);
      if (shouldUpload) toast.success("ההעלאה לענן הושלמה", `${arr.length} קבצים נשמרו ב־R2 פרטי`);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "העלאה לענן נכשלה";
      setError(message); toast.error("העלאה לענן נכשלה", message);
    } finally {
      if (shouldUpload) { setPhase(""); setProgress(0); }
    }
  };

  const seek = (a: number) => { setCur(a); previewRef.current?.seek(a); };

  const removeMedia = (id: string) => {
    if (!editorApiRef.current) return;
    const result = runCommand("media.remove", editorApiRef.current, { id });
    if (!result.ok) setError(result.error);
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
    const requested = tracks.find((track) => track.id === trackId);
    const tid = asset.kind === "audio"
      ? (audioTrack(tracks)?.id || "trk_audio")
      : requested?.type === "video" ? requested.id : primaryVideoTrackId(tracks);
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
    const result = runCommand("clip.moveAtTimeline", api, { id, trackId, timeline_start: timelineStart });
    if (!result.ok) { setError(result.error); return; }
    setSelectedOverlayId(null);
    setSelectedSubId(null);
    setSelectionTrack(tracks.find((track) => track.id === trackId)?.type === "audio" ? "audio" : "video");
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
  const addStyledPopup = (presetName: TitlePopupPreset) => {
    const api = editorApiRef.current;
    if (!api) return;
    const end = Math.max(cur + 3.5, cur + 0.1);
    const text = presetName === "speaker_card" ? "שם\nתיאור קצר" : presetName === "dedication_card" ? "כותרת מרכזית\nפרטים נוספים" : "כותרת הסרטון\nטקסט משני";
    const result = runCommand("overlay.addText", api, { text, start: cur, end, preset: presetName });
    if (!result.ok) { setError(result.error); return; }
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
        && edl.every((clip) => mediaById(media, clip.sourceId)?.cloudAssetId)
        && !audioClips.length && !overlays.length && !(burnCaptions && subs?.length);
      let blob: Blob;
      if (cloudCapable && policy?.cloudProjectId) {
        setPhase("שולח לרינדור מדויק בענן…");
        blob = await renderCloudProject({
          projectId: policy.cloudProjectId,
          clips: edl.map((clip) => ({ assetId: mediaById(media, clip.sourceId)!.cloudAssetId!, start: clip.start, end: clip.end })),
          target: { width: canvas.width, height: canvas.height, fps: policy.fps },
        }, (r) => { setPhase("מרנדר בענן…"); setProgress(r); }, controller.signal);
      } else {
        const { getRenderBackend } = await import("@/lib/render/RenderBackend");
        const backend = getRenderBackend();
        setPhase(policy?.capabilities.render?.execution === "cloud" ? "שכבות מורכבות: מרנדר מקומית לשמירת נאמנות מלאה…" : "מכין קבצים לרינדור מקומי…");
        blob = await backend.renderProject(
          { media, clips: edl, audioMuted: audioMuted(tracks), overlays, canvas, audioClips, subs, captionStyle, burnCaptions: burnCaptions && !!subs?.length },
          (r) => { setPhase("מרנדר את הסרטון…"); setProgress(Math.min(1, r)); },
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
  const timelineDuration = Math.max(duration, totalEdited, ...overlays.map((o) => o.end), 0.001);
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
    <div className="col-resize" onMouseDown={startResizeChat} onDoubleClick={resetChatWidth} onKeyDown={resizeChatByKey} tabIndex={0}
      title="גרור לשינוי רוחב · דאבל-קליק לאיפוס" role="separator" aria-orientation="vertical" aria-label="שינוי רוחב פאנל הסוכן" />
  );
  const agentDock = chatOpen ? (
    <>
      {dockSide === "right" && dockHandle}
      <aside className="agent-dock" style={{ width: chatWidth }}>
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
        projectName={projectName} projects={projects} projectId={projectId} saving={saving}
        onSwitch={switchProject} onNew={newProject} onRename={renameCurrent} onDelete={deleteCurrent}
        canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo}
        chatOpen={chatOpen} onToggleChat={toggleChat}
        focusMode={focusMode} onToggleFocusMode={toggleFocusMode}
        canExport={!!clips?.length} rendering={rendering} renderProgress={progress} onExport={() => rendering ? setExportOpen(true) : void render()}
      />

      {!groqOk && <div className="banner2">GROQ_API_KEY לא מוגדר ב-Vercel. <Link href="/settings">הגדרות</Link></div>}

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

      {focusMode && <div className="chat-focus-shell">
        <section className="chat-focus-preview">
          <div className="chat-focus-stage">
            <VideoPreview ref={previewRef} media={media} clips={clips} tracks={tracks} subs={subs} onTime={setCur}
              selectedSubId={selectedSubId} onSelectSub={selectSub} onEditSub={editSub}
              onCaptionPosition={(position) => {
                if (!editorApiRef.current) return;
                const result = runCommand("caption.setStyle", editorApiRef.current, { position });
                if (!result.ok) setError(result.error);
              }}
              onCopyPosition={quotePlace} audioMuted={audioMuted(tracks)}
              canvas={canvas} overlays={overlays} selectedOverlayId={selectedOverlayId}
              onSelectOverlay={selectOverlay} onBeginOverlay={beginTransaction}
              onOverlayLive={(u) => setOverlaysLive(u)} onCommitOverlay={commitTransaction} onCancelOverlay={cancelTransaction}
              onEditOverlayText={(id, current) => setNameDlg({ kind: "overlayText", id, text: current })}
              onCanvasDetected={onCanvasDetected} captionStyle={captionStyle} />
          </div>
          {(working || phase || error) && <div className="chat-focus-progress"><span className={error ? "err" : ""}>{error || phase}</span>{working && <div><i style={{ width: `${Math.round(progress * 100)}%` }} /></div>}</div>}
        </section>
        <aside className="agent-dock chat-focus-dock">
          <Chat media={media} onAddMedia={addFiles} onClose={toggleFocusMode} words={words} clips={clips} subs={subs}
            script={script} overlays={overlays} canvas={canvas} projectId={projectId} captionStyle={captionStyle}
            editorApi={editorApiRef.current} tracks={tracks} latestExport={exportResult}
            onProject={({ words: w, clips: c, subs: s, overlays: ovs, tracks: tr, viaEditor }) => {
              setWords(w); if (viaEditor) return; setProject(c, s); if (ovs) setOverlays(ovs); if (tr?.length) setTracks(tr);
            }}
            playhead={cur} selectionLabel={agentSelLabel} quoteSink={quoteSink} pendingQuoteRef={pendingQuoteRef}
            mentionSink={mentionSink} pendingMentionRef={pendingMentionRef} />
        </aside>
      </div>}

      {!focusMode && <div className="shell-body">
        {dockSide === "left" && agentDock}
        <ToolRail active={leftTab} onSelect={setLeftTab} />

        <div className="leftpanel" style={{ width: leftW }}>
          {leftTab === "media" ? (
            <MediaPanel media={media} mainId={main?.id} onUpload={addFiles} onAddClip={addMediaClip} onAddOverlay={addImageOverlay} onMention={mentionMedia} onRemove={removeMedia}
              onAssetMenu={(id, x, y) => setAssetMenu({ id, x, y })} />
          ) : leftTab === "text" ? (
            <TextPanel onAddText={addTextOverlay} onAddPopup={addStyledPopup} />
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
            <CreativePanel kind={leftTab} clip={selectedClip} onApply={(patch) => selectedClip && updateClipFromInspector(selectedClip.id, patch)} />
          )}
        </div>
        <div className="col-resize" onMouseDown={startResizeLeft} onDoubleClick={resetLeft} onKeyDown={resizeLeftByKey} tabIndex={0}
          title="גרור לשינוי רוחב · דאבל-קליק לאיפוס" role="separator" aria-orientation="vertical" aria-label="שינוי רוחב פאנל מדיה" />

        <div className="main-area">
          <div className="upper">
            <div className="center-col">
              <VideoPreview ref={previewRef} media={media} clips={clips} tracks={tracks} subs={subs} onTime={setCur}
                selectedSubId={selectedSubId} onSelectSub={selectSub} onEditSub={editSub}
                onCaptionPosition={(position) => {
                  if (!editorApiRef.current) return;
                  const result = runCommand("caption.setStyle", editorApiRef.current, { position });
                  if (!result.ok) setError(result.error);
                }}
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

            <div className="col-resize" onMouseDown={startResizeInsp} onDoubleClick={resetInsp} onKeyDown={resizeInspectorByKey} tabIndex={0}
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
            <div className="tl-resize" onMouseDown={startResizeTL} onDoubleClick={resetTimeline} onKeyDown={resizeTimelineByKey}
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
                onSubMenu={(id, x, y) => setSubMenu({ id, x, y })}
                onTrackMenu={(id, x, y) => setTrackMenu({ id, x, y })}
                onDropMedia={dropMediaOnTimeline}
                onMoveAtTime={moveClipAtTimeline}
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
      </div>}

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
