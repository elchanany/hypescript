"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Clip, MediaAsset, assembledStart, clipDur, clipEnabled, clipOpacity, mediaById, totalDur } from "@/lib/editor/model";
import { Sub } from "@/lib/editor/subtitlesEdl";
import { Overlay } from "@/lib/editor/overlay";
import { audioTrack, primaryVideoTrackId, sortedTracks, TrackMeta, videoTrack } from "@/lib/editor/project";
import { clipTrackId, clipsOnTrack } from "@/lib/editor/tracks";
import { isGapClip } from "@/lib/editor/timelineOps";
import { formatTimecode, MagneticTarget, snapRangeStart, snapToMagneticTarget } from "@/lib/editor/time";
import { nextZoom, scrollLeftAfterZoom, timelineContentWidth, TIMELINE_GUTTER } from "@/lib/editor/zoom";
import { MEDIA_DRAG_MIME } from "@/lib/editor/mediaDrag";
import { Film, AudioLines, Captions, Layers, Lock, Unlock, Volume2, VolumeX, ChevronUp, ChevronDown, ChevronsUpDown, Plus } from "@/components/icons";
import { IconButton } from "@/components/ui";
import Filmstrip from "@/components/Filmstrip";
import Waveform from "@/components/Waveform";

interface Props {
  media: MediaAsset[];
  clips: Clip[];
  subs?: Sub[] | null;
  overlays?: Overlay[];
  tracks: TrackMeta[];
  maxDuration: number;
  currentAssembled: number;
  selectedId: string | null;
  selectedOverlayId?: string | null;
  selectedSubId?: string | null;
  /** Which track the clip selection came from — drives inspector title. */
  selectionTrack?: "video" | "audio" | null;
  /** כשמקושר — בחירה/חיתוך משותפים לווידאו ואודיו; לחיצה משחררת */
  avLinked?: boolean;
  zoom: number;
  onZoom: (z: number) => void;
  snap: boolean;
  onSeek: (assembled: number) => void;
  onSelect: (id: string | null, track?: "video" | "audio") => void;
  onSelectOverlay?: (id: string | null) => void;
  onSelectSub?: (id: string | null) => void;
  onTrimBegin: () => void;
  onTrim: (id: string, start: number, end: number) => void;
  onTrimEnd: () => void;
  onReorder: (id: string, toIndex: number) => void;
  onClipMenu: (id: string, x: number, y: number) => void;
  onSubMenu?: (id: string, x: number, y: number) => void;
  onTrackMenu?: (id: string, x: number, y: number) => void;
  /** גרירה מספריית מדיה — assetId + אינדקס הכנסה (+ רצועת יעד) */
  onDropMedia?: (assetId: string, atIndex: number, trackId?: string, timelineStart?: number) => void;
  /** Magnetic move, including crossing compatible tracks at an exact assembled time. */
  onMoveAtTime?: (id: string, trackId: string, timelineStart: number) => void;
  onAddVideoTrack?: () => void;
  onOverlayTrimBegin?: () => void;
  onOverlayTrim?: (id: string, start: number, end: number) => void;
  onOverlayTrimEnd?: () => void;
  onOverlayMove?: (id: string, start: number, end: number) => void;
  renameTrack: (id: string, name: string) => void;
  onRequestRenameTrack?: (id: string, name: string) => void;
  toggleLock: (id: string) => void;
  toggleMute: (id: string) => void;
  cycleHeight: (id: string) => void;
  reorderTrack: (id: string, dir: -1 | 1) => void;
}

// Muted, desaturated clip tones — color carries source identity, nothing more.
const SOURCE_COLORS = ["#3f5f8f", "#5b4d8a", "#8a4d68", "#8a6a3f", "#3f7d72", "#6f7a3f"];
const TYPE_ICON = { video: Film, audio: AudioLines, caption: Captions } as const;

