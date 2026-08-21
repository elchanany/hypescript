"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Clip, MediaAsset, assembledStart, clipDur, clipEnabled, clipOpacity, mediaById, totalDur } from "@/lib/editor/model";
import { Sub } from "@/lib/editor/subtitlesEdl";
import { Overlay } from "@/lib/editor/overlay";
import { audioTrack, primaryVideoTrackId, sortedTracks, TrackMeta, videoTrack } from "@/lib/editor/project";
import { clipTrackId, clipsOnTrack } from "@/lib/editor/tracks";
import { isGapClip } from "@/lib/editor/timelineOps";
import { formatTimecode, MagneticTarget, snapRangeStart, snapToMagneticTarget, snapToleranceSec } from "@/lib/editor/time";
import { nextZoom, scrollLeftAfterZoom, timelineContentWidth, TIMELINE_GUTTER } from "@/lib/editor/zoom";
import { MEDIA_DRAG_MIME } from "@/lib/editor/mediaDrag";
import { Film, AudioLines, Captions, Layers, Lock, Unlock, Volume2, VolumeX, ChevronUp, ChevronDown, ChevronsUpDown, Plus, Eye } from "@/components/icons";
import { IconButton } from "@/components/ui";
import Filmstrip from "@/components/Filmstrip";
import Waveform from "@/components/Waveform";
import StillStrip from "@/components/StillStrip";

/** Magnet radius on screen. The spec calls for 6–10px; 10 keeps it findable without stickiness. */
const SNAP_PIXELS = 10;

interface Props {
  media: MediaAsset[];
  clips: Clip[];
  subs?: Sub[] | null;
  overlays?: Overlay[];
  tracks: TrackMeta[];
  maxDuration: number;
  currentAssembled: number;
  selectedId: string | null;
  selectedIds?: string[];
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
  onSelectMulti?: (ids: string[]) => void;
  onMoveMulti?: (ids: string[], dt: number) => void;
  onSelectOverlay?: (id: string | null) => void;
  onSelectSub?: (id: string | null) => void;
  onSubMove?: (id: string, start: number, end: number) => void;
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
  onOverlayToggleLock?: (id: string) => void;
  onOverlayToggleVisibility?: (id: string) => void;
  onOverlayReorder?: (id: string, dir: -1 | 1) => void;
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
  const innerRef = useRef<HTMLDivElement>(null);
  const laneRef = useRef<HTMLDivElement>(null);
  const overlayLaneRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const dropLaneRef = useRef<{ trackId: string; el: HTMLElement } | null>(null);
  const snapGuideRef = useRef<HTMLDivElement>(null);
  const snapLabelRef = useRef<HTMLSpanElement>(null);
  const pendingScroll = useRef<number | null>(null);
  const zoomAcc = useRef(0);
  const zoomRaf = useRef(0);
  const zoomAnchorX = useRef<number | undefined>(undefined);

  // Marquee selection box state (Windows-style selection box)
  const [marquee, setMarquee] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const marqueeRef = useRef<{ startX: number; startY: number; clientX0: number; clientY0: number; active: boolean } | null>(null);

