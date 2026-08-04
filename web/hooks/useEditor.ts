"use client";

// מקור אמת מרכזי לעריכה: clips (רצף וידאו), subs (כתוביות), tracks (מטא-רצועות),
// overlays (שכבות ויזואליות). כל שינוי דרך ה-setters נרשם ל-History. גרירה/טרים/
// מניפולציית-overlay משתמשים ב-transaction כדי שכל מחווה תיצור פעולת Undo *אחת*.
// canvas (מידות הפרויקט) הוא מצב נפרד שאינו נרשם ל-History.

import { useCallback, useRef, useState } from "react";
import { Clip } from "@/lib/editor/model";
import { Overlay } from "@/lib/editor/overlay";
import { Sub } from "@/lib/editor/subtitlesEdl";
import { createHistory } from "@/lib/editor/history";
import { CanvasSize } from "@/lib/editor/canvasCoords";
import { defaultTracks, DEFAULT_CANVAS, TrackMeta } from "@/lib/editor/project";
import { CaptionStyle, DEFAULT_CAPTION_STYLE, normalizeCaptionStyle } from "@/lib/editor/captionStyle";

export interface EditorSnapshot { clips: Clip[] | null; subs: Sub[] | null; tracks: TrackMeta[]; overlays: Overlay[]; }
type Updater<T> = T | ((prev: T) => T);

