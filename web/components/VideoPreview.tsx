"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type CSSProperties } from "react";
import { Clip, MediaAsset, assembledStart, assembledToSource, clipAudioFades, clipDur, clipEnabled, clipFlipX, clipFlipY, clipOpacity, clipVisualFades, clipVolume, totalDur } from "@/lib/editor/model";
import { audioFadeFactor, edgeFadeFactor, previewAudioGain } from "@/lib/editor/previewAudio";
import { isGapClip } from "@/lib/editor/timelineOps";
import { clipLook } from "@/lib/creative/clipLook";
import { Sub } from "@/lib/editor/subtitlesEdl";
import { Overlay } from "@/lib/editor/overlay";
import { CanvasSize, displayRect } from "@/lib/editor/canvasCoords";
import { CaptionStyle, captionStyleToCss, DEFAULT_CAPTION_STYLE } from "@/lib/editor/captionStyle";
import { audioTrack, primaryVideoTrackId, TrackMeta, videoTracks } from "@/lib/editor/project";
import { clipsOnTrack, flattenVideoTracks } from "@/lib/editor/tracks";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize, MoreHorizontal, Camera, MapPin, Film, Music, RotateCcw, RotateCw, TriangleAlert } from "@/components/icons";
import { IconButton, ContextMenu, CtxItem } from "@/components/ui";
import { AspectRatioPicker } from "@/components/AspectRatioPicker";
import PreviewOverlays from "@/components/PreviewOverlays";

export interface PreviewHandle { seek: (assembled: number) => void; toggle: () => void; }

interface Props {
  media: MediaAsset[];
  clips: Clip[] | null;
  tracks?: TrackMeta[];
  subs?: Sub[] | null;
  selectedSubId?: string | null;
  onSelectSub?: (id: string | null) => void;
  onEditSub?: (id: string, text: string) => void;
  onCaptionPosition?: (position: "top" | "center" | "bottom") => void;
  onTime: (assembled: number) => void;
  onCopyPosition?: (assembled: number) => void;
  audioMuted?: boolean;
  canvas: CanvasSize;
  onChangeCanvas?: (canvas: CanvasSize) => void;
  overlays: Overlay[];
  selectedOverlayId?: string | null;
  onSelectOverlay?: (id: string | null) => void;
  onBeginOverlay?: () => void;
  onOverlayLive?: (updater: (prev: Overlay[]) => Overlay[]) => void;
  onCommitOverlay?: () => void;
  onCancelOverlay?: () => void;
  onEditOverlayText?: (id: string, text: string) => void;
  onCanvasDetected?: (w: number, h: number) => void;
  captionStyle?: CaptionStyle;
  onRelinkMedia?: (id: string) => void;
}