  // Smooth Auto-scroll during drag
  const autoScrollRaf = useRef<number | null>(null);
  const autoScrollSpeed = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });

  const startAutoScroll = (vx: number, vy: number) => {
    autoScrollSpeed.current = { vx, vy };
    if (autoScrollRaf.current != null) return;
    const step = () => {
      const el = scrollRef.current;
      if (el && (autoScrollSpeed.current.vx !== 0 || autoScrollSpeed.current.vy !== 0)) {
        el.scrollLeft += autoScrollSpeed.current.vx;
        el.scrollTop += autoScrollSpeed.current.vy;
        autoScrollRaf.current = requestAnimationFrame(step);
      } else {
        autoScrollRaf.current = null;
      }
    };
    autoScrollRaf.current = requestAnimationFrame(step);
  };

  const stopAutoScroll = () => {
    autoScrollSpeed.current = { vx: 0, vy: 0 };
    if (autoScrollRaf.current != null) {
      cancelAnimationFrame(autoScrollRaf.current);
      autoScrollRaf.current = null;
    }
  };

  // Active floating 2D drag state across all tracks without overflow clipping
  const [activeDrag, setActiveDrag] = useState<{
    kind: "clip" | "overlay" | "sub";
    id: string;
    dx: number;
    dy: number;
    originLeft: number;
    originTop: number;
    originWidth: number;
    originHeight: number;
    timelineStart: number;
    dur: number;
    targetTrackId: string;
    targetTrackName?: string;
    snapped: boolean;
    clip?: Clip | null;
    overlay?: Overlay | null;
    sub?: Sub | null;
    multiCount?: number;
  } | null>(null);

  // HTML5 media drag state from library
  const [html5Drop, setHtml5Drop] = useState<{
    trackId: string;
    start: number;
    dur: number;
  } | null>(null);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredSubId, setHoveredSubId] = useState<string | null>(null);
  const [captionExpanded, setCaptionExpanded] = useState(false);

  const drag = useRef<{
    kind: "clip" | "overlay" | "sub";
    mode: "move" | "l" | "r";
    id: string;
    x0: number;
    y0: number;
    originLeft: number;
    originTop: number;
    originWidth: number;
    originHeight: number;
    laneW: number;
    s0: number;
    e0: number;
    dur: number;
    moved: boolean;
    px: number;
    py: number;
    assembled0?: number;
    sourceTrackId?: string;
    targetTrackId?: string;
    trackType?: "video" | "audio";
    timelineStart?: number;
    snapped?: boolean;
    multiIds?: string[];
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

  // wheel: pinch/Ctrl = זום סביב הסמן; שתי אצבעות לצד / Shift = גלילה
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
      if (next === z) return;
      pendingScroll.current = scrollLeftAfterZoom({
        oldZoom: z,
        newZoom: next,
        scrollLeft: el.scrollLeft,
        portWidth: port,
        gutter: TIMELINE_GUTTER,
        anchorViewportX: zoomAnchorX.current,
      });
      zoomRef.current = next;
      onZoomRef.current(next);
    };
    const onWheel = (e: WheelEvent) => {
      const pinch = e.ctrlKey || e.metaKey;
      if (pinch) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        zoomAnchorX.current = e.clientX - rect.left;
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
  // At zoom < 1 (zoom out), the visible timeline extends to fill 100% width with continuous grid and ruler
  const visibleTotal = zoom < 1 ? total / Math.max(0.01, zoom) : total;
  const pct = (t: number) => (t / visibleTotal) * 100;

  const ordered = sortedTracks(tracks);
  const primaryId = primaryVideoTrackId(tracks);
  const vTrack = videoTrack(tracks);
  const vLocked = !!vTrack?.locked;
  const clipsOf = (trackId: string) => clipsOnTrack(clips, trackId, primaryId);
  const primaryClips = clipsOf(primaryId);
  const dedicatedAudioClips = clipsOf(audioId);

  // CapCut Track Organization:
  // Only display dedicated audio track if dedicated audio files exist or audio is unlinked/detached.
  const showDedicatedAudioTrack = dedicatedAudioClips.filter((c) => !isGapClip(c)).length > 0 || (!avLinked && dedicatedAudioClips.length > 0);
  // Only display caption track if actual subtitles exist.
  const showCaptionTrack = !!(subs && subs.length > 0);

  const displayTracks = useMemo(() => {
    return ordered.filter((t) => {
      if (t.type === "video") return true;
      if (t.type === "audio") return showDedicatedAudioTrack;
      if (t.type === "caption") return showCaptionTrack;
      return true;
    });
  }, [ordered, showDedicatedAudioTrack, showCaptionTrack]);

  const overlayRows: Array<Overlay> = overlays.length ? [...overlays].sort((a, b) => b.start - a.start) : [];

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
        const d = clipDur(clip);
        points.push({ time: cursor, label: `${track.name} · התחלה`, kind: "clip", priority: 6 });
        points.push({ time: cursor + d / 2, label: `${track.name} · אמצע`, kind: "clip", priority: 4 });
        cursor += d;
        points.push({ time: cursor, label: `${track.name} · סוף`, kind: "clip", priority: 6 });
      }
    }
    for (const overlay of overlays) {
      points.push({ time: overlay.start, label: "שכבה · התחלה", kind: "overlay", priority: 5 });
      points.push({ time: (overlay.start + overlay.end) / 2, label: "שכבה · אמצע", kind: "overlay", priority: 3 });
      points.push({ time: overlay.end, label: "שכבה · סוף", kind: "overlay", priority: 5 });
    }
    for (const cue of (subs || [])) {
      points.push({ time: cue.start, label: "כתובית · התחלה", kind: "caption", priority: 4 });
      points.push({ time: (cue.start + cue.end) / 2, label: "כתובית · אמצע", kind: "caption", priority: 2 });
      points.push({ time: cue.end, label: "כתובית · סוף", kind: "caption", priority: 4 });
    }
    return points;
  }, [clips, tracks, overlays, subs, total, currentAssembled]);

  const snapTol = () => {
    const laneW = laneRef.current?.clientWidth || overlayLaneRef.current?.clientWidth || portW || 800;
    return snapToleranceSec(SNAP_PIXELS, laneW, visibleTotal);
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
    const fraction = Math.max(0, Math.min(1, t / visibleTotal));
    g.classList.toggle("near-end", fraction > 0.78);
    g.style.left = `calc(${TIMELINE_GUTTER}px + (100% - ${TIMELINE_GUTTER}px) * ${fraction})`;
    if (snapLabelRef.current) snapLabelRef.current.textContent = hint || formatTimecode(t);
  };

  const ticks = useMemo(() => {
    const target = 6 + Math.min(64, Math.max(3, zoom * 4));
    const raw = visibleTotal / target;
    const steps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1200, 3600, 7200, 14400];
    const step = steps.find((s) => s >= raw) || steps[steps.length - 1];
    const out: number[] = [];
    for (let t = 0; t <= visibleTotal + 0.001; t += step) out.push(Number(t.toFixed(3)));
    return { out, step };
  }, [visibleTotal, zoom]);

  const fmt = (t: number) => {
    if (ticks.step < 1) return `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
    return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  };

  const dropTarget = (clientX: number, list: Clip[] = primaryClips, laneEl?: HTMLElement | null): { index: number; boundary: number } => {
    const el = laneEl || dropLaneRef.current?.el || laneRef.current;
    if (!el) return { index: list.length, boundary: totalDur(list) };
    const rect = el.getBoundingClientRect();
    const t = ((clientX - rect.left) / Math.max(1, rect.width)) * visibleTotal;
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
    const dur = clipDur(clip);

    const targetEl = e.currentTarget as HTMLElement;
    const targetRect = targetEl.getBoundingClientRect();
    const innerRect = innerRef.current?.getBoundingClientRect() || targetRect;
    const isMulti = !!(p.selectedIds && p.selectedIds.includes(clip.id) && p.selectedIds.length > 1);

    dropLaneRef.current = trackId && e.currentTarget.parentElement
      ? { trackId, el: e.currentTarget.parentElement as HTMLElement }
      : dropLaneRef.current;

    drag.current = {
      kind: "clip", mode, id: clip.id,
      x0: e.clientX, y0: e.clientY,
      originLeft: targetRect.left - innerRect.left,
      originTop: targetRect.top - innerRect.top,
      originWidth: targetRect.width,
      originHeight: targetRect.height,
      laneW: laneRef.current?.clientWidth || 1,
      s0: clip.start, e0: clip.end, dur,
      moved: false, px: e.clientX, py: e.clientY, assembled0,
      sourceTrackId, targetTrackId: sourceTrackId,
      trackType: mediaById(media, clip.sourceId)?.kind === "audio" ? "audio" : "video",
      timelineStart: assembled0,
      snapped: false,
      multiIds: isMulti ? p.selectedIds : undefined,
    };
    selectClip(clip.id, track);

    if (mode === "l" || mode === "r") {
      p.onTrimBegin();
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const onOverlayDown = (e: React.MouseEvent, overlay: Overlay, mode: "move" | "l" | "r") => {
    e.stopPropagation();
    p.onSelectSub?.(null);
    p.onSelectOverlay?.(overlay.id);
    const dur = Math.max(0.05, overlay.end - overlay.start);
    const targetEl = e.currentTarget as HTMLElement;
    const targetRect = targetEl.getBoundingClientRect();
    const innerRect = innerRef.current?.getBoundingClientRect() || targetRect;
    const isMulti = !!(p.selectedIds && p.selectedIds.includes(overlay.id) && p.selectedIds.length > 1);

    drag.current = {
      kind: "overlay",
      mode,
      id: overlay.id,
      x0: e.clientX,
      y0: e.clientY,
      originLeft: targetRect.left - innerRect.left,
      originTop: targetRect.top - innerRect.top,
      originWidth: targetRect.width,
      originHeight: targetRect.height,
      laneW: overlayLaneRef.current?.clientWidth || 1,
      s0: overlay.start,
      e0: overlay.end,
      dur,
      moved: false,
      px: e.clientX,
      py: e.clientY,
      assembled0: overlay.start,
      sourceTrackId: "overlay",
      targetTrackId: "overlay",
      trackType: "video",
      timelineStart: overlay.start,
      snapped: false,
      multiIds: isMulti ? p.selectedIds : undefined,
    };
    if (mode === "l" || mode === "r") {
      p.onOverlayTrimBegin?.();
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const onSubDown = (e: React.MouseEvent, sub: Sub) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    p.onSelect(null);
    p.onSelectOverlay?.(null);
    p.onSelectSub?.(sub.id);
    const dur = Math.max(0.05, sub.end - sub.start);
    const targetEl = e.currentTarget as HTMLElement;
    const targetRect = targetEl.getBoundingClientRect();
    const innerRect = innerRef.current?.getBoundingClientRect() || targetRect;
    const isMulti = !!(p.selectedIds && p.selectedIds.includes(sub.id) && p.selectedIds.length > 1);

    drag.current = {
      kind: "sub",
      mode: "move",
      id: sub.id,
      x0: e.clientX,
      y0: e.clientY,
      originLeft: targetRect.left - innerRect.left,
      originTop: targetRect.top - innerRect.top,
      originWidth: targetRect.width,
      originHeight: targetRect.height,
      laneW: targetEl.parentElement?.clientWidth || laneRef.current?.clientWidth || 1,
      s0: sub.start,
      e0: sub.end,
      dur,
      moved: false,
      px: e.clientX,
      py: e.clientY,
      assembled0: sub.start,
      sourceTrackId: "caption",
      targetTrackId: "caption",
      trackType: "video",
      timelineStart: sub.start,
      snapped: false,
      multiIds: isMulti ? p.selectedIds : undefined,
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const onMove = (e: MouseEvent) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    d.px = e.clientX;
    d.py = e.clientY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) d.moved = true;
    const dt = (dx / Math.max(1, d.laneW)) * visibleTotal;

    // Smooth continuous auto-scrolling when dragging near container boundaries
    const scrollEl = scrollRef.current;
    if (scrollEl) {
      const rect = scrollEl.getBoundingClientRect();
      let vx = 0;
      let vy = 0;
      const marginX = 60;
      const marginY = 40;
      if (e.clientX < rect.left + marginX) {
        vx = -Math.min(22, (rect.left + marginX - e.clientX) * 0.45);
      } else if (e.clientX > rect.right - marginX) {
        vx = Math.min(22, (e.clientX - (rect.right - marginX)) * 0.45);
      }
      if (e.clientY < rect.top + marginY) {
        vy = -Math.min(18, (rect.top + marginY - e.clientY) * 0.4);
      } else if (e.clientY > rect.bottom - marginY) {
        vy = Math.min(18, (e.clientY - (rect.bottom - marginY)) * 0.4);
      }
      if (vx !== 0 || vy !== 0) {
        startAutoScroll(vx, vy);
      } else {
        stopAutoScroll();
      }
    }

    if (d.kind === "sub") {
      if (d.moved) {
        const rawStart = Math.max(0, d.s0 + dt);
        const candidates = snapTargets.filter((t) => Math.abs(t.time - d.s0) > 0.001 && Math.abs(t.time - d.e0) > 0.001);
        const rangeHit = (!snap || e.altKey)
          ? { start: rawStart, snapped: false, target: null, match: null, edge: null }
          : snapRangeStart(rawStart, d.dur, candidates, snapTol());

        d.timelineStart = Math.max(0, rangeHit.start);
        d.snapped = rangeHit.snapped;

        showSnapGuide(
          rangeHit.snapped ? rangeHit.target : d.timelineStart,
          rangeHit.snapped && rangeHit.target != null
            ? `${formatTimecode(rangeHit.target)} · ${rangeHit.match?.label || "קצה"} · ${rangeHit.edge === "end" ? "סוף הכתובית מיושר" : "תחילת הכתובית מיושרת"}`
            : `${formatTimecode(d.timelineStart)} · Alt לביטול מגנט`,
          rangeHit.snapped,
        );

        setActiveDrag({
          kind: "sub",
          id: d.id,
          dx,
          dy,
          originLeft: d.originLeft,
          originTop: d.originTop,
          originWidth: d.originWidth,
          originHeight: d.originHeight,
          timelineStart: d.timelineStart,
          dur: d.dur,
          targetTrackId: "caption",
          snapped: rangeHit.snapped,
          sub: (subs || []).find((s) => s.id === d.id) || null,
          multiCount: d.multiIds?.length,
        });
      }
      return;
    }

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
        // Direct 2D Overlay Move: Free-floating without clipping across all tracks
        const hoveredLane = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-track-lane]");
        const targetLaneId = hoveredLane?.dataset.trackLane || "overlay";
        d.targetTrackId = targetLaneId;

        const rawStart = Math.max(0, d.s0 + dt);
        const candidates = snapTargets.filter((t) => Math.abs(t.time - d.s0) > 0.001 && Math.abs(t.time - d.e0) > 0.001);
        const rangeHit = (!snap || e.altKey)
          ? { start: rawStart, snapped: false, target: null, match: null, edge: null }
          : snapRangeStart(rawStart, d.dur, candidates, snapTol());

        d.timelineStart = Math.max(0, rangeHit.start);
        d.snapped = rangeHit.snapped;

        showSnapGuide(
          rangeHit.snapped ? rangeHit.target : d.timelineStart,
          rangeHit.snapped && rangeHit.target != null
            ? `${formatTimecode(rangeHit.target)} · ${rangeHit.match?.label || "קצה"}`
            : `${formatTimecode(d.timelineStart)} · Alt לביטול מגנט`,
          rangeHit.snapped,
        );

        setActiveDrag({
          kind: "overlay",
          id: d.id,
          dx,
          dy,
          originLeft: d.originLeft,
          originTop: d.originTop,
          originWidth: d.originWidth,
          originHeight: d.originHeight,
          timelineStart: d.timelineStart,
          dur: d.dur,
          targetTrackId: d.targetTrackId,
          snapped: rangeHit.snapped,
          overlay: overlays.find((o) => o.id === d.id) || null,
          multiCount: d.multiIds?.length,
        });
      }
      return;
    }

    if (d.mode === "l" || d.mode === "r") {
      const a0 = d.assembled0 ?? 0;
      const dur0 = d.dur;
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
      // Direct 2D Video/Audio Clip Drag: Free-floating across all layers & rows (CapCut style)
      let hoveredLane = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-track-lane]");
      if (!hoveredLane) {
        const lanes = Array.from(document.querySelectorAll<HTMLElement>("[data-track-lane]"));
        for (const lane of lanes) {
          const rect = lane.getBoundingClientRect();
          if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
            hoveredLane = lane;
            break;
          }
        }
      }
      const targetLaneId = hoveredLane?.dataset.trackLane;
      const laneType = hoveredLane?.dataset.trackType;

      document.querySelectorAll(".tl-lane2.magnetic-target, .tl-rowline.active-target").forEach((el) => {
        el.classList.remove("magnetic-target", "active-target");
      });

      if (d.trackType === "audio") {
        d.targetTrackId = audioId;
        document.querySelector(`[data-track-lane="${audioId}"]`)?.classList.add("magnetic-target");
      } else if (targetLaneId === "__new_track__" || (!hoveredLane && e.clientY > (scrollRef.current?.getBoundingClientRect().bottom || 0) - 70)) {
        d.targetTrackId = "__new_track__";
        hoveredLane?.closest(".dynamic-new-track-zone")?.classList.add("active-target");
      } else if (hoveredLane && (laneType === d.trackType || targetLaneId?.startsWith("trk_video"))) {
        d.targetTrackId = targetLaneId || d.sourceTrackId || primaryId;
        hoveredLane.classList.add("magnetic-target");
      } else {
        d.targetTrackId = d.sourceTrackId || primaryId;
      }

      const rawStart = Math.max(0, (d.assembled0 || 0) + dt);
      const excluded = new Set([d.assembled0 || 0, (d.assembled0 || 0) + d.dur].map((value) => +value.toFixed(4)));
      const candidates = snapTargets.filter((target) => !excluded.has(+target.time.toFixed(4)));
      const rangeHit = (!snap || e.altKey)
        ? { start: rawStart, snapped: false, target: null, match: null, edge: null }
        : snapRangeStart(rawStart, d.dur, candidates, snapTol());

      d.timelineStart = Math.max(0, rangeHit.start);
      d.snapped = rangeHit.snapped;

      showSnapGuide(
        rangeHit.snapped ? rangeHit.target : d.timelineStart,
        rangeHit.snapped && rangeHit.target != null
          ? `${formatTimecode(rangeHit.target)} · ${rangeHit.match?.label || "קצה"} · ${rangeHit.edge === "end" ? "סוף הקטע מיושר" : "תחילת הקטע מיושרת"}`
          : `${formatTimecode(d.timelineStart)} · Alt לביטול מגנט`,
        rangeHit.snapped,
      );

      const trackMeta = p.tracks.find((t) => t.id === d.targetTrackId);
      const targetTrackName = d.targetTrackId === "__new_track__" ? "שכבה חדשה" : (trackMeta?.name || "וידאו");

      setActiveDrag({
        kind: "clip",
        id: d.id,
        dx,
        dy,
        originLeft: d.originLeft,
        originTop: d.originTop,
        originWidth: d.originWidth,
        originHeight: d.originHeight,
        timelineStart: d.timelineStart,
        dur: d.dur,
        targetTrackId: d.targetTrackId,
        targetTrackName,
        snapped: rangeHit.snapped,
        clip: clips.find((c) => c.id === d.id) || null,
        multiCount: d.multiIds?.length,
      });
    }
  };

  const endDragVisuals = () => {
    if (dropRef.current) dropRef.current.style.display = "none";
    showSnapGuide(null);
    document.querySelectorAll(".tl-lane2.magnetic-target, .tl-rowline.active-target, .tl-lane2.drop-target").forEach((el) => {
      el.classList.remove("magnetic-target", "active-target", "drop-target");
    });
    setActiveDrag(null);
    setHtml5Drop(null);
  };

  const hasMediaDrag = (dt: DataTransfer) => Array.from(dt.types || []).includes(MEDIA_DRAG_MIME);

  const pointerTime = (clientX: number, targetEl: HTMLElement) => {
    const lane = targetEl.classList.contains("tl-lane2")
      ? targetEl
      : (targetEl.querySelector<HTMLElement>(".tl-lane2") || laneRef.current || targetEl);
    const rect = lane.getBoundingClientRect();
    return Math.max(0, Math.min(visibleTotal, ((clientX - rect.left) / Math.max(1, rect.width)) * visibleTotal));
  };

  const showMediaDropAt = (clientX: number, lane: HTMLElement, bypass = false, mediaDur = 5) => {
    const raw = pointerTime(clientX, lane);
    if (bypass || !snap) {
      showSnapGuide(raw, `${formatTimecode(raw)} · מיקום חופשי`, false);
      return raw;
    }
    const hit = snapRangeStart(raw, mediaDur, snapTargets, snapTol());
    const time = hit.snapped ? hit.start : raw;
    showSnapGuide(
      hit.snapped ? (hit.target ?? time) : time,
      hit.snapped
        ? `${formatTimecode(time)} · ${hit.match?.label || "קצה"} · ${hit.edge === "end" ? "סוף המדיה מיושר" : "תחילת המדיה מיושרת"}`
        : `${formatTimecode(time)} · מיקום חופשי`,
      hit.snapped,
    );
    return time;
  };

  const onLaneDragOver = (e: React.DragEvent, trackId: string) => {
    if (!hasMediaDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    e.currentTarget.classList.add("drop-target");
    const targetLane = (e.currentTarget as HTMLElement).classList.contains("tl-lane2")
      ? (e.currentTarget as HTMLElement)
      : ((e.currentTarget as HTMLElement).querySelector<HTMLElement>(".tl-lane2") || (e.currentTarget as HTMLElement));
    dropLaneRef.current = { trackId, el: targetLane };
    const id = e.dataTransfer.getData(MEDIA_DRAG_MIME);
    const asset = id ? mediaById(media, id) : undefined;
    const dur = asset?.duration || 5;
    const time = showMediaDropAt(e.clientX, targetLane, e.altKey, dur);
    setHtml5Drop({ trackId, start: time, dur });
  };

  const onLaneDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("drop-target");
    showSnapGuide(null);
    setHtml5Drop(null);
  };

  const onLaneDrop = (e: React.DragEvent, trackId?: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drop-target");
    showSnapGuide(null);
    setHtml5Drop(null);
    const id = e.dataTransfer.getData(MEDIA_DRAG_MIME);
    if (!id || !p.onDropMedia) return;
    const tid = trackId || primaryId;
    const list = tid === "__new_track__" ? [] : clipsOf(tid);
    const targetLane = (e.currentTarget as HTMLElement).classList.contains("tl-lane2")
      ? (e.currentTarget as HTMLElement)
      : ((e.currentTarget as HTMLElement).querySelector<HTMLElement>(".tl-lane2") || (e.currentTarget as HTMLElement));
    const { index } = dropTarget(e.clientX, list, targetLane);
    const asset = mediaById(media, id);
    const timelineStart = showMediaDropAt(e.clientX, targetLane, e.altKey, asset?.duration || 5);
    p.onDropMedia(id, index, tid, timelineStart);
    endDragVisuals();
  };

  const onUp = (e: MouseEvent) => {
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    showSnapGuide(null);
    setActiveDrag(null);
    document.querySelectorAll(".tl-lane2.magnetic-target, .tl-rowline.active-target, .tl-lane2.drop-target").forEach((el) => {
      el.classList.remove("magnetic-target", "active-target", "drop-target");
    });
    if (!drag.current) return;
    const d = drag.current;

    // Multi-selection synchronous dragging
    if (d.moved && d.multiIds && d.multiIds.length > 1) {
      const dt = (d.timelineStart ?? (d.assembled0 ?? d.s0)) - (d.assembled0 ?? d.s0);
      p.onMoveMulti?.(d.multiIds, dt);
      drag.current = null;
      return;
    }

    if (d.kind === "sub") {
      if (!d.moved) { p.onSelectSub?.(d.id); }
      else if (p.onSubMove && d.timelineStart != null) {
        p.onSubMove(d.id, d.timelineStart, d.timelineStart + d.dur);
      }
      drag.current = null;
      return;
    }

    if (d.kind === "overlay") {
      if (d.mode === "l" || d.mode === "r") {
        /* committed via onOverlayTrim */
      } else if (d.mode === "move") {
        if (!d.moved) { p.onSelectOverlay?.(d.id); }
        else if (p.onOverlayMove) {
          p.onOverlayMove(d.id, d.timelineStart ?? d.s0, (d.timelineStart ?? d.s0) + d.dur);
        }
      }
      drag.current = null;
      return;
    }

    if (d.mode === "l" || d.mode === "r") {
      /* committed live */
    } else if (d.mode === "move") {
      if (!d.moved) { /* selected on mousedown */ }
      else {
        const targetTrackId = d.targetTrackId || d.sourceTrackId || primaryId;
        if (targetTrackId === "__new_track__" && p.onMoveAtTime) {
          p.onMoveAtTime(d.id, "__new_track__", d.timelineStart ?? 0);
          drag.current = null;
          return;
        }
        if (p.onMoveAtTime && d.timelineStart != null) {
          p.onMoveAtTime(d.id, targetTrackId, d.timelineStart);
          drag.current = null;
          return;
        }
        const clip = clips.find((c) => c.id === d.id);
        const tid = clip ? clipTrackId(clip, primaryId) : primaryId;
        const list = clipsOf(tid);
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

  const onTimelineMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest(".clip2, .clip-audio, .clip-ov, .cue2, .cue-chip, button, .tl-head2, .trim, .tl-ruler2, .playhead2, .tl-tick2")) return;

    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const rect = scrollEl.getBoundingClientRect();
    const startX = e.clientX - rect.left + scrollEl.scrollLeft;
    const startY = e.clientY - rect.top + scrollEl.scrollTop;

    marqueeRef.current = {
      startX,
      startY,
      clientX0: e.clientX,
      clientY0: e.clientY,
      active: false,
    };

    const onMarqueeMove = (ev: MouseEvent) => {
      if (!marqueeRef.current) return;
      const dx = ev.clientX - marqueeRef.current.clientX0;
      const dy = ev.clientY - marqueeRef.current.clientY0;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        marqueeRef.current.active = true;
      }
      if (!marqueeRef.current.active) return;

      const currentX = ev.clientX - rect.left + scrollEl.scrollLeft;
      const currentY = ev.clientY - rect.top + scrollEl.scrollTop;

      const left = Math.min(marqueeRef.current.startX, currentX);
      const top = Math.min(marqueeRef.current.startY, currentY);
      const width = Math.abs(currentX - marqueeRef.current.startX);
      const height = Math.abs(currentY - marqueeRef.current.startY);

      setMarquee({ left, top, width, height });

      const marqueeRect = {
        left: Math.min(marqueeRef.current.clientX0, ev.clientX),
        top: Math.min(marqueeRef.current.clientY0, ev.clientY),
        right: Math.max(marqueeRef.current.clientX0, ev.clientX),
        bottom: Math.max(marqueeRef.current.clientY0, ev.clientY),
      };

      const foundClips = document.querySelectorAll<HTMLElement>(".clip2, .clip-audio, .clip-ov, .clip-gap, .cue2");
      const currentHits = new Set<string>();

      for (let i = 0; i < foundClips.length; i++) {
        const el = foundClips[i];
        const cRect = el.getBoundingClientRect();
        const intersects = !(
          marqueeRect.right < cRect.left ||
          marqueeRect.left > cRect.right ||
          marqueeRect.bottom < cRect.top ||
          marqueeRect.top > cRect.bottom
        );

        if (intersects) {
          el.classList.add("marquee-selected");
          const cid = el.dataset.clipId;
          if (cid) currentHits.add(cid);
        } else {
          el.classList.remove("marquee-selected");
        }
      }

      (marqueeRef.current as any).hits = currentHits;
    };

    const onMarqueeUp = () => {
      window.removeEventListener("mousemove", onMarqueeMove);
      window.removeEventListener("mouseup", onMarqueeUp);
      document.querySelectorAll(".marquee-selected").forEach((el) => el.classList.remove("marquee-selected"));
      const hits: Set<string> | undefined = (marqueeRef.current as any)?.hits;
      setMarquee(null);
      marqueeRef.current = null;

      if (hits && hits.size > 0) {
        const hitsArr = Array.from(hits);
        p.onSelectMulti?.(hitsArr);
      } else {
        p.onSelectMulti?.([]);
        p.onSelect(null);
        p.onSelectOverlay?.(null);
        p.onSelectSub?.(null);
      }
    };

    window.addEventListener("mousemove", onMarqueeMove);
    window.addEventListener("mouseup", onMarqueeUp);
  };

  const seekFromRow = (e: React.MouseEvent, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const raw = Math.max(0, Math.min(visibleTotal, ((e.clientX - rect.left) / rect.width) * visibleTotal));
    const { time } = applySnap(raw);
    p.onSeek(time);
  };

  const [phDrag, setPhDrag] = useState(false);
  const seekFromClientX = (clientX: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const raw = Math.max(0, Math.min(visibleTotal, ((clientX - rect.left) / rect.width) * visibleTotal));
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

  const onRulerDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const rulerEl = e.currentTarget as HTMLElement;
    seekFromClientX(e.clientX, rulerEl);
    const onMove = (ev: MouseEvent) => seekFromClientX(ev.clientX, rulerEl);
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // אזור התפיסה של ראש-הנגן רחב מהקו עצמו (::after ב-globals.css), אבל בקצה
  // ההתחלתי חצי ממנו נופל מתחת לעמודת שמות הרצועות (‎.tl-head2, sticky, z-index
  // גבוה יותר) — שם נמדדו 7px תפיסה במקום 14px. at-start מזיז את אותו רוחב
  // תפיסה כולו פנימה, בלי להזיז את הקו (שחייב להישאר מדויק) ובלי לצייר מעל
  // הכותרת כשגוללים.
  const PLAYHEAD_GRAB_PX = 7;
  const playheadAtStart = (pct(currentAssembled) / 100) * (laneRef.current?.clientWidth || 0) < PLAYHEAD_GRAB_PX;
  const Playhead = ({ laneEl }: { laneEl?: HTMLElement | null }) => (
    <div
      className={`playhead2 ${phDrag ? "dragging" : ""} ${playheadAtStart ? "at-start" : ""}`}
      style={{ left: `${pct(currentAssembled)}%` }}
      title="גרור לניווט בציר"
      onMouseDown={(e) => {
        const el = laneEl || (e.currentTarget.parentElement as HTMLElement);
        if (el) onPlayheadDown(e, el);
      }}
    />
  );

  const Grid = () => (
    <>
      {ticks.out.map((t) => (
        <div key={t} className="tl-gridline" style={{ left: `${pct(t)}%` }} />
      ))}
    </>
  );

  const isMultiSel = (id: string) => !!p.selectedIds && p.selectedIds.includes(id);
  const videoSel = (id: string) => isMultiSel(id) || (selectedId === id && (avLinked || selectionTrack !== "audio"));
  const audioSel = (id: string) => isMultiSel(id) || (selectedId === id && (avLinked || selectionTrack === "audio"));
  const clipHover = (id: string) => hoveredId === id;

  const contentWidth = portW > 0 ? Math.max(portW, timelineContentWidth(portW, zoom)) : "100%";

  return (
    <div className="tl-scroll" ref={scrollRef} onMouseDown={onTimelineMouseDown} title="שתי אצבעות לצד = גלילה · Pinch/Ctrl+גלגלת = זום">
      <div
        className="tl-inner"
        ref={innerRef}
        style={{
          width: contentWidth,
          minWidth: "100%",
        }}
      >
        {/* Windows-style blue marquee selection box */}
        {marquee && (
          <div
            className="tl-marquee-box"
            style={{
              left: marquee.left,
              top: marquee.top,
              width: marquee.width,
              height: marquee.height,
            }}
          />
        )}

        {/* Ruler */}
        <div className="tl-rowline tl-rulerline">
          <div className="tl-corner2" />
          <div className="tl-ruler2" onMouseDown={onRulerDown} onClick={(e) => seekFromRow(e, e.currentTarget)}>
            {ticks.out.map((t) => (
              <div key={t} className="tl-tick2" style={{ left: `${pct(t)}%` }}><span>{fmt(t)}</span></div>
            ))}
            <Playhead laneEl={null} />
          </div>
        </div>

        {/* Video, Audio, and Caption Tracks */}
        {displayTracks.map((track) => {
          const TypeIcon = TYPE_ICON[track.type];
          const dedicatedAudio = clipsOf(audioId);
          const tClips = track.type === "video" ? clipsOf(track.id) : track.type === "audio" && dedicatedAudio.length ? dedicatedAudio : primaryClips;
          const linkedAudio = primaryClips.filter((clip) => {
            const asset = mediaById(media, clip.sourceId);
            return isGapClip(clip) || asset?.kind === "video";
          });
          const realDedicated = dedicatedAudio.filter((c) => !isGapClip(c));
          const audioLayers = track.type === "audio"
            ? (realDedicated.length ? [{ clips: realDedicated, linked: false }] : (!avLinked && linkedAudio.length ? [{ clips: linkedAudio, linked: true }] : []))
            : [];
          const tLocked = !!track.locked;

          return (
            <div
              className={`tl-rowline ${track.type === "caption" ? `caption-row ${captionExpanded ? "expanded" : "collapsed"}` : ""}`}
              key={track.id}
              style={{ height: track.type === "caption" ? (captionExpanded ? Math.max(64, track.height) : 30) : track.height }}
            >
              <div
                className="tl-head2"
                onClick={() => { if (track.type === "caption") setCaptionExpanded((value) => !value); }}
                onContextMenu={(event) => { event.preventDefault(); p.onTrackMenu?.(track.id, event.clientX, event.clientY); }}
                aria-expanded={track.type === "caption" ? captionExpanded : undefined}
              >
                <div className="hd-top">
                  <TypeIcon className="hd-type" size={14} strokeWidth={1.75} />
                  <span
                    className="hd-name"
                    title="לחיצה כפולה לשינוי שם"
                    onDoubleClick={() => p.onRequestRenameTrack?.(track.id, track.name)}
                  >
                    {track.name}
                  </span>
                </div>
                <div className="hd-ctrls" dir="ltr">
                  <IconButton
                    icon={track.locked ? Lock : Unlock}
                    tip={track.locked ? "שחרר נעילה" : "נעל"}
                    tipPos="up"
                    active={track.locked}
                    onClick={() => p.toggleLock(track.id)}
                  />
                  {track.type === "audio" ? (
                    <IconButton
                      icon={track.muted ? VolumeX : Volume2}
                      tip={track.muted ? "בטל השתקה" : "השתק"}
                      tipPos="up"
                      active={track.muted}
                      onClick={() => p.toggleMute(track.id)}
                    />
                  ) : (
                    <span className="hd-slot" aria-hidden />
                  )}
                  <IconButton icon={ChevronsUpDown} tip="גובה רצועה" tipPos="up" onClick={() => p.cycleHeight(track.id)} />
                  <IconButton icon={ChevronDown} tip="העבר למטה" tipPos="up" onClick={() => p.reorderTrack(track.id, 1)} />
                  <IconButton icon={ChevronUp} tip="העבר למעלה" tipPos="up" onClick={() => p.reorderTrack(track.id, -1)} />
                </div>
              </div>

              {track.type === "video" && (
                <div
                  className="tl-lane2"
                  ref={track.id === primaryId ? laneRef : undefined}
                  data-track-lane={track.id}
                  data-track-type="video"
                  onClick={(e) => { if (!drag.current) { p.onSelect(null); p.onSelectSub?.(null); seekFromRow(e, e.currentTarget); } }}
                  onDragOver={(e) => onLaneDragOver(e, track.id)}
                  onDragLeave={onLaneDragLeave}
                  onDrop={(e) => onLaneDrop(e, track.id)}
                >
                  <Grid />
                  {tClips.length === 0 && (
                    <div className="tl-empty-lane-placeholder">
                      <Film size={16} strokeWidth={1.5} />
                      <span>Drag material here and start to create</span>
                    </div>
                  )}
                  {tClips.map((c, i) => {
                    const gap = isGapClip(c);
                    const isDraggingThis = activeDrag?.id === c.id;
                    if (gap) {
                      return (
                        <div
                          key={c.id}
                          data-clip-id={c.id}
                          className={`clip-gap ${videoSel(c.id) ? "selected" : ""} ${hoveredId === c.id ? "hovered" : ""} ${tLocked ? "locked" : ""} ${isDraggingThis ? "is-dragging-origin" : ""}`}
                          style={{
                            left: `${pct(assembledStart(tClips, i))}%`,
                            width: `${pct(clipDur(c))}%`,
                          }}
                          onMouseDown={(e) => onDown(e, c, "move", "video", track.id)}
                          onClick={(e) => e.stopPropagation()}
                          onMouseEnter={() => setHoveredId(c.id)}
                          onMouseLeave={() => setHoveredId((h) => (h === c.id ? null : h))}
                          onContextMenu={(e) => { e.preventDefault(); selectClip(c.id, "video"); p.onClipMenu(c.id, e.clientX, e.clientY); }}
                          title={`רווח · ${clipDur(c).toFixed(1)}s`}
                        >
                          {!tLocked && <span className="trim l" onMouseDown={(e) => onDown(e, c, "l", "video", track.id)} />}
                          <span className="clip-label"><span>רווח</span><span className="cl-dur">{clipDur(c).toFixed(1)}s</span></span>
                          {!tLocked && <span className="trim r" onMouseDown={(e) => onDown(e, c, "r", "video", track.id)} />}
                        </div>
                      );
                    }
                    const asset = mediaById(media, c.sourceId);
                    const short = (asset?.name || "").replace(/\.[^.]+$/, "");
                    const thumbH = Math.max(26, track.height - (avLinked ? 26 : 8));
                    return (
                      <div
                        key={c.id}
                        data-clip-id={c.id}
                        className={`clip2 ${videoSel(c.id) ? "selected" : ""} ${hoveredId === c.id ? "hovered" : ""} ${clipEnabled(c) ? "" : "disabled"} ${tLocked ? "locked" : ""} ${!asset || asset.missing ? "missing" : ""} ${isDraggingThis ? "is-dragging-origin" : ""}`}
                        style={{
                          left: `${pct(assembledStart(tClips, i))}%`,
                          width: `${pct(clipDur(c))}%`,
                          opacity: clipOpacity(c),
                        }}
                        onMouseDown={(e) => onDown(e, c, "move", "video", track.id)}
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={() => setHoveredId(c.id)}
                        onMouseLeave={() => setHoveredId((h) => (h === c.id ? null : h))}
                        onContextMenu={(e) => { e.preventDefault(); selectClip(c.id, "video"); p.onClipMenu(c.id, e.clientX, e.clientY); }}
                        title={`${short} · ${asset?.kind === "image" ? "תמונה מלאה ברצועה" : "קליפ וידאו מאוחד עם אודיו"} · ${clipDur(c).toFixed(1)}s`}
                      >
                        <div className="clip-fill" style={{ background: colorOf(c.sourceId) }} />
                        {asset?.kind === "video" && !asset.missing && (
                          <div className="clip-video-content">
                            <div className="clip-filmstrip-area">
                              <Filmstrip file={asset.file || asset.url} src={asset.url} sourceIn={c.start} sourceOut={c.end} height={thumbH} />
                            </div>
                            {/* Integrated Audio Waveform inside the Video Clip (CapCut style) */}
                            {avLinked && (
                              <div className="clip-waveform-area">
                                <Waveform file={asset.file} sourceIn={c.start} sourceOut={c.end} />
                              </div>
                            )}
                          </div>
                        )}
                        {asset?.kind === "image" && !asset.missing && <StillStrip src={asset.url} />}
                        <span className="clip-accent" style={{ background: colorOf(c.sourceId) }} />
                        {!tLocked && <span className="trim l" onMouseDown={(e) => onDown(e, c, "l", "video", track.id)} />}
                        <span className="clip-label">
                          <span>{!asset || asset.missing ? `מדיה חסרה · ${short || c.sourceId}` : asset.kind === "image" ? `תמונה · ${short}` : (short || `קטע ${i + 1}`)}</span>
                          <span className="cl-dur">{clipDur(c).toFixed(1)}s</span>
                        </span>
                        {!tLocked && <span className="trim r" onMouseDown={(e) => onDown(e, c, "r", "video", track.id)} />}
                      </div>
                    );
                  })}

                  {/* Active drop landing box */}
                  {((activeDrag && activeDrag.targetTrackId === track.id) || (html5Drop && html5Drop.trackId === track.id)) && (
                    <div
                      className="tl-drop-box"
                      style={{
                        left: `${pct(activeDrag ? activeDrag.timelineStart : html5Drop!.start)}%`,
                        width: `${Math.max(1.5, pct(activeDrag ? activeDrag.dur : html5Drop!.dur))}%`,
                      }}
                    >
                      <span>{formatTimecode(activeDrag ? activeDrag.timelineStart : html5Drop!.start)}</span>
                    </div>
                  )}

                  <div className="tl-drop" ref={track.id === primaryId ? dropRef : undefined} />
                  <Playhead laneEl={null} />
                </div>
              )}

              {track.type === "audio" && (
                <div
                  className={`tl-lane2 ${track.muted ? "muted" : ""}`}
                  data-track-lane={audioId}
                  data-track-type="audio"
                  onClick={(e) => { if (!drag.current) { p.onSelect(null); p.onSelectSub?.(null); seekFromRow(e, e.currentTarget); } }}
                  onDragOver={(e) => onLaneDragOver(e, audioId)}
                  onDragLeave={onLaneDragLeave}
                  onDrop={(e) => onLaneDrop(e, audioId)}
                >
                  <Grid />
                  {audioLayers.flatMap((layer, layerIndex) => layer.clips.map((c, i) => {
                    const gap = isGapClip(c);
                    const asset = mediaById(media, c.sourceId);
                    const layerCount = audioLayers.length;
                    const layerTop = layerCount > 1 ? (layerIndex === 0 ? 3 : "50%") : 4;
                    const layerBottom = layerCount > 1 ? (layerIndex === 0 ? "50%" : 3) : 4;
                    const layerTrackId = layer.linked ? primaryId : audioId;
                    const isDraggingThis = activeDrag?.id === c.id;

                    return (
                      <div
                        key={`${layer.linked ? "linked" : "extra"}-${c.id}`}
                        data-clip-id={c.id}
                        className={`clip-audio ${layer.linked ? "linked" : "extra"} ${gap ? "gap" : ""} ${audioSel(c.id) ? "selected" : ""} ${clipHover(c.id) && !audioSel(c.id) ? "hovered" : ""} ${tLocked || (layer.linked && vLocked) ? "locked" : ""} ${!gap && (!asset || asset.missing) ? "missing" : ""} ${isDraggingThis ? "is-dragging-origin" : ""}`}
                        style={{
                          left: `${pct(assembledStart(layer.clips, i))}%`,
                          width: `${pct(clipDur(c))}%`,
                          top: layerTop,
                          bottom: layerBottom,
                        }}
                        onMouseDown={(e) => { if (!gap) onDown(e, c, "move", "audio", layerTrackId); }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={() => setHoveredId(c.id)}
                        onMouseLeave={() => setHoveredId((h) => (h === c.id ? null : h))}
                        onContextMenu={(e) => { e.preventDefault(); if (!gap) { selectClip(c.id, "audio"); p.onClipMenu(c.id, e.clientX, e.clientY); } }}
                        title={gap ? "רווח" : `${(asset?.name || "").replace(/\.[^.]+$/, "")} · ${clipDur(c).toFixed(1)}s`}
                      >
                        {!gap && asset && !asset.missing && (asset.kind === "video" || asset.kind === "audio") && (
                          <Waveform file={asset.file} sourceIn={c.start} sourceOut={c.end} />
                        )}
                        {!gap && <span className="audio-clip-label">{(asset?.name || "אודיו").replace(/\.[^.]+$/, "")}</span>}
                        {!gap && !tLocked && !(layer.linked && vLocked) && (
                          <>
                            <span className="trim l" onMouseDown={(e) => onDown(e, c, "l", "audio", layerTrackId)} />
                            <span className="trim r" onMouseDown={(e) => onDown(e, c, "r", "audio", layerTrackId)} />
                          </>
                        )}
                      </div>
                    );
                  }))}

                  {/* Active drop landing box */}
                  {((activeDrag && activeDrag.targetTrackId === audioId) || (html5Drop && html5Drop.trackId === audioId)) && (
                    <div
                      className="tl-drop-box"
                      style={{
                        left: `${pct(activeDrag ? activeDrag.timelineStart : html5Drop!.start)}%`,
                        width: `${Math.max(1.5, pct(activeDrag ? activeDrag.dur : html5Drop!.dur))}%`,
                      }}
                    >
                      <span>{formatTimecode(activeDrag ? activeDrag.timelineStart : html5Drop!.start)}</span>
                    </div>
                  )}

                  <Playhead laneEl={null} />
                </div>
              )}

              {track.type === "caption" && (
                <div className="tl-lane2" onClick={(e) => { if (!drag.current) { p.onSelectSub?.(null); seekFromRow(e, e.currentTarget); } }}>
                  <Grid />
                  {(subs || []).map((s, _cueIndex, allSubs) => {
                    const overlapping = allSubs.filter((other) => other.start < s.end && other.end > s.start);
                    const overlapLevel = overlapping.findIndex((other) => other.id === s.id);
                    const isDraggingThis = activeDrag?.id === s.id;
                    return (
                      <div
                        key={s.id}
                        data-clip-id={s.id}
                        className={`cue2 ${overlapping.length > 1 ? "overlap" : ""} ${selectedSubId === s.id || isMultiSel(s.id) ? "selected" : ""} ${hoveredSubId === s.id ? "hovered" : ""} ${isDraggingThis ? "is-dragging-origin" : ""}`}
                        style={{ left: `${pct(s.start)}%`, width: `${Math.max(0.4, pct(s.end - s.start))}%`, top: `${4 + Math.max(0, overlapLevel) * 18}px`, height: 17, bottom: "auto" }}
                        title={`${s.text}${overlapping.length > 1 ? ` · חפיפה עם ${overlapping.length - 1} כתוביות` : ""}`}
                        onMouseDown={(e) => onSubDown(e, s)}
                        onClick={(e) => { e.stopPropagation(); p.onSelect(null); p.onSelectOverlay?.(null); p.onSelectSub?.(s.id); }}
                        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); p.onSelectSub?.(s.id); p.onSubMenu?.(s.id, e.clientX, e.clientY); }}
                        onMouseEnter={() => setHoveredSubId(s.id)}
                        onMouseLeave={() => setHoveredSubId((h) => (h === s.id ? null : h))}
                      >
                        <span className="cue-txt">{s.text}</span>
                        {overlapping.length > 1 && <span className="cue-overlap-count">{overlapLevel + 1}/{overlapping.length}</span>}
                      </div>
                    );
                  })}
                  <Playhead laneEl={null} />
                </div>
              )}
            </div>
          );
        })}

        {/* Visual Overlay Tracks (CapCut style dynamic layer allocation) */}
        {overlayRows.map((rowOverlay, rowIndex) => (
          <div className="tl-rowline" style={{ height: 48 }} key={rowOverlay?.id || `empty-overlay-row-${rowIndex}`}>
            <div className="tl-head2">
              <div className="hd-top">
                <Layers className="hd-type" size={14} strokeWidth={1.75} />
                <span className="hd-name">{rowIndex === 0 ? "שכבות" : `שכבה ${rowIndex + 1}`}</span>
              </div>
              <div className="hd-ctrls" dir="ltr">
                {rowOverlay ? <IconButton icon={rowOverlay.locked ? Lock : Unlock} tip={rowOverlay.locked ? "שחרר שכבה" : "נעל שכבה"} tipPos="up" active={rowOverlay.locked} onClick={() => p.onOverlayToggleLock?.(rowOverlay.id)} /> : <span className="hd-slot" />}
                {rowOverlay ? <IconButton icon={Eye} tip={rowOverlay.hidden ? "הצג שכבה" : "הסתר שכבה"} tipPos="up" active={rowOverlay.hidden} onClick={() => p.onOverlayToggleVisibility?.(rowOverlay.id)} /> : <span className="hd-slot" />}
                <span className="hd-slot" />
                {rowOverlay ? <IconButton icon={ChevronDown} tip="העבר שכבה למטה" tipPos="up" onClick={() => p.onOverlayReorder?.(rowOverlay.id, -1)} /> : <span className="hd-slot" />}
                {rowOverlay ? <IconButton icon={ChevronUp} tip="העבר שכבה למעלה" tipPos="up" onClick={() => p.onOverlayReorder?.(rowOverlay.id, 1)} /> : <span className="hd-slot" />}
              </div>
            </div>
            <div
              className="tl-lane2"
              ref={rowIndex === 0 ? overlayLaneRef : undefined}
              data-track-lane={rowOverlay?.id || `overlay_${rowIndex}`}
              data-track-type="video"
              onClick={(e) => { p.onSelectOverlay?.(null); seekFromRow(e, e.currentTarget); }}
            >
              <Grid />
              {rowOverlay && (() => {
                const o = rowOverlay;
                const asset = o.assetId ? mediaById(media, o.assetId) : undefined;
                const label = o.kind === "text" ? (o.text || "טקסט") : ((asset?.name || "").replace(/\.[^.]+$/, "") || "תמונה");
                const dur = Math.max(0.05, o.end - o.start);
                const isDraggingThis = activeDrag?.id === o.id;

                return (
                  <div
                    key={o.id}
                    data-clip-id={o.id}
                    className={`clip-ov ${o.id === selectedOverlayId || isMultiSel(o.id) ? "selected" : ""} ${o.hidden ? "disabled" : ""} ${asset?.missing ? "missing" : ""} ${isDraggingThis ? "is-dragging-origin" : ""}`}
                    style={{
                      left: `${pct(o.start)}%`,
                      width: `${Math.max(0.4, pct(dur))}%`,
                      opacity: o.hidden ? 0.35 : (o.transform?.opacity ?? 1),
                    }}
                    title={`${label} · ${dur.toFixed(1)}s`}
                    onMouseDown={(e) => onOverlayDown(e, o, "move")}
                    onClick={(e) => { e.stopPropagation(); p.onSelectSub?.(null); p.onSelectOverlay?.(o.id); }}
                  >
                    <span className="trim l" onMouseDown={(e) => onOverlayDown(e, o, "l")} />
                    <span className="clip-label"><span>{label}</span><span className="cl-dur">{dur.toFixed(1)}s</span></span>
                    <span className="trim r" onMouseDown={(e) => onOverlayDown(e, o, "r")} />
                  </div>
                );
              })()}

              {/* Active drop landing box */}
              {activeDrag && activeDrag.targetTrackId === (rowOverlay?.id || `overlay_${rowIndex}`) && (
                <div
                  className="tl-drop-box"
                  style={{
                    left: `${pct(activeDrag.timelineStart)}%`,
                    width: `${Math.max(1.5, pct(activeDrag.dur))}%`,
                  }}
                >
                  <span>{formatTimecode(activeDrag.timelineStart)}</span>
                </div>
              )}

              <Playhead laneEl={null} />
            </div>
          </div>
        ))}

        {/* Dynamic Infinite New-Track Drop Zone (CapCut style — shown when dragging) */}
        <div
          className="tl-rowline dynamic-new-track-zone"
          data-track-lane="__new_track__"
          data-track-type="video"
          style={{
            minHeight: activeDrag || html5Drop ? 44 : 0,
            height: activeDrag || html5Drop ? 44 : 0,
            display: activeDrag || html5Drop ? "flex" : "none",
            opacity: activeDrag || html5Drop ? 1 : 0,
            transition: "all 0.15s ease",
          }}
          onDragOver={(e) => onLaneDragOver(e, "__new_track__")}
          onDragLeave={onLaneDragLeave}
          onDrop={(e) => onLaneDrop(e, "__new_track__")}
        >
          <div className="tl-head2 new-track-head">
            <div className="hd-top">
              <Layers className="hd-type" size={14} strokeWidth={1.75} style={{ opacity: 0.4 }} />
              <span className="hd-name" style={{ opacity: 0.6 }}>שכבה חדשה</span>
            </div>
            <div className="hd-ctrls" dir="ltr">
              <span className="hd-slot" />
            </div>
          </div>
          <div
            className="tl-lane2 new-track-lane"
            data-track-lane="__new_track__"
            data-track-type="video"
            onClick={(e) => { if (!drag.current) seekFromRow(e, e.currentTarget); }}
          >
            <Grid />
            {/* Active drop landing box when dragged over new track area */}
            {((activeDrag && activeDrag.targetTrackId === "__new_track__") || (html5Drop && html5Drop.trackId === "__new_track__")) && (
              <div
                className="tl-drop-box"
                style={{
                  left: `${pct(activeDrag ? activeDrag.timelineStart : html5Drop!.start)}%`,
                  width: `${Math.max(2, pct(activeDrag ? activeDrag.dur : html5Drop!.dur))}%`,
                }}
              >
                <span>{formatTimecode(activeDrag ? activeDrag.timelineStart : html5Drop!.start)}</span>
              </div>
            )}
            <Playhead laneEl={null} />
          </div>
        </div>

        {/* Top-Level Timeline Floating Drag Layer (CapCut 2D Drag — floats over ALL tracks without clipping) */}
        {activeDrag && (
          <div
            className="tl-floating-drag-item"
            style={{
              left: `${activeDrag.originLeft + activeDrag.dx}px`,
              top: `${activeDrag.originTop + activeDrag.dy}px`,
              width: `${activeDrag.originWidth}px`,
              height: `${activeDrag.originHeight}px`,
            }}
          >
            {activeDrag.multiCount && activeDrag.multiCount > 1 && (
              <div
                style={{
                  position: "absolute",
                  top: -12,
                  insetInlineEnd: -12,
                  background: "#3b82f6",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: 999,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                  zIndex: 100,
                  pointerEvents: "none",
                }}
              >
                {activeDrag.multiCount} פריטים
              </div>
            )}

            {activeDrag.kind === "sub" && activeDrag.sub && (
              <div className="cue2 selected" style={{ inset: 0, width: "100%", height: "100%", position: "relative" }}>
                <span className="cue-txt">{activeDrag.sub.text}</span>
              </div>
            )}

            {activeDrag.kind === "overlay" && activeDrag.overlay && (() => {
              const o = activeDrag.overlay;
              const asset = o.assetId ? mediaById(media, o.assetId) : undefined;
              const label = o.kind === "text" ? (o.text || "טקסט") : ((asset?.name || "").replace(/\.[^.]+$/, "") || "תמונה");
              return (
                <div className="clip-ov selected" style={{ inset: 0, width: "100%", height: "100%", position: "relative" }}>
                  <span className="clip-label"><span>{label}</span><span className="cl-dur">{activeDrag.dur.toFixed(1)}s</span></span>
                </div>
              );
            })()}

            {activeDrag.kind === "clip" && activeDrag.clip && (() => {
              const c = activeDrag.clip;
              const gap = isGapClip(c);
              const asset = mediaById(media, c.sourceId);
              const short = (asset?.name || "").replace(/\.[^.]+$/, "");
              const isAudio = asset?.kind === "audio";

              if (gap) {
                return (
                  <div className="clip-gap selected" style={{ inset: 0, width: "100%", height: "100%", position: "relative" }}>
                    <span className="clip-label"><span>רווח</span><span className="cl-dur">{activeDrag.dur.toFixed(1)}s</span></span>
                  </div>
                );
              }
              if (isAudio) {
                return (
                  <div className="clip-audio selected" style={{ inset: 0, width: "100%", height: "100%", position: "relative" }}>
                    {asset && !asset.missing && <Waveform file={asset.file} sourceIn={c.start} sourceOut={c.end} />}
                    <span className="audio-clip-label">{short}</span>
                  </div>
                );
              }
              return (
                <div className="clip2 selected" style={{ inset: 0, width: "100%", height: "100%", position: "relative" }}>
                  <div className="clip-fill" style={{ background: colorOf(c.sourceId) }} />
                  {asset?.kind === "video" && !asset.missing && (
                    <div className="clip-video-content">
                      <div className="clip-filmstrip-area">
                        <Filmstrip file={asset.file || asset.url} src={asset.url} sourceIn={c.start} sourceOut={c.end} height={Math.max(26, activeDrag.originHeight - (avLinked ? 26 : 8))} />
                      </div>
                      {avLinked && (
                        <div className="clip-waveform-area">
                          <Waveform file={asset.file} sourceIn={c.start} sourceOut={c.end} />
                        </div>
                      )}
                    </div>
                  )}
                  {asset?.kind === "image" && !asset.missing && <StillStrip src={asset.url} />}
                  <span className="clip-label">
                    <span>{short || "קטע"}</span>
                    <span className="cl-dur">{activeDrag.dur.toFixed(1)}s</span>
                  </span>
                </div>
              );
            })()}
          </div>
        )}

        {/* CapCut-style Vertical Snap Guide line across all tracks */}
        <div
          ref={snapGuideRef}
          className="tl-snap-guide"
          style={{
            display: "none",
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "2px",
            zIndex: 40,
            pointerEvents: "none",
          }}
        >
          <span ref={snapLabelRef} />
        </div>
      </div>
    </div>
  );
}