export function useEditor() {
  const [clips, setClipsRaw] = useState<Clip[] | null>(null);
  const [subs, setSubsRaw] = useState<Sub[] | null>(null);
  const [tracks, setTracksRaw] = useState<TrackMeta[]>(defaultTracks());
  const [overlays, setOverlaysRaw] = useState<Overlay[]>([]);
  const [canvas, setCanvasState] = useState<CanvasSize>({ ...DEFAULT_CANVAS });
  const clipsRef = useRef(clips); clipsRef.current = clips;
  const subsRef = useRef(subs); subsRef.current = subs;
  const tracksRef = useRef(tracks); tracksRef.current = tracks;
  const overlaysRef = useRef(overlays); overlaysRef.current = overlays;
  const hist = useRef(createHistory<EditorSnapshot>());
  const pending = useRef<EditorSnapshot | null>(null);
  const [, force] = useState(0);
  const touch = useCallback(() => force((v) => v + 1), []);

  const now = (): EditorSnapshot => ({ clips: clipsRef.current, subs: subsRef.current, tracks: tracksRef.current, overlays: overlaysRef.current });
  const apply = (s: EditorSnapshot) => { setClipsRaw(s.clips); setSubsRaw(s.subs); setTracksRaw(s.tracks); setOverlaysRaw(s.overlays || []); };

  const commit = useCallback((next: EditorSnapshot) => {
    hist.current.push(now());
    apply(next);
    touch();
  }, [touch]);

  const setClips = useCallback((u: Updater<Clip[] | null>) => {
    const next = typeof u === "function" ? (u as any)(clipsRef.current) : u;
    commit({ ...now(), clips: next });
  }, [commit]);

  const setSubs = useCallback((u: Updater<Sub[] | null>) => {
    const next = typeof u === "function" ? (u as any)(subsRef.current) : u;
    commit({ ...now(), subs: next });
  }, [commit]);

  const setProject = useCallback((c: Clip[] | null, s: Sub[] | null) => {
    commit({ ...now(), clips: c, subs: s });
  }, [commit]);

  const updateClip = useCallback((id: string, patch: Partial<Clip>) => {
    const cur = clipsRef.current;
    if (!cur) return;
    commit({ ...now(), clips: cur.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  }, [commit]);

  // --- overlays (כל שינוי = commit יחיד, ניתן ל-Undo) ---
  const setOverlays = useCallback((u: Updater<Overlay[]>) => {
    const next = typeof u === "function" ? (u as any)(overlaysRef.current) : u;
    commit({ ...now(), overlays: next });
  }, [commit]);
  const addOverlay = useCallback((o: Overlay) => { commit({ ...now(), overlays: [...overlaysRef.current, o] }); }, [commit]);
  const updateOverlay = useCallback((id: string, patch: Partial<Overlay>) => {
    commit({ ...now(), overlays: overlaysRef.current.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
  }, [commit]);
  const removeOverlay = useCallback((id: string) => { commit({ ...now(), overlays: overlaysRef.current.filter((o) => o.id !== id) }); }, [commit]);
  // עדכון חי בזמן גרירה/שינוי-גודל (ללא History; commitTransaction סוגר ל-Undo אחד)
  const setOverlaysLive = useCallback((u: Updater<Overlay[]>) => {
    const next = typeof u === "function" ? (u as any)(overlaysRef.current) : u;
    setOverlaysRaw(next);
  }, []);

  // --- רצועות ---
  const patchTrack = useCallback((id: string, patch: Partial<TrackMeta>) => {
    commit({ ...now(), tracks: tracksRef.current.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  }, [commit]);
  const renameTrack = useCallback((id: string, name: string) => patchTrack(id, { name }), [patchTrack]);
  const setTrackHeight = useCallback((id: string, height: number) => patchTrack(id, { height: Math.max(28, Math.min(140, height)) }), [patchTrack]);
  const toggleLock = useCallback((id: string) => { const t = tracksRef.current.find((x) => x.id === id); if (t) patchTrack(id, { locked: !t.locked }); }, [patchTrack]);
  const toggleMute = useCallback((id: string) => { const t = tracksRef.current.find((x) => x.id === id); if (t) patchTrack(id, { muted: !t.muted }); }, [patchTrack]);
  const reorderTrack = useCallback((id: string, dir: -1 | 1) => {
    const list = [...tracksRef.current].sort((a, b) => a.order - b.order);
    const i = list.findIndex((t) => t.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    const a = list[i], b = list[j];
    commit({ ...now(), tracks: tracksRef.current.map((t) => (t.id === a.id ? { ...t, order: b.order } : t.id === b.id ? { ...t, order: a.order } : t)) });
  }, [commit]);

  // --- transaction לגרירה/מניפולציה (Undo אחד לכל המחווה) ---
  const beginTransaction = useCallback(() => { if (!pending.current) pending.current = now(); }, []);
  const setClipsLive = useCallback((u: Updater<Clip[] | null>) => {
    const next = typeof u === "function" ? (u as any)(clipsRef.current) : u;
    setClipsRaw(next);
  }, []);
  const commitTransaction = useCallback(() => {
    if (pending.current) { hist.current.push(pending.current); pending.current = null; touch(); }
  }, [touch]);
  const cancelTransaction = useCallback(() => { pending.current = null; }, []);

  const setCanvas = useCallback((c: CanvasSize) => { setCanvasState(c); }, []);
  const [captionStyle, setCaptionStyleState] = useState<CaptionStyle>({ ...DEFAULT_CAPTION_STYLE });
  const setCaptionStyle = useCallback((u: Updater<CaptionStyle>) => {
    setCaptionStyleState((prev) => typeof u === "function" ? (u as (p: CaptionStyle) => CaptionStyle)(prev) : u);
  }, []);

  const reset = useCallback((s: EditorSnapshot & { canvas?: CanvasSize; captionStyle?: CaptionStyle }) => {
    hist.current.reset(); pending.current = null;
    apply({ clips: s.clips, subs: s.subs, tracks: s.tracks?.length ? s.tracks : defaultTracks(), overlays: s.overlays || [] });
    if (s.canvas) setCanvasState(s.canvas);
    setCaptionStyleState(normalizeCaptionStyle(s.captionStyle));
    touch();
  }, [touch]);

  const undo = useCallback(() => { const p = hist.current.undo(now()); if (p) { apply(p); touch(); } }, [touch]);
  const redo = useCallback(() => { const n = hist.current.redo(now()); if (n) { apply(n); touch(); } }, [touch]);

  return {
    clips, subs, tracks, overlays, canvas, captionStyle,
    setClips, setSubs, setProject, updateClip,
    setOverlays, addOverlay, updateOverlay, removeOverlay, setOverlaysLive, setCanvas, setCaptionStyle,
    renameTrack, setTrackHeight, toggleLock, toggleMute, reorderTrack,
    beginTransaction, setClipsLive, commitTransaction, cancelTransaction,
    reset, undo, redo,
    canUndo: hist.current.canUndo(), canRedo: hist.current.canRedo(),
  };
}