const FRAME = 1 / 30;
const fmtT = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}.${String(Math.floor((s % 1) * 10))}`;
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const VideoPreview = forwardRef<PreviewHandle, Props>(function VideoPreview(props, ref) {
  const { media, clips, tracks, subs, selectedSubId, onSelectSub, onEditSub, onCaptionPosition, onTime, onCopyPosition, audioMuted, canvas, onChangeCanvas, overlays, selectedOverlayId, onSelectOverlay, onBeginOverlay, onOverlayLive, onCommitOverlay, onCancelOverlay, onEditOverlayText, onCanvasDetected, captionStyle, onRelinkMedia } = props;
  const mediaARef = useRef<HTMLVideoElement>(null);
  const mediaBRef = useRef<HTMLVideoElement>(null);
  const mediaRefs = [mediaARef, mediaBRef] as const;
  const extraAudioRef = useRef<HTMLAudioElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasBoxRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const videoRafRef = useRef<number | null>(null);
  const meterRafRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const meterSourcesRef = useRef<MediaElementAudioSourceNode[]>([]);
  const idx = useRef(0);
  const activeSlotRef = useRef<0 | 1>(0);
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0);
  const loaded = useRef<[string | null, string | null]>([null, null]);
  const prepared = useRef<{ slot: 0 | 1; index: number; sourceId: string; t: number } | null>(null);
  const extraLoaded = useRef<string | null>(null);
  const pending = useRef<Array<{ t: number; play: boolean } | null>>([null, null]);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [vol, setVol] = useState(1);
  const [speed, setSpeed] = useState<number>(1);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [activeKind, setActiveKind] = useState<"video" | "image" | "audio" | "gap" | "missing">("gap");
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState([0.12, 0.2, 0.16, 0.24, 0.14]);

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2, 0.5];
    const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    setSpeed(next);
    if (mediaARef.current) mediaARef.current.playbackRate = next;
    if (mediaBRef.current) mediaBRef.current.playbackRate = next;
    if (extraAudioRef.current) extraAudioRef.current.playbackRate = next;
  };

  const skipSeconds = (delta: number) => {
    seekTo(Math.max(0, Math.min(total, t + delta)));
  };

  const primaryId = tracks?.length ? primaryVideoTrackId(tracks) : "trk_video";
  const visualClips = useMemo(() => {
    if (!clips) {
      const asset = media.find((item) => item.kind === "video" || item.kind === "image");
      return asset ? [{ id: "preview-unplaced-visual", sourceId: asset.id, start: 0, end: Math.max(0.1, asset.duration || 5), trackId: primaryId }] : [];
    }
    if (!clips.length) return [];
    if (!tracks?.length) return clips.filter((c) => media.find((m) => m.id === c.sourceId)?.kind !== "audio");
    const visualIds = new Set(videoTracks(tracks).map((track) => track.id));
    const visuals = clips.filter((c) => visualIds.has(c.trackId || primaryId));
    return flattenVideoTracks(visuals, tracks);
  }, [clips, tracks, media, primaryId]);
  const audioClips = useMemo(() => {
    if (!clips) {
      const asset = media.find((item) => item.kind === "audio");
      return asset ? [{ id: "preview-unplaced-audio", sourceId: asset.id, start: 0, end: Math.max(0.1, asset.duration), trackId: "trk_audio" }] : [];
    }
    if (!clips.length || !tracks?.length) return [];
    const id = audioTrack(tracks)?.id;
    return id ? clipsOnTrack(clips, id, primaryId) : [];
  }, [clips, tracks, primaryId, media]);
  const visualDuration = totalDur(visualClips);
  const audioDuration = totalDur(audioClips);
  const total = Math.max(visualDuration, audioDuration);
  const edl = useMemo<Clip[]>(() => visualClips.length ? visualClips : total > 0
    ? [{ id: "preview-audio-canvas", sourceId: "__gap__", start: 0, end: total, trackId: primaryId }]
    : [], [visualClips, total, primaryId]);
  const byId = (id: string) => media.find((m) => m.id === id);
  const hasPlayable = total > 0 || media.length > 0;

  const activeClip = edl[idx.current] || null;
  const clipOffset = activeClip ? Math.max(0, t - assembledStart(edl, idx.current)) : 0;
  const visualFades = activeClip ? clipVisualFades(activeClip) : { fadeIn: 0, fadeOut: 0 };
  const activeVisualFactor = activeClip ? edgeFadeFactor(clipOffset, clipDur(activeClip), visualFades.fadeIn, visualFades.fadeOut) : 1;
  const activeOpacity = (activeClip ? clipOpacity(activeClip) : 1) * activeVisualFactor;
  // אותו resolver שמזין את הייצוא — כך התצוגה לא יכולה לסטות מהקובץ הסופי
  const activeFilter = activeClip ? clipLook(activeClip).css : "none";
  const activeTransform = `scaleX(${activeClip && clipFlipX(activeClip) ? -1 : 1}) scaleY(${activeClip && clipFlipY(activeClip) ? -1 : 1})`;

  const activeMedia = () => mediaRefs[activeSlotRef.current].current;
  const clearClock = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    if (videoRafRef.current != null) cancelAnimationFrame(videoRafRef.current);
    rafRef.current = null;
    videoRafRef.current = null;
  };
  const ensureAudioMeter = () => {
    if (typeof window === "undefined") return;
    if (!audioContextRef.current) {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.72;
      analyser.connect(ctx.destination);
      for (const el of [...mediaRefs.map((item) => item.current), extraAudioRef.current]) {
        if (!el) continue;
        const source = ctx.createMediaElementSource(el);
        source.connect(analyser);
        meterSourcesRef.current.push(source);
      }
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
    }
    if (audioContextRef.current.state === "suspended") void audioContextRef.current.resume();
  };
  const stopAudioMeter = () => {
    if (meterRafRef.current != null) cancelAnimationFrame(meterRafRef.current);
    meterRafRef.current = null;
    setAudioLevels([0.1, 0.14, 0.12, 0.16, 0.1]);
  };
  const startAudioMeter = () => {
    const analyser = analyserRef.current;
    if (!analyser || meterRafRef.current != null) return;
    const bins = new Uint8Array(analyser.frequencyBinCount);
    let lastPaint = 0;
    const tick = (now: number) => {
      analyser.getByteFrequencyData(bins);
      if (now - lastPaint > 55) {
        lastPaint = now;
        const band = Math.max(1, Math.floor(bins.length / 5));
        setAudioLevels(Array.from({ length: 5 }, (_, group) => {
          let total = 0;
          const start = group * band;
          const end = group === 4 ? bins.length : Math.min(bins.length, start + band);
          for (let i = start; i < end; i++) total += bins[i];
          return Math.max(0.08, Math.min(1, (total / Math.max(1, end - start)) / 150));
        }));
      }
      meterRafRef.current = requestAnimationFrame(tick);
    };
    meterRafRef.current = requestAnimationFrame(tick);
  };
  const syncExtraAudio = (assembled: number, shouldPlay: boolean) => {
    const el = extraAudioRef.current;
    if (!el || !audioClips.length) return;
    let at = 0;
    let found: Clip | null = null;
    for (const clip of audioClips) {
      const end = at + clipDur(clip);
      if (assembled >= at && assembled < end) { found = clip; break; }
      at = end;
    }
    if (!found || isGapClip(found) || !clipEnabled(found)) { el.pause(); return; }
    const asset = byId(found.sourceId);
    if (!asset || (asset.kind !== "audio" && asset.kind !== "video")) { el.pause(); return; }
    const sourceTime = found.start + Math.max(0, assembled - at);
    if (extraLoaded.current !== asset.id) { extraLoaded.current = asset.id; el.src = asset.url; el.load(); }
    if (Math.abs((el.currentTime || 0) - sourceTime) > 0.18) el.currentTime = sourceTime;
    const fades = clipAudioFades(found);
    const factor = audioFadeFactor(sourceTime - found.start, clipDur(found), fades.fadeIn, fades.fadeOut);
    el.volume = Math.min(1, previewAudioGain(vol, clipVolume(found), !!audioMuted, factor));
    if (shouldPlay && el.paused) void el.play().catch(() => undefined);
    if (!shouldPlay && !el.paused) el.pause();
  };
  const publishTime = (assembled: number, shouldPlay = playing) => {
    setT(assembled); onTime(assembled); syncExtraAudio(assembled, shouldPlay);
  };

  const runTimed = (index: number, from: number, play: boolean, kind: "gap" | "image" | "missing") => {
    clearClock(); activeMedia()?.pause(); idx.current = index; setActiveKind(kind);
    const clip = edl[index];
    const asset = kind === "image" ? byId(clip.sourceId) : null;
    setActiveImageUrl(asset?.url || null);
    const start = assembledStart(edl, index), end = start + clipDur(clip);
    let assembled = Math.max(start, Math.min(from, end));
    publishTime(assembled, play);
    if (!play) { setPlaying(false); return; }

    setPlaying(true);
    let last = performance.now();
    const tick = (now: number) => {
      assembled = Math.min(end, assembled + (now - last) / 1000); last = now;
      publishTime(assembled, true);
      if (assembled >= end - 0.001) { advanceFrom(index + 1, true); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  /**
   * חיתוך-לפי-סקריפט ועריכה מייצרים עשרות קליפים מאותו מקור.
   * עבור אותו מקור וידאו, דילוג ישיר במקום (in-place seek) על האלמנט שכבר טעון
   * מהיר ב-100% וחוסך כל תקיעה, הבהוב או טעינה מחדש של הקובץ.
   */
  const sameSourceForward = (currentIndex: number, nextIndex: number): boolean => {
    const current = edl[currentIndex];
    const next = edl[nextIndex];
    if (!current || !next || current.sourceId !== next.sourceId) return false;
    if (isGapClip(current) || isGapClip(next)) return false;
    const asset = byId(next.sourceId);
    return !!(asset && asset.kind === "video");
  };

  const prepareNext = (fromIndex: number) => {
    let nextIndex = fromIndex;
    while (nextIndex < edl.length && !clipEnabled(edl[nextIndex])) nextIndex++;
    const clip = edl[nextIndex];
    const asset = clip ? byId(clip.sourceId) : null;
    if (!clip || !asset || asset.missing || (asset.kind !== "video" && asset.kind !== "audio") || isGapClip(clip)) {
      prepared.current = null;
      return;
    }
    if (sameSourceForward(idx.current, nextIndex)) { prepared.current = null; return; }
    const slot = (activeSlotRef.current === 0 ? 1 : 0) as 0 | 1;
    const el = mediaRefs[slot].current;
    if (!el) return;
    const target = clip.start;
    prepared.current = { slot, index: nextIndex, sourceId: asset.id, t: target };
    el.muted = true;
    pending.current[slot] = { t: target, play: false };
    if (loaded.current[slot] !== asset.id) {
      loaded.current[slot] = asset.id;
      el.src = asset.url;
      el.load();
    } else {
      el.currentTime = target;
    }
  };

  const ensureMedia = (sourceId: string, sourceTime: number, play: boolean) => {
    const slot = activeSlotRef.current;
    const el = mediaRefs[slot].current, asset = byId(sourceId);
    if (!el || !asset || asset.missing || (asset.kind !== "video" && asset.kind !== "audio")) return;
    clearClock(); setActiveImageUrl(null); setActiveKind(asset.kind);
    el.muted = false;
    if (loaded.current[slot] === sourceId) {
      el.currentTime = sourceTime;
      if (play) void el.play(); else el.pause();
      setPlaying(play); syncExtraAudio(t, play); prepareNext(idx.current + 1); return;
    }
    loaded.current[slot] = sourceId; pending.current[slot] = { t: sourceTime, play }; el.src = asset.url; el.load();
  };

  const advanceFrom = (index: number, play: boolean) => {
    let i = index;
    while (i < edl.length && !clipEnabled(edl[i])) i++;
    const previousIndex = idx.current;
    idx.current = i;
    if (i >= edl.length) { clearClock(); activeMedia()?.pause(); extraAudioRef.current?.pause(); setPlaying(false); publishTime(total, false); return; }
    const clip = edl[i], asset = byId(clip.sourceId), from = assembledStart(edl, i);
    if (!clip || isGapClip(clip)) runTimed(i, from, play, "gap");
    else if (!asset || asset.missing) runTimed(i, from, play, "missing");
    else if (asset.kind === "image") runTimed(i, from, play, "image");
    else {
      // אותו מקור — דילוג מיידי במקום (0ms latency), בלי החלפת אלמנט ובלי טעינה מחדש
      const inPlace = mediaRefs[activeSlotRef.current].current;
      if (inPlace && loaded.current[activeSlotRef.current] === clip.sourceId) {
        setActiveImageUrl(null);
        setActiveKind(asset.kind);
        inPlace.muted = false;
        if (Math.abs(inPlace.currentTime - clip.start) > 0.008) {
          if ("fastSeek" in inPlace && typeof (inPlace as any).fastSeek === "function") {
            try { (inPlace as any).fastSeek(clip.start); } catch { inPlace.currentTime = clip.start; }
          } else {
            inPlace.currentTime = clip.start;
          }
        }
        publishTime(from, play);
        if (play && inPlace.paused) {
          void inPlace.play().catch(() => undefined);
        }
        startVideoClock(activeSlotRef.current);
        prepareNext(i + 1);
        return;
      }
      const ready = prepared.current;
      const preloaded = ready && ready.index === i && ready.sourceId === clip.sourceId
        ? mediaRefs[ready.slot].current : null;
      if (preloaded && preloaded.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const old = activeMedia();
        old?.pause();
        if (old) old.muted = true;
        activeSlotRef.current = ready!.slot;
        setActiveSlot(ready!.slot);
        preloaded.muted = false;
        idx.current = i;
        setActiveImageUrl(null);
        setActiveKind(asset.kind);
        publishTime(from, play);
        if (play) void preloaded.play().catch(() => undefined); else preloaded.pause();
        prepared.current = null;
        prepareNext(i + 1);
      } else ensureMedia(clip.sourceId, clip.start, play);
    }
  };

  const seekTo = (assembled: number) => {
    const next = Math.max(0, Math.min(total, assembled)); clearClock(); setPlaying(false); activeMedia()?.pause();
    if (!edl.length) {
      extraAudioRef.current?.pause();
      idx.current = 0;
      setActiveImageUrl(null);
      setActiveKind("gap");
      publishTime(0, false);
      return;
    }
    const { index, source } = assembledToSource(edl, Math.min(next, Math.max(0, total - 0.0001)));
    idx.current = Math.max(0, index);
    const clip = edl[idx.current], asset = clip ? byId(clip.sourceId) : null;
    if (!clip || isGapClip(clip)) runTimed(idx.current, next, false, "gap");
    else if (!asset || asset.missing) runTimed(idx.current, next, false, "missing");
    else if (asset.kind === "image") runTimed(idx.current, next, false, "image");
    else ensureMedia(clip.sourceId, source, false);
    publishTime(next, false);
  };

  const toggle = () => {
    if (!edl.length) return;
    ensureAudioMeter();
    if (playing) { clearClock(); activeMedia()?.pause(); extraAudioRef.current?.pause(); setPlaying(false); return; }
    if (t >= total - 0.001) { idx.current = 0; advanceFrom(0, true); return; }
    const clip = edl[idx.current], start = assembledStart(edl, idx.current), asset = byId(clip?.sourceId || "");
    if (!clip || isGapClip(clip)) runTimed(idx.current, Math.max(start, t), true, "gap");
    else if (!asset || asset.missing) runTimed(idx.current, Math.max(start, t), true, "missing");
    else if (asset.kind === "image") runTimed(idx.current, Math.max(start, t), true, "image");
    else ensureMedia(clip.sourceId, clip.start + Math.max(0, t - start), true);
  };
  useImperativeHandle(ref, () => ({ seek: seekTo, toggle }));

  useEffect(() => () => {
    clearClock();
    if (meterRafRef.current != null) cancelAnimationFrame(meterRafRef.current);
    meterSourcesRef.current.forEach((source) => source.disconnect());
    analyserRef.current?.disconnect();
    void audioContextRef.current?.close();
  }, []);
  useEffect(() => { if (playing) startAudioMeter(); else stopAudioMeter(); }, [playing]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName?.toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggle, edl.length, playing, t, total]);

  useEffect(() => {
    const el = stageRef.current; if (!el) return;
    const measure = () => setStageSize({ w: el.clientWidth, h: el.clientHeight }); measure();
    const ro = new ResizeObserver(measure); ro.observe(el); return () => ro.disconnect();
  }, []);
  // הניגון נעצר רק כשהתוכן באמת השתנה. קודם התלה כאן ב-*זהות* המערך, ולכן
  // כל רינדור מחדש של ההורה (שינוי state, הודעה בצ'אט, resize) בנה edl חדש
  // עם אותו תוכן, הריץ seekTo, ועצר את הניגון באמצע. זה ה"נתקע" שנראה אקראי.
  const edlSignature = useMemo(
    () => edl.map((c) => `${c.sourceId}@${c.start.toFixed(3)}-${c.end.toFixed(3)}${clipEnabled(c) ? "" : "x"}`).join("|"),
    [edl],
  );
  const audioSignature = useMemo(
    () => audioClips.map((c) => `${c.sourceId}@${c.start.toFixed(3)}-${c.end.toFixed(3)}`).join("|"),
    [audioClips],
  );
  useEffect(() => { seekTo(Math.min(t, total)); }, [edlSignature, audioSignature]);
  useEffect(() => {
    const el = activeMedia();
    const clip = edl[idx.current];
    if (el && clip) {
      const fades = clipAudioFades(clip);
      const offset = Math.max(0, t - assembledStart(edl, idx.current));
      el.volume = Math.min(1, previewAudioGain(vol, clipVolume(clip), !!audioMuted, audioFadeFactor(offset, clipDur(clip), fades.fadeIn, fades.fadeOut)));
    }
    syncExtraAudio(t, playing);
  }, [vol, audioMuted, activeSlot]);

  const onLoaded = (slot: 0 | 1) => {
    const el = mediaRefs[slot].current, p = pending.current[slot];
    if (!el) return;
    if (slot === activeSlotRef.current && el.videoWidth && el.videoHeight) onCanvasDetected?.(el.videoWidth, el.videoHeight);
    if (p) {
      el.currentTime = p.t;
      if (p.play) void el.play(); else el.pause();
      if (slot === activeSlotRef.current) setPlaying(p.play);
      pending.current[slot] = null;
      if (slot === activeSlotRef.current) prepareNext(idx.current + 1);
    }
  };
  const syncVideoTime = (slot: 0 | 1) => {
    if (slot !== activeSlotRef.current) return;
    const el = mediaRefs[slot].current, clip = edl[idx.current]; if (!el || !clip || activeKind === "gap" || activeKind === "image") return;
    if (el.currentTime >= clip.end - FRAME / 2) { advanceFrom(idx.current + 1, true); return; }
    const assembled = assembledStart(edl, idx.current) + Math.max(0, Math.min(clipDur(clip), el.currentTime - clip.start));
    const fades = clipAudioFades(clip);
    el.volume = Math.min(1, previewAudioGain(vol, clipVolume(clip), !!audioMuted, audioFadeFactor(el.currentTime - clip.start, clipDur(clip), fades.fadeIn, fades.fadeOut)));
    publishTime(assembled, true);
  };
  const startVideoClock = (slot: 0 | 1) => {
    if (slot !== activeSlotRef.current) return;
    if (videoRafRef.current != null) cancelAnimationFrame(videoRafRef.current);
    const tick = () => {
      if (slot !== activeSlotRef.current || mediaRefs[slot].current?.paused) { videoRafRef.current = null; return; }
      syncVideoTime(slot);
      videoRafRef.current = requestAnimationFrame(tick);
    };
    videoRafRef.current = requestAnimationFrame(tick);
  };
  const step = (dir: -1 | 1) => { if (playing) toggle(); seekTo(t + dir * FRAME); };
  const box = displayRect(stageSize.w, stageSize.h, canvas);
  const quotePlace = () => onCopyPosition?.(t);
  const capture = () => {
    const el = activeMedia(); if (!el || activeKind !== "video" || !el.videoWidth) return;
    const c = document.createElement("canvas"); c.width = el.videoWidth; c.height = el.videoHeight;
    c.getContext("2d")?.drawImage(el, 0, 0); c.toBlob((b) => b && download(b, `frame_${t.toFixed(1)}s.png`), "image/png");
  };
  const fullscreen = () => { const el = stageRef.current; if (!el) return; if (document.fullscreenElement) void document.exitFullscreen(); else void el.requestFullscreen?.(); };
  const activeCues = (subs || []).filter((s) => t >= s.start - 0.01 && t < s.end + 0.001);
  const cue = activeCues.find((s) => s.id === selectedSubId) || activeCues[activeCues.length - 1] || null;
  const st = captionStyle || DEFAULT_CAPTION_STYLE;
  const startCaptionDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    const move = (event: PointerEvent) => {
      const rect = canvasBoxRef.current?.getBoundingClientRect(); if (!rect) return;
      const ratio = (event.clientY - rect.top) / rect.height;
      onCaptionPosition?.(ratio < 0.34 ? "top" : ratio < 0.67 ? "center" : "bottom");
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  const menuItems: CtxItem[] = [
    { label: "צלם פריים נוכחי", icon: Camera, onClick: capture, disabled: activeKind !== "video" },
    { label: "ציטוט מקום לתיבת ההודעה", icon: MapPin, onClick: quotePlace, disabled: !hasPlayable },
  ];

  return <div className="preview2">
    <div className="pv-stage" ref={stageRef} onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }); }}>
      {hasPlayable ? <div className="pv-canvas" ref={canvasBoxRef} style={{ width: box.width || "100%", height: box.height || "100%" }}>
        {([0, 1] as const).map((slot) => <video key={slot} ref={mediaRefs[slot]} preload="auto" playsInline crossOrigin="anonymous"
          onTimeUpdate={() => syncVideoTime(slot)} onLoadedData={() => onLoaded(slot)} onDurationChange={() => onLoaded(slot)}
          onPlay={() => { if (slot !== activeSlotRef.current) return; setPlaying(true); syncExtraAudio(t, true); startVideoClock(slot); }}
          onPause={() => { if (slot === activeSlotRef.current) setPlaying(false); }}
          onClick={() => { onSelectOverlay?.(null); onSelectSub?.(null); toggle(); }}
          style={{ visibility: activeKind === "video" && activeSlot === slot ? "visible" : "hidden", opacity: activeOpacity, filter: activeFilter, transform: activeTransform }} />)}
        <audio ref={extraAudioRef} onEnded={() => syncExtraAudio(t, playing)} />
        {activeKind === "image" && activeImageUrl && <img className="pv-still" src={activeImageUrl} alt="תמונה בציר הזמן" style={{ opacity: activeOpacity, filter: activeFilter, transform: activeTransform }} />}
        {activeKind === "missing" && (
          <div className="pv-missing-overlay">
            <TriangleAlert size={36} color="#f59e0b" strokeWidth={1.75} />
            <span className="pv-missing-title">קובץ המקור טרם סונכרן למכשיר זה</span>
            <span className="pv-missing-sub">הקובץ נשמר מקומית במחשב שבו נוצר או ממתין לסיום סנכרון ענן (R2).</span>
            {onRelinkMedia && edl[idx.current]?.sourceId && (
              <button
                type="button"
                className="btn primary sm"
                style={{ marginTop: "8px", pointerEvents: "auto" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onRelinkMedia(edl[idx.current].sourceId);
                }}
              >
                בחר קובץ לקישור (Relink)
              </button>
            )}
          </div>
        )}
        {activeKind === "gap" && <div className="pv-gap" aria-hidden />}
        {cue && <div className={`pv-caption ${cue.id === selectedSubId ? "selected" : ""}`} style={captionStyleToCss(st)}
          contentEditable={cue.id === selectedSubId} suppressContentEditableWarning
          onClick={(e) => { e.stopPropagation(); onSelectSub?.(cue.id); }} onPointerDown={startCaptionDrag}
          onBlur={(e) => onEditSub?.(cue.id, e.currentTarget.textContent?.trim() || cue.text)}>{cue.text}</div>}
        {activeCues.length > 1 && <button className="pv-caption-overlap" onClick={() => onSelectSub?.(activeCues[0].id)} data-tip="יש כתוביות חופפות בזמן הזה">{activeCues.length} כתוביות חופפות</button>}
        <PreviewOverlays boxRef={canvasBoxRef} canvas={canvas} overlays={overlays} media={media} currentTime={t}
          selectedId={selectedOverlayId ?? null} onSelect={(id) => onSelectOverlay?.(id)} onBegin={() => onBeginOverlay?.()}
          onLive={(u) => onOverlayLive?.(u)} onCommit={() => onCommitOverlay?.()} onCancel={() => onCancelOverlay?.()}
          onEditText={(id, text) => onEditOverlayText?.(id, text)} />

        {(selectedOverlayId || selectedSubId) && (
          <div className="canvas-quick-bar" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <span className="btn ghost" style={{ cursor: "default", opacity: 0.8, fontSize: "11px" }}>
              {selectedOverlayId ? "שכבה נבחרת" : "כתובית נבחרת"}
            </span>
            <div className="vdivider" style={{ height: "14px" }} />
            {selectedOverlayId && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => onSelectOverlay?.(null)}
              >
                סגור בחירה
              </button>
            )}
            {selectedSubId && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => onSelectSub?.(null)}
              >
                סגור בחירה
              </button>
            )}
          </div>
        )}
      </div> : <div className="pv-empty"><Film size={40} strokeWidth={1.25} /><span>טען מדיה כדי לראות תצוגה מקדימה</span></div>}
    </div>
    <div className="pv-scrubber-wrap" dir="ltr">
      <div
        className="pv-scrubber"
        onPointerDown={(e) => {
          if (!hasPlayable || total <= 0) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          seekTo(pct * total);
          const onPointerMove = (ev: PointerEvent) => {
            const p = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
            seekTo(p * total);
          };
          const onPointerUp = () => {
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
          };
          window.addEventListener("pointermove", onPointerMove);
          window.addEventListener("pointerup", onPointerUp);
        }}
        role="slider"
        aria-label="פס התקדמות"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={t}
      >
        <div className="pv-scrubber-track">
          <div className="pv-scrubber-fill" style={{ width: `${total > 0 ? (Math.min(t, total) / total) * 100 : 0}%` }} />
          <div className="pv-scrubber-thumb" style={{ left: `${total > 0 ? (Math.min(t, total) / total) * 100 : 0}%` }} />
        </div>
      </div>
    </div>
    <div className="transport" dir="ltr">
      <div className="tp-left">
        <div className="tp-vol">
          <IconButton icon={vol === 0 ? VolumeX : Volume2} tip={vol === 0 ? "בטל השתקה" : "עוצמה"} tipPos="up" onClick={() => setVol((v) => v === 0 ? 1 : 0)} disabled={!hasPlayable} />
          <input type="range" min={0} max={1} step={0.05} value={vol} aria-label="עוצמת שמע בתצוגה המקדימה" title="עוצמת שמע בתצוגה המקדימה" onChange={(e) => setVol(+e.target.value)} disabled={!hasPlayable} />
        </div>
        <button type="button" className="tp-speed-btn" onClick={cycleSpeed} data-tip="מהירות ניגון" data-tippos="up" disabled={!hasPlayable}>
          {speed}x
        </button>
        {canvas && onChangeCanvas && (
          <div className="tp-ratio-wrap">
            <AspectRatioPicker currentCanvas={canvas} onChangeCanvas={onChangeCanvas} />
          </div>
        )}
      </div>

      <div className="tp-center">
        <IconButton className="tp-rotate-btn" icon={RotateCcw} tip="15 שניות אחורה" tipPos="up" onClick={() => skipSeconds(-15)} disabled={!hasPlayable} />
        <IconButton icon={SkipBack} tip="פריים אחורה" tipPos="up" onClick={() => step(-1)} disabled={!hasPlayable} />
        <button className="tp-play" onClick={toggle} disabled={!hasPlayable} data-tip={playing ? "השהה (Space)" : "נגן (Space)"} data-tippos="up">{playing ? <Pause size={18} /> : <Play size={18} />}</button>
        <IconButton icon={SkipForward} tip="פריים קדימה" tipPos="up" onClick={() => step(1)} disabled={!hasPlayable} />
        <IconButton className="tp-rotate-btn" icon={RotateCw} tip="15 שניות קדימה" tipPos="up" onClick={() => skipSeconds(15)} disabled={!hasPlayable} />
        <span className="tp-time">
          <span className={`audio-eq-bars ${playing ? "is-playing" : "is-idle"}`} title="עוצמת השמע בזמן אמת">
            {audioLevels.map((level, index) => <i key={index} style={{ "--level": playing ? `${Math.round(level * 100)}%` : "15%" } as CSSProperties} />)}
          </span>
          <span className="cur">{fmtT(Math.min(t, total))}</span>
          <span className="sep">/</span>
          <span className="total">{fmtT(total)}</span>
        </span>
      </div>

      <div className="tp-right">
        <IconButton icon={MapPin} tip="ציטוט מקום — הכנס זמן לתיבת ההודעה" tipPos="up" onClick={quotePlace} disabled={!hasPlayable} />
        <IconButton icon={MoreHorizontal} tip="עוד" tipPos="up" disabled={!hasPlayable} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMenu({ x: r.left, y: r.top - 8 }); }} />
        <IconButton icon={Maximize} tip="מסך מלא" tipPos="up" onClick={fullscreen} disabled={!hasPlayable} />
      </div>
    </div>
    {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}
  </div>;
});

export default VideoPreview;