export default function Timeline(p: Props) {
  const { media, clips, subs, overlays = [], tracks, currentAssembled, selectedId, selectedOverlayId, selectedSubId, selectionTrack, avLinked = true, zoom, snap } = p;
  const audioId = audioTrack(tracks)?.id || "trk_audio";
  const scrollRef = useRef<HTMLDivElement>(null);
  const laneRef = useRef<HTMLDivElement>(null);
  const overlayLaneRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const dropLaneRef = useRef<{ trackId: string; el: HTMLElement } | null>(null);
  const snapGuideRef = useRef<HTMLDivElement>(null);
  const snapLabelRef = useRef<HTMLSpanElement>(null);
  const dragMetaRef = useRef<HTMLSpanElement>(null);
  const pendingScroll = useRef<number | null>(null);
  const zoomAcc = useRef(0);
  const zoomRaf = useRef(0);
  const [dragLabel, setDragLabel] = useState<{
    name: string;
    dur: number;
    kind: "video" | "image" | "audio" | "overlay" | "gap";
    thumbUrl?: string | null;
  } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredSubId, setHoveredSubId] = useState<string | null>(null);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const drag = useRef<{
    kind: "clip" | "overlay";
    mode: "move" | "l" | "r";
    id: string;
    x0: number;
    laneW: number;
    s0: number;
    e0: number;
    moved: boolean;
    px: number;
    /** Assembled-time start of the clip being trimmed (for edge snap). */
    assembled0?: number;
    sourceTrackId?: string;
    targetTrackId?: string;
    trackType?: "video" | "audio";
    timelineStart?: number;
    snapped?: boolean;
  } | null>(null);

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const onZoomRef = useRef(p.onZoom);
  onZoomRef.current = p.onZoom;

  // apply scroll before paint — מונע קפיצת playhead אחרי זום
  useLayoutEffect(() => {
    if (pendingScroll.current == null || !scrollRef.current) return;
    scrollRef.current.scrollLeft = pendingScroll.current;
    pendingScroll.current = null;
  }, [zoom]);

  // רוחב יציב לפי viewport של הגלילה — מונע התרחבות פריסה בזום גבוה
  const [portW, setPortW] = useState(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const sync = () => setPortW(el.clientWidth);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // wheel: pinch/Ctrl = זום (מצטבר ל-rAF, עוגן לשמאל); שתי אצבעות לצד / Shift = גלילה
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const flushZoom = () => {
      zoomRaf.current = 0;
      const delta = zoomAcc.current;
      zoomAcc.current = 0;
      if (delta === 0) return;
      const z = zoomRef.current;
      const port = el.clientWidth;
      const next = nextZoom(z, delta, true, port);
      if (Math.abs(next - z) < 1e-4) return;
      pendingScroll.current = scrollLeftAfterZoom({
        oldZoom: z,
        newZoom: next,
        scrollLeft: el.scrollLeft,
        portWidth: port,
        gutter: TIMELINE_GUTTER,
      });
      zoomRef.current = next;
      onZoomRef.current(next);
    };
    const onWheel = (e: WheelEvent) => {
      const pinch = e.ctrlKey || e.metaKey;
      if (pinch) {
        e.preventDefault();
        zoomAcc.current += e.deltaY;
        if (!zoomRaf.current) zoomRaf.current = requestAnimationFrame(flushZoom);
        return;
      }
      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);
      if (e.shiftKey) {
        el.scrollLeft += absY > 0 ? e.deltaY : e.deltaX;
        e.preventDefault();
        return;
      }
      if (absX > absY && absX > 0.5) {
        el.scrollLeft += e.deltaX;
        e.preventDefault();
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (zoomRaf.current) cancelAnimationFrame(zoomRaf.current);
    };
  }, []);

  const colorOf = (sourceId: string) => SOURCE_COLORS[Math.max(0, media.findIndex((m) => m.id === sourceId)) % SOURCE_COLORS.length];
  const total = Math.max(0.001, p.maxDuration || totalDur(clips));
  const pct = (t: number) => (t / total) * 100;
  const ordered = sortedTracks(tracks);
  const primaryId = primaryVideoTrackId(tracks);
  const vTrack = videoTrack(tracks);
  const vLocked = !!vTrack?.locked;
  const clipsOf = (trackId: string) => clipsOnTrack(clips, trackId, primaryId);
  const primaryClips = clipsOf(primaryId);
  const overlayRows: Array<Overlay | null> = overlays.length ? [...overlays].sort((a, b) => b.start - a.start) : [null];

  // Each track owns its own assembled clock. The old global accumulator shifted
  // edges after the first track and made cross-layer snapping visually dishonest.
  const snapTargets = useMemo<MagneticTarget[]>(() => {
    const points: MagneticTarget[] = [
      { time: 0, label: "תחילת הציר", kind: "timeline", priority: 3 },
      { time: total, label: "סוף הציר", kind: "timeline", priority: 3 },
      { time: currentAssembled, label: "ראש הנגן", kind: "playhead", priority: 1 },
    ];
    const primary = primaryVideoTrackId(tracks);
    for (const track of sortedTracks(tracks).filter((item) => item.type === "video" || item.type === "audio")) {
      let cursor = 0;
      for (const clip of clipsOnTrack(clips, track.id, primary)) {
        points.push({ time: cursor, label: `${track.name} · התחלה`, kind: "clip", priority: 5 });
        cursor += clipDur(clip);
        points.push({ time: cursor, label: `${track.name} · סוף`, kind: "clip", priority: 5 });
      }
    }
    for (const overlay of overlays) {
      points.push({ time: overlay.start, label: "שכבה · התחלה", kind: "overlay", priority: 4 });
      points.push({ time: overlay.end, label: "שכבה · סוף", kind: "overlay", priority: 4 });
    }
    for (const cue of (subs || [])) {
      points.push({ time: cue.start, label: "כתובית · התחלה", kind: "caption", priority: 2 });
      points.push({ time: cue.end, label: "כתובית · סוף", kind: "caption", priority: 2 });
    }
    return points;
  }, [clips, tracks, overlays, subs, total, currentAssembled]);

  const snapTol = () => {
    // ~10px at current zoom → time, with floor/ceiling so it stays usable
    const laneW = laneRef.current?.clientWidth || overlayLaneRef.current?.clientWidth || portW || 800;
    const pxTol = 10;
    return Math.max(0.04, Math.min(0.35, (pxTol / Math.max(1, laneW)) * total));
  };

  const applySnap = (t: number, exclude?: number[], bypass = false) => {
    if (!snap || bypass) return { time: t, snapped: false as boolean, target: null as number | null, match: null, distance: Infinity };
    const skip = new Set((exclude || []).map((x) => +x.toFixed(4)));
    const targets = snapTargets.filter((target) => !skip.has(+target.time.toFixed(4)));
    return snapToMagneticTarget(t, targets, snapTol());
  };

  const showSnapGuide = (t: number | null, hint = "", magnetic = true) => {
    const g = snapGuideRef.current;
    if (!g) return;
    if (t == null) { g.style.display = "none"; return; }
    g.style.display = "block";
    g.classList.toggle("free", !magnetic);
    const fraction = Math.max(0, Math.min(1, t / total));
    g.classList.toggle("near-end", fraction > 0.78);
    g.style.left = `calc(${TIMELINE_GUTTER}px + (100% - ${TIMELINE_GUTTER}px) * ${fraction})`;
    if (snapLabelRef.current) snapLabelRef.current.textContent = hint || formatTimecode(t);
  };

  const ticks = useMemo(() => {
    const target = 6 + Math.min(48, Math.max(2, zoom * 3));
    const raw = total / target;
    const steps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1200, 3600];
    const step = steps.find((s) => s >= raw) || steps[steps.length - 1];
    const out: number[] = [];
    for (let t = 0; t <= total + 0.001; t += step) out.push(Number(t.toFixed(3)));
    return { out, step };
  }, [total, zoom]);
  const fmt = (t: number) => {
    if (ticks.step < 1) return `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
    return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  };

  // target insertion index for a pointer x over a track's clip list
  const dropTarget = (clientX: number, list: Clip[] = primaryClips, laneEl?: HTMLElement | null): { index: number; boundary: number } => {
    const el = laneEl || dropLaneRef.current?.el || laneRef.current;
    if (!el) return { index: list.length, boundary: totalDur(list) };
    const rect = el.getBoundingClientRect();
    const t = ((clientX - rect.left) / Math.max(1, rect.width)) * total;
    let acc = 0, index = list.length;
    for (let i = 0; i < list.length; i++) {
      const mid = acc + clipDur(list[i]) / 2;
      if (t < mid) { index = i; break; }
      acc += clipDur(list[i]);
    }
    return { index, boundary: assembledStart(list, index) };
  };

  const selectClip = (id: string, track: "video" | "audio" = "video") => {
    p.onSelectSub?.(null);
    p.onSelect(id, track);
  };

  const onDown = (e: React.MouseEvent, clip: Clip, mode: "move" | "l" | "r", track: "video" | "audio" = "video", trackId?: string) => {
    const locked = trackId ? !!tracks.find((t) => t.id === trackId)?.locked : vLocked;
    if (locked) return;
    e.stopPropagation();
    const sourceTrackId = clipTrackId(clip, primaryId);
    const list = clipsOf(sourceTrackId);
    const idx = list.findIndex((c) => c.id === clip.id);
    const assembled0 = idx >= 0 ? assembledStart(list, idx) : 0;
    dropLaneRef.current = trackId && e.currentTarget.parentElement
      ? { trackId, el: e.currentTarget.parentElement as HTMLElement }
      : dropLaneRef.current;
    drag.current = {
      kind: "clip", mode, id: clip.id, x0: e.clientX,
      laneW: laneRef.current?.clientWidth || 1,
      s0: clip.start, e0: clip.end, moved: false, px: e.clientX, assembled0,
      sourceTrackId, targetTrackId: sourceTrackId,
      trackType: mediaById(media, clip.sourceId)?.kind === "audio" ? "audio" : "video",
    };
    selectClip(clip.id, track);
    if (mode === "move") {
      const a = mediaById(media, clip.sourceId);
      const gap = isGapClip(clip);
      const name = gap ? "רווח" : ((a?.name || "").replace(/\.[^.]+$/, "") || "קטע");
      const kind = gap ? "gap" as const : (a?.kind || "video");
      setDragLabel({
        name,
        dur: clipDur(clip),
        kind,
        thumbUrl: a?.kind === "image" ? a.url : null,
      });
      if (a?.kind === "video") {
        void import("@/lib/media/thumbnails").then(({ getThumbnail }) =>
          getThumbnail(a.file, Math.min(a.duration * 0.1, Math.max(0, clip.start + 0.2)), 90)
            .then((u) => setDragLabel((prev) => (prev && prev.name === name ? { ...prev, thumbUrl: u } : prev)))
            .catch(() => {}),
        );
      }
    }
    if (mode === "l" || mode === "r") p.onTrimBegin();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  const onOverlayDown = (e: React.MouseEvent, overlay: Overlay, mode: "move" | "l" | "r") => {
    e.stopPropagation();
    p.onSelectSub?.(null);
    p.onSelectOverlay?.(overlay.id);
    p.onOverlayTrimBegin?.();
    drag.current = {
      kind: "overlay",
      mode,
      id: overlay.id,
      x0: e.clientX,
      laneW: overlayLaneRef.current?.clientWidth || 1,
      s0: overlay.start,
      e0: overlay.end,
      moved: false,
      px: e.clientX,
    };
    if (mode === "move") {
      const asset = overlay.assetId ? mediaById(media, overlay.assetId) : undefined;
      const name = overlay.kind === "text"
        ? (overlay.text || "טקסט")
        : ((asset?.name || "").replace(/\.[^.]+$/, "") || "תמונה");
      setDragLabel({
        name,
        dur: Math.max(0.05, overlay.end - overlay.start),
        kind: overlay.kind === "image" ? "image" : "overlay",
        thumbUrl: asset?.kind === "image" ? asset.url : null,
      });
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  const onMove = (e: MouseEvent) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.x0; d.px = e.clientX;
    if (Math.abs(dx) > 3) d.moved = true;
    const dt = (dx / d.laneW) * total;
    if (d.kind === "overlay") {
      if (d.mode === "l") {
        const raw = d.s0 + dt;
        const { time, snapped, target, match } = applySnap(raw, [d.e0], e.altKey);
        showSnapGuide(snapped ? target : null, target != null ? `${formatTimecode(target)} · ${match?.label || "קצה"}` : "");
        p.onOverlayTrim?.(d.id, Math.min(time, d.e0 - 0.05), d.e0);
      } else if (d.mode === "r") {
        const raw = d.e0 + dt;
        const { time, snapped, target, match } = applySnap(raw, [d.s0], e.altKey);
        showSnapGuide(snapped ? target : null, target != null ? `${formatTimecode(target)} · ${match?.label || "קצה"}` : "");
        p.onOverlayTrim?.(d.id, d.s0, Math.max(time, d.s0 + 0.05));
      } else if (d.moved) {
        const dur = d.e0 - d.s0;
        const rawStart = d.s0 + dt;
        // Prefer snap of either edge (start or end) like CapCut
        const sSnap = applySnap(rawStart, []);
        const eSnap = applySnap(rawStart + dur, []);
        let start = rawStart;
        let guide: number | null = null;
        if (sSnap.snapped && eSnap.snapped) {
          if (Math.abs(sSnap.time - rawStart) <= Math.abs(eSnap.time - (rawStart + dur))) {
            start = sSnap.time; guide = sSnap.target;
          } else {
            start = eSnap.time - dur; guide = eSnap.target;
          }
        } else if (sSnap.snapped) { start = sSnap.time; guide = sSnap.target; }
        else if (eSnap.snapped) { start = eSnap.time - dur; guide = eSnap.target; }
        const match = guide == null ? null : (sSnap.target === guide ? sSnap.match : eSnap.match);
        showSnapGuide(guide, guide != null ? `${formatTimecode(guide)} · ${match?.label || "קצה"}` : "");
        p.onOverlayMove?.(d.id, start, start + dur);
        const g = ghostRef.current;
        if (g) {
          g.style.display = "flex";
          g.style.left = `${e.clientX + 12}px`;
          g.style.top = `${e.clientY + 14}px`;
        }
      }
      return;
    }
    if (d.mode === "l" || d.mode === "r") {
      // Snap the assembled-time edge being dragged to neighboring clip/overlay/sub edges.
      const a0 = d.assembled0 ?? 0;
      const dur0 = d.e0 - d.s0;
      if (d.mode === "l") {
        const rawAssembled = a0 + dt;
        const { time: snappedA, snapped, target, match } = applySnap(rawAssembled, [a0 + dur0], e.altKey);
        showSnapGuide(snapped ? target : null, target != null ? `${formatTimecode(target)} · ${match?.label || "קצה"}` : "");
        const deltaAssembled = snappedA - a0;
        p.onTrim(d.id, d.s0 + deltaAssembled, d.e0);
      } else {
        const rawAssembled = a0 + dur0 + dt;
        const { time: snappedA, snapped, target, match } = applySnap(rawAssembled, [a0], e.altKey);
        showSnapGuide(snapped ? target : null, target != null ? `${formatTimecode(target)} · ${match?.label || "קצה"}` : "");
        const newDur = snappedA - a0;
        p.onTrim(d.id, d.s0, d.s0 + newDur);
      }
    } else if (d.mode === "move" && d.moved) {
      // Follow the pointer across compatible tracks and magnetize either clip edge.
      const g = ghostRef.current;
      if (g) { g.style.display = "flex"; g.style.left = `${e.clientX + 12}px`; g.style.top = `${e.clientY + 14}px`; }
      const hoveredLane = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-track-lane]");
      const laneType = hoveredLane?.dataset.trackType;
      if (hoveredLane && laneType === d.trackType) {
        dropLaneRef.current?.el.classList.remove("magnetic-target");
        const targetTrackId = hoveredLane.dataset.trackLane || d.sourceTrackId || primaryId;
        dropLaneRef.current = { trackId: targetTrackId, el: hoveredLane };
        hoveredLane.classList.add("magnetic-target");
        d.targetTrackId = targetTrackId;
      }
      const rawStart = Math.max(0, (d.assembled0 || 0) + dt);
      const excluded = new Set([d.assembled0 || 0, (d.assembled0 || 0) + clipDur({ id: d.id, sourceId: "", start: d.s0, end: d.e0 })].map((value) => +value.toFixed(4)));
      const candidates = snapTargets.filter((target) => !excluded.has(+target.time.toFixed(4)));
      const rangeHit = (!snap || e.altKey)
        ? { start: rawStart, snapped: false, target: null, match: null, edge: null }
        : snapRangeStart(rawStart, d.e0 - d.s0, candidates, snapTol());
      d.timelineStart = Math.max(0, rangeHit.start);
      d.snapped = rangeHit.snapped;
      showSnapGuide(
        rangeHit.snapped ? rangeHit.target : d.timelineStart,
        rangeHit.snapped && rangeHit.target != null
          ? `${formatTimecode(rangeHit.target)} · ${rangeHit.match?.label || "קצה"} · ${rangeHit.edge === "end" ? "סוף הקטע" : "תחילת הקטע"}`
          : `${formatTimecode(d.timelineStart)} · Alt מבטל מגנט`,
        rangeHit.snapped,
      );
      if (dragMetaRef.current) {
        const targetName = tracks.find((item) => item.id === d.targetTrackId)?.name || "רצועה";
        dragMetaRef.current.textContent = `${rangeHit.snapped ? "🧲 " : ""}${targetName} · ${formatTimecode(d.timelineStart)}`;
      }
      const drop = dropRef.current;
      if (drop && laneRef.current) {
        drop.style.display = "block";
        drop.style.left = `${pct(d.timelineStart)}%`;
      }
    }
  };
  const endDragVisuals = () => {
    if (ghostRef.current) ghostRef.current.style.display = "none";
    if (dropRef.current) dropRef.current.style.display = "none";
    showSnapGuide(null);
    dropLaneRef.current?.el.classList.remove("magnetic-target");
    setDragLabel(null);
  };

  const hasMediaDrag = (dt: DataTransfer) =>
    Array.from(dt.types || []).includes(MEDIA_DRAG_MIME);

  const pointerTime = (clientX: number, lane: HTMLElement) => {
    const rect = lane.getBoundingClientRect();
    return Math.max(0, Math.min(total, ((clientX - rect.left) / Math.max(1, rect.width)) * total));
  };

  const showMediaDropAt = (clientX: number, lane: HTMLElement, bypass = false) => {
    const drop = dropRef.current;
    const raw = pointerTime(clientX, lane);
    const hit = applySnap(raw, [], bypass);
    const time = hit.snapped ? hit.time : raw;
    if (drop) { drop.style.display = "block"; drop.style.left = `${pct(time)}%`; }
    showSnapGuide(time, hit.snapped ? `${formatTimecode(time)} · ${hit.match?.label || "קצה"}` : `${formatTimecode(time)} · מיקום חופשי`, hit.snapped);
    return time;
  };

  const onLaneDragOver = (e: React.DragEvent, trackId: string) => {
    if (!hasMediaDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    e.currentTarget.classList.add("drop-target");
    dropLaneRef.current = { trackId, el: e.currentTarget as HTMLElement };
    showMediaDropAt(e.clientX, e.currentTarget as HTMLElement, e.altKey);
  };
  const onLaneDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("drop-target");
    if (dropRef.current) dropRef.current.style.display = "none";
    showSnapGuide(null);
  };
  const onLaneDrop = (e: React.DragEvent, trackId?: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drop-target");
    if (dropRef.current) dropRef.current.style.display = "none";
    const id = e.dataTransfer.getData(MEDIA_DRAG_MIME);
    if (!id || !p.onDropMedia) return;
    const tid = trackId || primaryId;
    const list = clipsOf(tid);
    const { index } = dropTarget(e.clientX, list, e.currentTarget as HTMLElement);
    const timelineStart = showMediaDropAt(e.clientX, e.currentTarget as HTMLElement, e.altKey);
    p.onDropMedia(id, index, tid, timelineStart);
    endDragVisuals();
  };
  const onUp = () => {
    const d = drag.current;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    endDragVisuals();
    if (!d) { drag.current = null; return; }
    if (d.kind === "overlay") p.onOverlayTrimEnd?.();
    else if (d.mode === "l" || d.mode === "r") p.onTrimEnd();
    else if (d.mode === "move") {
      if (!d.moved) { /* already selected on mousedown */ }
      else {
        const clip = clips.find((c) => c.id === d.id);
        const tid = clip ? clipTrackId(clip, primaryId) : primaryId;
        const list = clipsOf(tid);
        if (d.targetTrackId && d.timelineStart != null && p.onMoveAtTime && (d.targetTrackId !== d.sourceTrackId || d.snapped)) {
          p.onMoveAtTime(d.id, d.targetTrackId, d.timelineStart);
          drag.current = null;
          return;
        }
        let { index, boundary } = dropTarget(d.px, list);
        if (snap) {
          const { snapped, target } = applySnap(boundary);
          if (snapped && target != null) {
            for (let i = 0; i <= list.length; i++) {
              if (Math.abs(assembledStart(list, i) - target) < 1e-4) { index = i; break; }
            }
          }
        }
        p.onReorder(d.id, index);
      }
    }
    drag.current = null;
  };

  const seekFromRow = (e: React.MouseEvent, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const raw = Math.max(0, Math.min(total, ((e.clientX - rect.left) / rect.width) * total));
    const { time } = applySnap(raw);
    p.onSeek(time);
  };

  const [phDrag, setPhDrag] = useState(false);
  const seekFromClientX = (clientX: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const raw = Math.max(0, Math.min(total, ((clientX - rect.left) / rect.width) * total));
    const { time } = applySnap(raw);
    p.onSeek(time);
  };
  const onPlayheadDown = (e: React.MouseEvent, laneEl: HTMLElement) => {
    e.preventDefault();
    e.stopPropagation();
    setPhDrag(true);
    seekFromClientX(e.clientX, laneEl);
    const onMove = (ev: MouseEvent) => seekFromClientX(ev.clientX, laneEl);
    const onUp = () => {
      setPhDrag(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  const Playhead = ({ laneEl }: { laneEl?: HTMLElement | null }) => (
    <div
      className={`playhead2 ${phDrag ? "dragging" : ""}`}
      style={{ left: `${pct(currentAssembled)}%` }}
      title="גרור לניווט בציר"
      onMouseDown={(e) => {
        const el = laneEl || (e.currentTarget.parentElement as HTMLElement);
        if (el) onPlayheadDown(e, el);
      }}
    />
  );
  const Grid = () => (<>{ticks.out.map((t) => <div key={t} className="tl-gridline" style={{ left: `${pct(t)}%` }} />)}</>);

  const videoSel = (id: string) => selectedId === id && (avLinked || selectionTrack !== "audio");
  const audioSel = (id: string) => selectedId === id && (avLinked || selectionTrack === "audio");
  const clipHover = (id: string) => hoveredId === id;

  return (
    <div className="tl-scroll" ref={scrollRef} title="שתי אצבעות לצד = גלילה · Pinch/Ctrl+גלגלת = זום">
      <div className="tl-ghost" ref={ghostRef}>
        <div className={`g-preview ${dragLabel?.kind === "audio" ? "audio" : ""} ${!dragLabel?.thumbUrl && dragLabel?.kind !== "audio" ? "glyph" : ""}`}>
          {dragLabel?.thumbUrl ? (
            <img src={dragLabel.thumbUrl} alt="" draggable={false} />
          ) : dragLabel?.kind === "audio" ? (
            Array.from({ length: 10 }, (_, i) => (
              <i key={i} style={{ height: `${35 + ((i * 19) % 50)}%` }} />
            ))
          ) : (
            <span>{dragLabel?.kind === "gap" ? "▭" : dragLabel?.kind === "overlay" ? "Aa" : "🎬"}</span>
          )}
        </div>
        <div className="g-meta">
          <span className="g-name">{dragLabel?.name}</span>
          <span className="g-dur" ref={dragMetaRef}>{dragLabel ? `${dragLabel.dur.toFixed(1)}s` : ""}</span>
        </div>
      </div>
      <div
        className="tl-inner"
        style={{ width: portW > 0 ? timelineContentWidth(portW, zoom) : `${Math.max(0.05, zoom) * 100}%` }}
      >
        {/* CapCut-style snap guide — full height across all tracks */}
        <div className="tl-snap-guide" ref={snapGuideRef}><span ref={snapLabelRef} /></div>

        {/* ruler */}
        <div className="tl-rowline tl-rulerline">
          <div className="tl-corner2" />
          <div className="tl-ruler2" onClick={(e) => seekFromRow(e, e.currentTarget)}>
            {ticks.out.map((t) => (
              <div key={t} className="tl-tick2" style={{ left: `${pct(t)}%` }}><span>{fmt(t)}</span></div>
            ))}
            <Playhead laneEl={null} />
          </div>
        </div>

        {ordered.map((track) => {
          const TypeIcon = TYPE_ICON[track.type];
          const dedicatedAudio = clipsOf(audioId);
          const tClips = track.type === "video" ? clipsOf(track.id) : track.type === "audio" && dedicatedAudio.length ? dedicatedAudio : primaryClips;
          const tLocked = !!track.locked;
          return (
            <div className={`tl-rowline ${track.type === "caption" ? `caption-row ${captionExpanded ? "expanded" : "collapsed"}` : ""}`} key={track.id} style={{ height: track.type === "caption" ? (captionExpanded ? Math.max(64, track.height) : 30) : track.height }}>
              <div className="tl-head2" onClick={() => { if (track.type === "caption") setCaptionExpanded((value) => !value); }} onContextMenu={(event) => { event.preventDefault(); p.onTrackMenu?.(track.id, event.clientX, event.clientY); }} aria-expanded={track.type === "caption" ? captionExpanded : undefined}>
                <div className="hd-top">
                  <TypeIcon className="hd-type" size={14} strokeWidth={1.75} />
                  <span className="hd-name" title="לחיצה כפולה לשינוי שם"
                    onDoubleClick={() => p.onRequestRenameTrack?.(track.id, track.name)}>
                    {track.name}
                  </span>
                </div>
                {/* Fixed 5-slot grid so mute on audio doesn't shift other icons */}
                <div className="hd-ctrls" dir="ltr">
                  <IconButton icon={track.locked ? Lock : Unlock} tip={track.locked ? "שחרר נעילה" : "נעל"} tipPos="up"
                    active={track.locked} onClick={() => p.toggleLock(track.id)} />
                  {track.type === "audio" ? (
                    <IconButton icon={track.muted ? VolumeX : Volume2} tip={track.muted ? "בטל השתקה" : "השתק"} tipPos="up"
                      active={track.muted} onClick={() => p.toggleMute(track.id)} />
                  ) : track.type === "video" && p.onAddVideoTrack ? (
                    <IconButton icon={Plus} tip="הוסף רצועת וידאו" tipPos="up" onClick={() => p.onAddVideoTrack?.()} />
                  ) : (
                    <span className="hd-slot" aria-hidden />
                  )}
                  <IconButton icon={ChevronsUpDown} tip="גובה רצועה" tipPos="up" onClick={() => p.cycleHeight(track.id)} />
                  <IconButton icon={ChevronDown} tip="העבר למטה" tipPos="up" onClick={() => p.reorderTrack(track.id, 1)} />
                  <IconButton icon={ChevronUp} tip="העבר למעלה" tipPos="up" onClick={() => p.reorderTrack(track.id, -1)} />
                </div>
              </div>

              {track.type === "video" && (
                <div className="tl-lane2" ref={track.id === primaryId ? laneRef : undefined}
                  data-track-lane={track.id} data-track-type="video"
                  onClick={(e) => { if (!drag.current) { p.onSelect(null); p.onSelectSub?.(null); seekFromRow(e, e.currentTarget); } }}
                  onDragOver={(e) => onLaneDragOver(e, track.id)}
                  onDragLeave={onLaneDragLeave}
                  onDrop={(e) => onLaneDrop(e, track.id)}>
                  <Grid />
                  {tClips.map((c, i) => {
                    const gap = isGapClip(c);
                    if (gap) {
                      return (
                        <div key={c.id}
                          className={`clip-gap ${videoSel(c.id) ? "selected" : ""} ${hoveredId === c.id ? "hovered" : ""} ${tLocked ? "locked" : ""}`}
                          style={{ left: `${pct(assembledStart(tClips, i))}%`, width: `${pct(clipDur(c))}%` }}
                          onMouseDown={(e) => onDown(e, c, "move", "video", track.id)}
                          onClick={(e) => e.stopPropagation()}
                          onMouseEnter={() => setHoveredId(c.id)}
                          onMouseLeave={() => setHoveredId((h) => (h === c.id ? null : h))}
                          onContextMenu={(e) => { e.preventDefault(); selectClip(c.id, "video"); p.onClipMenu(c.id, e.clientX, e.clientY); }}
                          title={`רווח · ${clipDur(c).toFixed(1)}s`}>
                          {!tLocked && <span className="trim l" onMouseDown={(e) => onDown(e, c, "l", "video", track.id)} />}
                          <span className="clip-label"><span>רווח</span><span className="cl-dur">{clipDur(c).toFixed(1)}s</span></span>
                          {!tLocked && <span className="trim r" onMouseDown={(e) => onDown(e, c, "r", "video", track.id)} />}
                        </div>
                      );
                    }
                    const asset = mediaById(media, c.sourceId);
                    const short = (asset?.name || "").replace(/\.[^.]+$/, "");
                    const thumbH = Math.max(28, track.height - 8);
                    return (
                      <div key={c.id}
                        className={`clip2 ${videoSel(c.id) ? "selected" : ""} ${hoveredId === c.id ? "hovered" : ""} ${clipEnabled(c) ? "" : "disabled"} ${tLocked ? "locked" : ""} ${!asset || asset.missing ? "missing" : ""}`}
                        style={{ left: `${pct(assembledStart(tClips, i))}%`, width: `${pct(clipDur(c))}%`, opacity: clipOpacity(c) }}
                        onMouseDown={(e) => onDown(e, c, "move", "video", track.id)}
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={() => setHoveredId(c.id)}
                        onMouseLeave={() => setHoveredId((h) => (h === c.id ? null : h))}
                        onContextMenu={(e) => { e.preventDefault(); selectClip(c.id, "video"); p.onClipMenu(c.id, e.clientX, e.clientY); }}
                        title={`${short} · ${asset?.kind === "image" ? "תמונה מלאה ברצועה — לא לוגו" : "קליפ וידאו"} · ${clipDur(c).toFixed(1)}s`}>
                        <div className="clip-fill" style={{ background: colorOf(c.sourceId) }} />
                        {asset?.kind === "video" && !asset.missing && <Filmstrip file={asset.file} sourceIn={c.start} sourceOut={c.end} height={thumbH} />}
                        {asset?.kind === "image" && !asset.missing && <img className="clip-image" src={asset.url} alt="" draggable={false} />}
                        <span className="clip-accent" style={{ background: colorOf(c.sourceId) }} />
                        {!tLocked && <span className="trim l" onMouseDown={(e) => onDown(e, c, "l", "video", track.id)} />}
                        <span className="clip-label"><span>{!asset || asset.missing ? `מדיה חסרה · ${short || c.sourceId}` : asset.kind === "image" ? `תמונה מלאה · ${short}` : (short || `קטע ${i + 1}`)}</span><span className="cl-dur">{clipDur(c).toFixed(1)}s</span></span>
                        {!tLocked && <span className="trim r" onMouseDown={(e) => onDown(e, c, "r", "video", track.id)} />}
                      </div>
                    );
                  })}
                  <div className="tl-drop" ref={track.id === primaryId ? dropRef : undefined} />
                  <Playhead laneEl={null} />
                </div>
              )}

              {track.type === "audio" && (
                <div className={`tl-lane2 ${track.muted ? "muted" : ""}`}
                  data-track-lane={audioId} data-track-type="audio"
                  onClick={(e) => { if (!drag.current) { p.onSelect(null); p.onSelectSub?.(null); seekFromRow(e, e.currentTarget); } }}
                  onDragOver={(e) => onLaneDragOver(e, audioId)}
                  onDragLeave={onLaneDragLeave}
                  onDrop={(e) => onLaneDrop(e, audioId)}>
                  <Grid />
                  {tClips.map((c, i) => {
                    const gap = isGapClip(c);
                    const asset = mediaById(media, c.sourceId);
                    return (
                      <div
                        key={c.id}
                        className={`clip-audio ${gap ? "gap" : ""} ${audioSel(c.id) ? "selected" : ""} ${clipHover(c.id) && !audioSel(c.id) ? "hovered" : ""} ${tLocked || vLocked ? "locked" : ""} ${!gap && (!asset || asset.missing) ? "missing" : ""}`}
                        style={{ left: `${pct(assembledStart(tClips, i))}%`, width: `${pct(clipDur(c))}%` }}
                        onMouseDown={(e) => { if (!gap) onDown(e, c, "move", "audio", audioId); }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={() => setHoveredId(c.id)}
                        onMouseLeave={() => setHoveredId((h) => (h === c.id ? null : h))}
                        onContextMenu={(e) => { e.preventDefault(); if (!gap) { selectClip(c.id, "audio"); p.onClipMenu(c.id, e.clientX, e.clientY); } }}
                        title={gap ? "רווח" : `${(asset?.name || "").replace(/\.[^.]+$/, "")} · ${clipDur(c).toFixed(1)}s`}
                      >
                        {!gap && asset && !asset.missing && (asset.kind === "video" || asset.kind === "audio") && (
                          <Waveform file={asset.file} sourceIn={c.start} sourceOut={c.end} />
                        )}
                        {!gap && !tLocked && !vLocked && (
                          <>
                            <span className="trim l" onMouseDown={(e) => onDown(e, c, "l", "audio", primaryId)} />
                            <span className="trim r" onMouseDown={(e) => onDown(e, c, "r", "audio", primaryId)} />
                          </>
                        )}
                      </div>
                    );
                  })}
                  <Playhead laneEl={null} />
                </div>
              )}

              {track.type === "caption" && (
                <div className="tl-lane2" onClick={(e) => { if (!drag.current) { p.onSelectSub?.(null); seekFromRow(e, e.currentTarget); } }}>
                  <Grid />
                  {(subs || []).map((s, _cueIndex, allSubs) => {
                    const overlapping = allSubs.filter((other) => other.start < s.end && other.end > s.start);
                    const overlapLevel = overlapping.findIndex((other) => other.id === s.id);
                    return (
                    <div
                      key={s.id}
                      className={`cue2 ${overlapping.length > 1 ? "overlap" : ""} ${selectedSubId === s.id ? "selected" : ""} ${hoveredSubId === s.id ? "hovered" : ""}`}
                      style={{ left: `${pct(s.start)}%`, width: `${Math.max(0.4, pct(s.end - s.start))}%`, top: `${4 + Math.max(0, overlapLevel) * 18}px`, height: 17, bottom: "auto" }}
                      title={`${s.text}${overlapping.length > 1 ? ` · חפיפה עם ${overlapping.length - 1} כתוביות` : ""}`}
                      onClick={(e) => { e.stopPropagation(); p.onSelect(null); p.onSelectOverlay?.(null); p.onSelectSub?.(s.id); }}
                      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); p.onSelectSub?.(s.id); p.onSubMenu?.(s.id, e.clientX, e.clientY); }}
                      onMouseEnter={() => setHoveredSubId(s.id)}
                      onMouseLeave={() => setHoveredSubId((h) => (h === s.id ? null : h))}
                    >
                      <span className="cue-txt">{s.text}</span>
                      {overlapping.length > 1 && <span className="cue-overlap-count">{overlapLevel + 1}/{overlapping.length}</span>}
                    </div>
                  );})}
                  <Playhead laneEl={null} />
                </div>
              )}
            </div>
          );
        })}

        {/* Each visual overlay gets a real lane; rows grow with the composition. */}
        {overlayRows.map((rowOverlay, rowIndex) => (
          <div className="tl-rowline" style={{ height: 48 }} key={rowOverlay?.id || "empty-overlay-row"}>
            <div className="tl-head2">
              <div className="hd-top">
                <Layers className="hd-type" size={14} strokeWidth={1.75} />
                <span className="hd-name">{rowIndex === 0 ? "שכבות" : `שכבה ${rowIndex + 1}`}</span>
              </div>
              <div className="hd-ctrls" dir="ltr" aria-hidden>
                <span className="hd-slot" /><span className="hd-slot" /><span className="hd-slot" /><span className="hd-slot" /><span className="hd-slot" />
              </div>
            </div>
            <div className="tl-lane2" ref={rowIndex === 0 ? overlayLaneRef : undefined} onClick={(e) => { p.onSelectOverlay?.(null); seekFromRow(e, e.currentTarget); }}>
              <Grid />
              {rowOverlay && (() => {
              const o = rowOverlay;
              const asset = o.assetId ? mediaById(media, o.assetId) : undefined;
              const label = o.kind === "text" ? (o.text || "טקסט") : ((asset?.name || "").replace(/\.[^.]+$/, "") || "תמונה");
              const dur = Math.max(0.05, o.end - o.start);
              return (
                <div key={o.id}
                  className={`clip-ov ${o.id === selectedOverlayId ? "selected" : ""} ${o.hidden ? "disabled" : ""} ${asset?.missing ? "missing" : ""}`}
                  style={{ left: `${pct(o.start)}%`, width: `${Math.max(0.4, pct(dur))}%`, opacity: o.hidden ? 0.35 : (o.transform?.opacity ?? 1) }}
                  title={`${label} · ${dur.toFixed(1)}s`}
                  onMouseDown={(e) => onOverlayDown(e, o, "move")}
                  onClick={(e) => { e.stopPropagation(); p.onSelectSub?.(null); p.onSelectOverlay?.(o.id); }}>
                  <span className="trim l" onMouseDown={(e) => onOverlayDown(e, o, "l")} />
                  <span className="clip-label"><span>{label}</span><span className="cl-dur">{dur.toFixed(1)}s</span></span>
                  <span className="trim r" onMouseDown={(e) => onOverlayDown(e, o, "r")} />
                </div>
              );
            })()}
              <Playhead laneEl={null} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
