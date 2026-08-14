// Register built-in editor commands used by UI + Agent.
import { addClip, assembledToSource, clipAudioFades, clipDur, clipVisualFades, splitClip, trimClip, uid, type Clip } from "./model";
import type { Sub } from "./subtitlesEdl";
import { clampOverlayTransform, imageOverlayGeometry, makeImageOverlay, makeTextOverlay, makeTitlePopup, type ImageOverlayPreset, type TitlePopupPreset } from "./overlay";
import { closeGap, isGapClip, removeClipLeaveGap, removeClipRipple, rollAtBoundary, slipClip } from "./timelineOps";
import { normalizeCaptionStyle } from "./captionStyle";
import { audioTrack, createVideoTrack, primaryVideoTrackId, removeVideoTrackMeta } from "./project";
import { clipTrackId, clipsOnTrack, insertClipAtTimeline, moveClipAtTimeline, moveClipOnTrack, replaceTrackClips } from "./tracks";
import { registerCommand } from "./commands";
import { effectById } from "@/lib/creative/effects";

let registered = false;

export function ensureBuiltinCommands() {
  if (registered) return;
  registered = true;

  registerCommand({
    id: "clip.delete.ripple",
    label: "Delete clip (ripple)",
    labelHe: "מחק קטע (ריפל)",
    contexts: ["editor", "shortcut", "context-menu"],
    presentation: { target: "clip", icon: "trash", order: 60, danger: true, shortcut: "Delete", disableWhenVideoLocked: true, labelHe: () => "מחק" },
    run: (api, args) => {
      const id = String(args?.id || "");
      const clips = api.getClips();
      if (!clips || !id) throw new Error("אין קטע למחיקה");
      api.setClips(removeClipRipple(clips, id));
      api.selectClip(null);
    },
  });

  registerCommand({
    id: "clip.delete.leaveGap",
    label: "Delete clip (leave gap)",
    labelHe: "מחק קטע והשאר רווח",
    contexts: ["editor", "shortcut", "context-menu"],
    presentation: { target: "clip", icon: "square-dashed", order: 50, shortcut: "Shift+Delete", separatorBefore: true, disableWhenVideoLocked: true },
    run: (api, args) => {
      const id = String(args?.id || "");
      const clips = api.getClips();
      if (!clips || !id) throw new Error("אין קטע למחיקה");
      api.setClips(removeClipLeaveGap(clips, id));
      api.selectClip(null);
    },
  });

  registerCommand({
    id: "gap.close",
    label: "Close gap",
    labelHe: "סגור רווח",
    contexts: ["editor", "shortcut", "context-menu"],
    presentation: { target: "gap", icon: "square-dashed", order: 10, disableWhenVideoLocked: true },
    run: (api, args) => {
      const id = String(args?.id || "");
      const clips = api.getClips();
      if (!clips || !id) throw new Error("אין רווח");
      const c = clips.find((x) => x.id === id);
      if (!c || !isGapClip(c)) throw new Error("הבחירה אינה רווח");
      api.setClips(closeGap(clips, id));
      api.selectClip(null);
    },
  });

  registerCommand({
    id: "clip.splitAtPlayhead",
    label: "Split at playhead",
    labelHe: "פצל בראש-הנגן",
    contexts: ["editor", "shortcut", "context-menu"],
    presentation: { target: "clip", icon: "scissors", order: 20, disableWhenVideoLocked: true },
    run: (api) => {
      const clips = api.getClips();
      if (!clips?.length) throw new Error("אין קליפים");
      const { index, source } = assembledToSource(clips, api.getPlayhead());
      if (index < 0) return;
      const c = clips[index];
      if (isGapClip(c)) throw new Error("לא ניתן לפצל רווח — אפשר לחתוך את משכו");
      api.setClips(splitClip(clips, c.id, source));
    },
  });

  registerCommand({
    id: "overlay.delete",
    label: "Delete overlay",
    labelHe: "מחק שכבה",
    contexts: ["editor", "agent", "shortcut", "context-menu"],
    presentation: { target: "overlay", icon: "trash", order: 60, danger: true, shortcut: "Delete" },
    run: (api, args) => {
      const id = String(args?.id || "");
      if (!id) throw new Error("אין שכבה");
      api.removeOverlay(id);
      api.selectOverlay(null);
    },
  });

  registerCommand({
    id: "overlay.addText",
    label: "Add text overlay",
    labelHe: "הוסף טקסט",
    contexts: ["editor", "agent", "shortcut"],
    presentation: { target: "any", icon: "type", order: 80 },
    run: (api, args) => {
      const text = String(args?.text || "טקסט חדש");
      const canvas = api.getCanvas();
      const cur = args?.start != null ? Math.max(0, Number(args.start)) : api.getPlayhead();
      const clips = api.getClips();
      const fallbackEnd = Math.max(cur + 4, clips ? clips.reduce((s, c) => s + clipDur(c), 0) : 4);
      const end = args?.end != null ? Math.max(cur + 0.05, Number(args.end)) : fallbackEnd;
      const preset = String(args?.preset || "plain");
      const isPopup = preset === "source_popup" || preset === "speaker_card" || preset === "dedication_card";
      const o = isPopup
        ? makeTitlePopup(canvas.width, canvas.height, api.getOverlays(), text, cur, end, preset as TitlePopupPreset)
        : makeTextOverlay(canvas.width, canvas.height, api.getOverlays(), text, cur, end);
      api.addOverlay(o);
      api.selectOverlay(o.id);
    },
  });

  registerCommand({
    id: "overlay.addImage",
    label: "Add image overlay",
    labelHe: "הוסף תמונה",
    contexts: ["editor", "agent"],
    presentation: { target: "asset", icon: "layers", order: 20 },
    run: (api, args) => {
      const assetId = String(args?.assetId || "");
      const asset = api.getMedia().find((item) => item.id === assetId);
      if (!asset || asset.kind !== "image") throw new Error("קובץ תמונה לא נמצא");
      const start = args?.start != null ? Math.max(0, Number(args.start)) : api.getPlayhead();
      const end = args?.end != null ? Math.max(start + 0.05, Number(args.end)) : start + 4;
      const width = Number(args?.width), height = Number(args?.height);
      const intrinsic = Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0
        ? { width, height }
        : undefined;
      const canvas = api.getCanvas();
      const base = makeImageOverlay(assetId, canvas.width, canvas.height, api.getOverlays(), start, end, intrinsic);
      const rawPreset = String(args?.preset || "center");
      const preset: ImageOverlayPreset = rawPreset === "fit_canvas" || rawPreset === "logo_top_left" || rawPreset === "logo_top_right" ? rawPreset : "center";
      const geometry = imageOverlayGeometry(canvas.width, canvas.height, intrinsic, preset, {
        ...(Number.isFinite(Number(args?.x)) ? { x: Number(args?.x) } : {}),
        ...(Number.isFinite(Number(args?.y)) ? { y: Number(args?.y) } : {}),
        ...(Number.isFinite(Number(args?.w)) ? { w: Number(args?.w) } : {}),
        ...(Number.isFinite(Number(args?.h)) ? { h: Number(args?.h) } : {}),
        ...(Number.isFinite(Number(args?.opacity)) ? { opacity: Number(args?.opacity) } : {}),
      });
      const overlay = {
        ...base,
        ...(String(args?.overlayId || "").trim() ? { id: String(args?.overlayId).trim() } : {}),
        borderRadius: Number.isFinite(Number(args?.borderRadius)) ? Math.max(0, Number(args?.borderRadius)) : base.borderRadius,
        fadeIn: Number.isFinite(Number(args?.fadeIn)) ? Math.max(0, Math.min((end - start) / 2, Number(args?.fadeIn))) : base.fadeIn,
        fadeOut: Number.isFinite(Number(args?.fadeOut)) ? Math.max(0, Math.min((end - start) / 2, Number(args?.fadeOut))) : base.fadeOut,
        locked: args?.locked === true,
        transform: geometry,
      };
      api.addOverlay(overlay);
      api.selectOverlay(overlay.id);
      if (api.getPlayhead() < overlay.start || api.getPlayhead() > overlay.end) api.seek(overlay.start);
    },
  });

  registerCommand({
    id: "clip.detachAudio",
    label: "Detach audio",
    labelHe: "הפרד וידאו ואודיו",
    contexts: ["editor", "context-menu"],
    presentation: {
      target: "clip", icon: "volume", order: 25, separatorBefore: true, disableWhenVideoLocked: true,
      isVisible: (api, args) => {
        const clip = api.getClips()?.find((item) => item.id === String(args.id || ""));
        return !!clip && api.getMedia().find((asset) => asset.id === clip.sourceId)?.kind === "video" && clip.volume !== 0;
      },
    },
    run: (api, args) => {
      const id = String(args?.id || "");
      const clips = api.getClips();
      if (!clips) throw new Error("אין קליפים");
      const clip = clips.find((item) => item.id === id);
      const asset = clip && api.getMedia().find((item) => item.id === clip.sourceId);
      if (!clip || asset?.kind !== "video" || isGapClip(clip)) throw new Error("יש לבחור קליפ וידאו");
      const tracks = api.getTracks();
      const primary = primaryVideoTrackId(tracks);
      const audioId = audioTrack(tracks)?.id;
      if (!audioId) throw new Error("רצועת אודיו לא נמצאה");
      const sourceTrack = clipTrackId(clip, primary);
      const sourceClips = clipsOnTrack(clips, sourceTrack, primary);
      const sourceIndex = sourceClips.findIndex((item) => item.id === id);
      const timelineStart = sourceClips.slice(0, Math.max(0, sourceIndex)).reduce((sum, item) => sum + clipDur(item), 0);
      const audioClip: Clip = { ...clip, id: uid("a"), trackId: audioId, volume: clip.volume ?? 1, visualFadeIn: undefined, visualFadeOut: undefined };
      const audioClips = clipsOnTrack(clips, audioId, primary);
      const placedAudio = insertClipAtTimeline(audioClips, audioClip, timelineStart, audioId);
      const mutedVisual = clips.map((item) => item.id === id ? { ...item, volume: 0 } : item);
      api.setClips(replaceTrackClips(mutedVisual, audioId, placedAudio, primary));
      api.selectClip(audioClip.id);
      api.seek(timelineStart);
    },
  });

  registerCommand({
    id: "clip.setEnabled",
    label: "Set clip enabled",
    labelHe: "הפעל/השבת קטע",
    contexts: ["editor", "agent", "shortcut", "context-menu"],
    presentation: { target: "clip", icon: "eye", order: 30, labelHe: (_api, args) => args.enabled ? "הפעל" : "השבת" },
    run: (api, args) => {
      const id = String(args?.id || "");
      if (!id) throw new Error("חסר id");
      api.updateClip(id, { enabled: !!args?.enabled });
    },
  });

  registerCommand({
    id: "clip.setVolume",
    label: "Set clip volume",
    labelHe: "עוצמת קטע",
    run: (api, args) => {
      const id = String(args?.id || "");
      const volume = Number(args?.volume);
      if (!id || !Number.isFinite(volume)) throw new Error("חסרים פרמטרים");
      api.updateClip(id, { volume: Math.max(0, Math.min(2, volume)) });
    },
  });

  registerCommand({
    id: "clip.duplicate",
    label: "Duplicate clip",
    labelHe: "שכפל קטע",
    contexts: ["editor", "shortcut", "context-menu"],
    presentation: { target: "clip", icon: "copy", order: 10, disableWhenVideoLocked: true, labelHe: () => "שכפל" },
    run: (api, args) => {
      const id = String(args?.id || "");
      const clips = api.getClips();
      if (!clips || !id) throw new Error("אין קטע");
      const i = clips.findIndex((c) => c.id === id);
      if (i < 0) throw new Error("קטע לא נמצא");
      const copy = { ...clips[i], id: uid() };
      api.setClips([...clips.slice(0, i + 1), copy, ...clips.slice(i + 1)]);
    },
  });

  registerCommand({
    id: "caption.setStyle",
    label: "Set caption style",
    labelHe: "סגנון כתוביות",
    run: (api, args) => {
      if (!api.getCaptionStyle || !api.setCaptionStyle) throw new Error("סגנון כתוביות לא זמין");
      const cur = api.getCaptionStyle();
      api.setCaptionStyle(normalizeCaptionStyle({ ...cur, ...(args || {}) }));
    },
  });

  registerCommand({
    id: "clip.roll",
    label: "Roll edit",
    labelHe: "גלגול חיתוך (Roll)",
    run: (api, args) => {
      const clips = api.getClips();
      if (!clips?.length) throw new Error("אין קליפים");
      const delta = Number(args?.delta);
      if (!Number.isFinite(delta) || delta === 0) throw new Error("חסר delta");
      let leftIndex = typeof args?.leftIndex === "number" ? args.leftIndex : -1;
      if (leftIndex < 0) {
        const id = String(args?.id || "");
        const i = clips.findIndex((c) => c.id === id);
        if (i < 0) throw new Error("אין קטע לגלגול");
        // Prefer rolling with the next clip; if last, roll with previous.
        leftIndex = i < clips.length - 1 ? i : i - 1;
      }
      if (leftIndex < 0 || leftIndex >= clips.length - 1) throw new Error("אין זוג קטעים לגלגול");
      const maxDur = (sid: string) => api.getMediaDuration?.(sid) ?? Number.POSITIVE_INFINITY;
      api.setClips(rollAtBoundary(clips, leftIndex, delta, maxDur));
    },
  });

  registerCommand({
    id: "clip.slip",
    label: "Slip clip",
    labelHe: "החלקת מקור (Slip)",
    run: (api, args) => {
      const id = String(args?.id || "");
      const delta = Number(args?.delta);
      const clips = api.getClips();
      if (!clips || !id) throw new Error("אין קטע");
      if (!Number.isFinite(delta) || delta === 0) throw new Error("חסר delta");
      const c = clips.find((x) => x.id === id);
      if (!c) throw new Error("קטע לא נמצא");
      if (isGapClip(c)) throw new Error("לא ניתן להחליק רווח");
      const max = api.getMediaDuration?.(c.sourceId) ?? c.end;
      api.setClips(slipClip(clips, id, delta, max));
    },
  });

  registerCommand({
    id: "clip.split",
    label: "Split clip at source time",
    labelHe: "פצל קליפ",
    run: (api, args) => {
      const id = String(args?.id || "");
      const at = Number(args?.at_source);
      const clips = api.getClips();
      if (!clips || !id) throw new Error("אין קטע");
      if (!Number.isFinite(at)) throw new Error("חסר at_source");
      const c = clips.find((x) => x.id === id);
      if (!c) throw new Error("קטע לא נמצא");
      if (isGapClip(c)) throw new Error("לא ניתן לפצל רווח");
      api.setClips(splitClip(clips, id, at));
    },
  });

  registerCommand({
    id: "clip.trim",
    label: "Trim clip",
    labelHe: "טרים קליפ",
    run: (api, args) => {
      const id = String(args?.id || "");
      const clips = api.getClips();
      if (!clips || !id) throw new Error("אין קטע");
      const c = clips.find((x) => x.id === id);
      if (!c) throw new Error("קטע לא נמצא");
      const start = args?.start != null && args.start !== "" ? Number(args.start) : c.start;
      const end = args?.end != null && args.end !== "" ? Number(args.end) : c.end;
      const max = api.getMediaDuration?.(c.sourceId) ?? c.end;
      api.setClips(trimClip(clips, id, start, end, max));
    },
  });

  registerCommand({
    id: "clip.move",
    label: "Move clip in track sequence",
    labelHe: "הזז קליפ",
    run: (api, args) => {
      const id = String(args?.id || "");
      const toIndex = Number(args?.to_index);
      const clips = api.getClips();
      if (!clips || !id) throw new Error("אין קטע");
      if (!Number.isFinite(toIndex)) throw new Error("חסר to_index");
      const primary = primaryVideoTrackId(api.getTracks());
      const c = clips.find((x) => x.id === id);
      if (!c) throw new Error("קטע לא נמצא");
      // to_index is 0-based within the clip's track
      api.setClips(moveClipOnTrack(clips, id, toIndex, primary));
    },
  });

  registerCommand({
    id: "clip.add",
    label: "Add clip",
    labelHe: "הוסף קליפ",
    run: (api, args) => {
      const sourceId = String(args?.sourceId || "");
      if (!sourceId) throw new Error("חסר sourceId");
      const media = api.getMedia().find((m) => m.id === sourceId);
      if (!media) throw new Error("מקור לא נמצא");
      const tracks = api.getTracks();
      const primary = primaryVideoTrackId(tracks);
      const defaultTrack = media.kind === "audio"
        ? (tracks.find((track) => track.type === "audio")?.id || "trk_audio")
        : primary;
      const trackId = String(args?.trackId || defaultTrack);
      const expectedType = media.kind === "audio" ? "audio" : "video";
      if (!tracks.some((t) => t.id === trackId && t.type === expectedType)) {
        throw new Error(expectedType === "audio" ? "רצועת אודיו לא נמצאה" : "רצועת וידאו לא נמצאה");
      }
      const start = args?.start != null ? Math.max(0, Number(args.start)) : 0;
      const requestedDuration = Number(args?.duration_seconds);
      const sourceDuration = Math.max(0.1, media.duration || (media.kind === "image" ? 5 : 0.1));
      const requestedEnd = Number.isFinite(requestedDuration) && requestedDuration > 0 ? start + requestedDuration : Number(args?.end);
      const end = Number.isFinite(requestedEnd)
        ? (media.kind === "image" ? requestedEnd : Math.min(sourceDuration, requestedEnd))
        : sourceDuration;
      const clip = {
        id: uid(),
        sourceId,
        start,
        end: Math.max(start + 0.1, end),
        trackId,
      };
      const clips = api.getClips() || [];
      const at = args?.at_index != null ? Number(args.at_index) : undefined;
      const timelineStart = args?.timeline_start != null ? Math.max(0, Number(args.timeline_start)) : undefined;
      if (timelineStart != null && Number.isFinite(timelineStart)) {
        const onTrack = clipsOnTrack(clips, trackId, primary);
        const next = insertClipAtTimeline(onTrack, clip, timelineStart, trackId);
        api.setClips(replaceTrackClips(clips, trackId, next, primary));
      } else if (at != null && Number.isFinite(at)) {
        const onTrack = clipsOnTrack(clips, trackId, primary);
        api.setClips(replaceTrackClips(clips, trackId, addClip(onTrack, clip, Math.max(0, at)), primary));
      } else {
        const onTrack = clipsOnTrack(clips, trackId, primary);
        api.setClips(replaceTrackClips(clips, trackId, addClip(onTrack, clip), primary));
      }
      api.selectClip(clip.id);
    },
  });

  registerCommand({
    id: "clip.moveToTrack",
    label: "Move clip to video track",
    labelHe: "העבר קליפ לרצועה",
    run: (api, args) => {
      const id = String(args?.id || "");
      const trackId = String(args?.trackId || "");
      const clips = api.getClips();
      const tracks = api.getTracks();
      if (!clips || !id) throw new Error("אין קטע");
      if (!trackId || !tracks.some((t) => t.id === trackId && t.type === "video")) {
        throw new Error("רצועת יעד לא נמצאה");
      }
      const primary = primaryVideoTrackId(tracks);
      const c = clips.find((x) => x.id === id);
      if (!c) throw new Error("קטע לא נמצא");
      const fromId = clipTrackId(c, primary);
      if (fromId === trackId) return;
      const fromList = clipsOnTrack(clips, fromId, primary).filter((x) => x.id !== id);
      const toList = [...clipsOnTrack(clips, trackId, primary), { ...c, trackId }];
      let next = replaceTrackClips(clips, fromId, fromList, primary);
      next = replaceTrackClips(next, trackId, toList, primary);
      api.setClips(next);
    },
  });

  registerCommand({
    id: "track.addVideo",
    label: "Add video track",
    labelHe: "הוסף רצועת וידאו",
    contexts: ["editor", "agent", "shortcut"],
    presentation: { target: "any", icon: "layers", order: 90 },
    run: (api, args) => {
      const name = args?.name != null ? String(args.name) : undefined;
      const { tracks } = createVideoTrack(api.getTracks(), name);
      api.setTracks(tracks);
    },
  });

  registerCommand({
    id: "track.removeVideo",
    label: "Remove video track",
    labelHe: "מחק רצועת וידאו",
    contexts: ["editor", "agent", "context-menu"],
    presentation: { target: "video-track", icon: "trash", order: 80, danger: true, separatorBefore: true, isVisible: (api) => api.getTracks().filter((track) => track.type === "video").length > 1 },
    run: (api, args) => {
      const trackId = String(args?.trackId || "");
      if (!trackId) throw new Error("חסר trackId");
      const next = removeVideoTrackMeta(api.getTracks(), trackId);
      if (!next) throw new Error("לא ניתן למחוק את רצועת הווידאו האחרונה");
      const primary = primaryVideoTrackId(next);
      const clips = api.getClips();
      if (clips?.length) {
        // העבר קליפים מהרצועה שנמחקה לראשי
        api.setClips(clips.map((c) => (clipTrackId(c, trackId) === trackId ? { ...c, trackId: primary } : c)));
      }
      api.setTracks(next);
    },
  });

  registerCommand({
    id: "clip.moveAtTimeline",
    label: "Move clip at exact timeline time",
    labelHe: "העבר קליפ לזמן מדויק",
    contexts: ["editor", "agent"],
    run: (api, args) => {
      const id = String(args?.id || "");
      const targetTrackId = String(args?.trackId || "");
      const timelineStart = Number(args?.timeline_start);
      const clips = api.getClips();
      const tracks = api.getTracks();
      if (!clips || !id) throw new Error("אין קטע");
      const clip = clips.find((item) => item.id === id);
      const targetTrack = tracks.find((track) => track.id === targetTrackId);
      if (!clip || !targetTrack || !Number.isFinite(timelineStart)) throw new Error("יעד גרירה לא תקין");
      const media = api.getMedia().find((item) => item.id === clip.sourceId);
      const expectedType = media?.kind === "audio" ? "audio" : "video";
      if (targetTrack.type !== expectedType) throw new Error("סוג רצועת היעד אינו מתאים לקליפ");
      const primary = primaryVideoTrackId(tracks);
      api.setClips(moveClipAtTimeline(clips, id, targetTrackId, Math.max(0, timelineStart), primary));
      api.selectClip(id);
      api.seek(Math.max(0, timelineStart));
    },
  });

  registerCommand({
    id: "clip.setAudioFades",
    label: "Set clip audio fades",
    labelHe: "דעיכת שמע בקצות קטע",
    contexts: ["editor", "agent"],
    run: (api, args) => {
      const id = String(args?.id || "");
      const clip = api.getClips()?.find((item) => item.id === id);
      if (!clip || isGapClip(clip)) throw new Error("קטע לא נמצא");
      if (args?.fadeIn == null && args?.fadeOut == null) throw new Error("חסרה דעיכה");
      const candidate = {
        ...clip,
        fadeIn: args?.fadeIn == null ? clip.fadeIn : Number(args.fadeIn),
        fadeOut: args?.fadeOut == null ? clip.fadeOut : Number(args.fadeOut),
      };
      if (!Number.isFinite(candidate.fadeIn ?? 0) || !Number.isFinite(candidate.fadeOut ?? 0)) throw new Error("דעיכה לא תקינה");
      api.updateClip(id, clipAudioFades(candidate));
    },
  });

  registerCommand({
    id: "clip.replaceAll",
    label: "Replace clip timeline",
    labelHe: "החלף את ציר הקליפים",
    contexts: ["editor", "agent"],
    run: (api, args) => {
      const clips = args?.clips;
      if (!Array.isArray(clips)) throw new Error("רשימת קליפים לא תקינה");
      for (const raw of clips) {
        if (!raw || typeof raw !== "object") throw new Error("קליפ לא תקין");
        const clip = raw as Partial<Clip>;
        if (!clip.id || !clip.sourceId || !Number.isFinite(clip.start) || !Number.isFinite(clip.end) || Number(clip.end) <= Number(clip.start)) {
          throw new Error("קליפ לא תקין");
        }
      }
      api.setClips(clips as Clip[]);
    },
  });

  registerCommand({
    id: "clip.setOpacity",
    label: "Set clip opacity",
    labelHe: "שקיפות קטע",
    contexts: ["editor", "agent"],
    run: (api, args) => {
      const id = String(args?.id || "");
      const opacity = Number(args?.opacity);
      const clip = api.getClips()?.find((item) => item.id === id);
      if (!clip || isGapClip(clip)) throw new Error("קטע לא נמצא");
      if (!Number.isFinite(opacity)) throw new Error("שקיפות לא תקינה");
      api.updateClip(id, { opacity: Math.max(0, Math.min(1, opacity)) });
    },
  });

  registerCommand({
    id: "clip.setColorAdjustments",
    label: "Set clip color adjustments",
    labelHe: "תיקוני צבע לקליפ",
    contexts: ["editor", "agent"],
    run: (api, args) => {
      const id = String(args?.id || "");
      const clip = api.getClips()?.find((item) => item.id === id);
      if (!clip || isGapClip(clip)) throw new Error("קטע לא נמצא");
      const patch: Partial<Clip> = {};
      if (args?.contrast != null) {
        const value = Number(args.contrast);
        if (!Number.isFinite(value)) throw new Error("ניגודיות לא תקינה");
        patch.contrast = Math.max(0.5, Math.min(2, value));
      }
      if (args?.saturation != null) {
        const value = Number(args.saturation);
        if (!Number.isFinite(value)) throw new Error("רוויה לא תקינה");
        patch.saturation = Math.max(0, Math.min(3, value));
      }
      if (!Object.keys(patch).length) throw new Error("חסר תיקון צבע");
      api.updateClip(id, patch);
    },
  });

  registerCommand({
    id: "clip.setEffect",
    label: "Set clip look",
    labelHe: "לוק לקליפ",
    contexts: ["editor", "agent"],
    run: (api, args) => {
      const id = String(args?.id || "");
      const clip = api.getClips()?.find((item) => item.id === id);
      if (!clip || isGapClip(clip)) throw new Error("קטע לא נמצא");
      const requested = args?.effectId == null ? "" : String(args.effectId).trim();
      // מזהה שאינו בקטלוג נדחה במקום להישמר בשקט ולהיעלם בייצוא
      const effect = requested ? effectById(requested) : undefined;
      if (requested && !effect) throw new Error(`לוק לא מוכר: ${requested}`);
      const patch: Partial<Clip> = {
        effectId: !effect || effect.id === "none" ? undefined : effect.id,
      };
      if (args?.amount != null) {
        const value = Number(args.amount);
        if (!Number.isFinite(value)) throw new Error("עוצמה לא תקינה");
        patch.effectAmount = Math.max(0, Math.min(1, value));
      }
      api.updateClip(id, patch);
    },
  });

  registerCommand({
    id: "clip.setVisualFades",
    label: "Set clip visual fades",
    labelHe: "דעיכה חזותית בקצות קטע",
    contexts: ["editor", "agent"],
    run: (api, args) => {
      const id = String(args?.id || "");
      const clip = api.getClips()?.find((item) => item.id === id);
      if (!clip || isGapClip(clip)) throw new Error("קטע לא נמצא");
      if (args?.fadeIn == null && args?.fadeOut == null) throw new Error("חסרה דעיכה");
      const candidate = {
        ...clip,
        visualFadeIn: args?.fadeIn == null ? clip.visualFadeIn : Number(args.fadeIn),
        visualFadeOut: args?.fadeOut == null ? clip.visualFadeOut : Number(args.fadeOut),
      };
      if (!Number.isFinite(candidate.visualFadeIn ?? 0) || !Number.isFinite(candidate.visualFadeOut ?? 0)) throw new Error("דעיכה לא תקינה");
      const fades = clipVisualFades(candidate);
      api.updateClip(id, { visualFadeIn: fades.fadeIn, visualFadeOut: fades.fadeOut });
    },
  });

  registerCommand({
    id: "clip.setFlip",
    label: "Flip clip",
    labelHe: "היפוך קטע",
    contexts: ["editor", "agent"],
    run: (api, args) => {
      const id = String(args?.id || "");
      const clip = api.getClips()?.find((item) => item.id === id);
      if (!clip || isGapClip(clip)) throw new Error("קטע לא נמצא");
      if (args?.flipX == null && args?.flipY == null) throw new Error("חסר כיוון היפוך");
      api.updateClip(id, {
        flipX: args?.flipX == null ? clip.flipX === true : args.flipX === true,
        flipY: args?.flipY == null ? clip.flipY === true : args.flipY === true,
      });
    },
  });

  registerCommand({
    id: "overlay.update",
    label: "Update overlay",
    labelHe: "עדכן שכבה",
    contexts: ["editor", "agent"],
    run: (api, args) => {
      const id = String(args?.id || "");
      const current = api.getOverlays().find((overlay) => overlay.id === id);
      if (!current) throw new Error("שכבה לא נמצאה");
      const raw = (args?.patch && typeof args.patch === "object" ? args.patch : {}) as Partial<typeof current>;
      const patch: Partial<typeof current> = {};
      if (raw.text != null) patch.text = String(raw.text);
      if (raw.color != null) patch.color = String(raw.color);
      if (raw.fontSize != null) patch.fontSize = Math.max(8, Number(raw.fontSize));
      if (raw.bold != null) patch.bold = !!raw.bold;
      if (raw.align === "start" || raw.align === "center" || raw.align === "end") patch.align = raw.align;
      if (raw.background != null) patch.background = String(raw.background);
      if (raw.borderRadius != null) patch.borderRadius = Math.max(0, Number(raw.borderRadius));
      if (raw.borderColor != null) patch.borderColor = String(raw.borderColor);
      if (raw.borderWidth != null) patch.borderWidth = Math.max(0, Number(raw.borderWidth));
      if (raw.fadeIn != null) patch.fadeIn = Math.max(0, Number(raw.fadeIn));
      if (raw.fadeOut != null) patch.fadeOut = Math.max(0, Number(raw.fadeOut));
      if (raw.zIndex != null) patch.zIndex = Math.max(0, Math.round(Number(raw.zIndex)));
      if (raw.locked != null) patch.locked = !!raw.locked;
      if (raw.hidden != null) patch.hidden = !!raw.hidden;
      const start = raw.start != null ? Math.max(0, Number(raw.start)) : current.start;
      const end = raw.end != null ? Math.max(start + 0.05, Number(raw.end)) : Math.max(start + 0.05, current.end);
      if (raw.start != null) patch.start = start;
      if (raw.end != null || (raw.start != null && current.end < start + 0.05)) patch.end = end;
      if (raw.transform) {
        const transform = raw.transform;
        patch.transform = clampOverlayTransform({
          x: Number.isFinite(Number(transform.x)) ? Number(transform.x) : current.transform.x,
          y: Number.isFinite(Number(transform.y)) ? Number(transform.y) : current.transform.y,
          w: Math.max(8, Number.isFinite(Number(transform.w)) ? Number(transform.w) : current.transform.w),
          h: Math.max(8, Number.isFinite(Number(transform.h)) ? Number(transform.h) : current.transform.h),
          rotation: Number.isFinite(Number(transform.rotation)) ? Number(transform.rotation) : current.transform.rotation,
          opacity: Math.max(0, Math.min(1, Number.isFinite(Number(transform.opacity)) ? Number(transform.opacity) : current.transform.opacity)),
        }, api.getCanvas().width, api.getCanvas().height);
      }
      api.updateOverlay(id, patch);
    },
  });

  registerCommand({
    id: "media.remove",
    label: "Remove media asset",
    labelHe: "הסר קובץ",
    contexts: ["editor", "context-menu"],
    presentation: { target: "asset", icon: "trash", order: 90, danger: true, separatorBefore: true },
    run: (api, args) => {
      const id = String(args?.id || "");
      const asset = api.getMedia().find((item) => item.id === id);
      if (!asset || !id) throw new Error("קובץ המדיה לא נמצא");
      if (!api.removeMediaAsset) throw new Error("הסרת מדיה אינה זמינה");
      api.removeMediaAsset(id);
    },
  });

  registerCommand({
    id: "subtitle.edit",
    label: "Edit subtitle",
    labelHe: "ערוך כתובית",
    contexts: ["editor", "agent"],
    run: (api, args) => {
      const id = String(args?.id || "");
      const text = String(args?.text ?? "");
      const subs = api.getSubs();
      if (!subs || !api.setSubs || !id) throw new Error("אין כתובית לעריכה");
      if (!subs.some((sub) => sub.id === id)) throw new Error("כתובית לא נמצאה");
      api.setSubs(subs.map((sub) => sub.id === id ? { ...sub, text } : sub));
    },
  });

  registerCommand({
    id: "subtitle.delete",
    label: "Delete subtitle",
    labelHe: "מחק כתובית",
    contexts: ["editor", "agent", "context-menu"],
    presentation: { target: "caption", icon: "trash", order: 10, danger: true },
    run: (api, args) => {
      const id = String(args?.id || "");
      const subs = api.getSubs();
      if (!subs || !api.setSubs || !id) throw new Error("אין כתובית למחיקה");
      if (!subs.some((sub) => sub.id === id)) throw new Error("כתובית לא נמצאה");
      api.setSubs(subs.filter((sub) => sub.id !== id));
    },
  });

  registerCommand({
    id: "subtitle.retime",
    label: "Retime subtitle",
    labelHe: "תזמן כתובית",
    contexts: ["editor", "agent"],
    run: (api, args) => {
      const id = String(args?.id || "");
      const start = Number(args?.start);
      const end = Number(args?.end);
      const subs = api.getSubs();
      if (!subs || !api.setSubs || !id) throw new Error("אין כתובית לתזמון");
      if (!subs.some((sub) => sub.id === id)) throw new Error("כתובית לא נמצאה");
      api.setSubs(subs.map((sub) => sub.id === id ? { ...sub, start: Math.max(0, start), end: Math.max(Math.max(0, start) + 0.2, end) } : sub));
    },
  });

  registerCommand({
    id: "subtitle.clear",
    label: "Clear subtitles",
    labelHe: "מחק את כל הכתוביות",
    contexts: ["editor", "agent"],
    run: (api) => {
      if (!api.setSubs) throw new Error("כתוביות אינן זמינות");
      api.setSubs([]);
    },
  });

  registerCommand({
    id: "subtitle.replaceAll",
    label: "Replace subtitles",
    labelHe: "החלף את כל הכתוביות",
    contexts: ["editor", "agent"],
    run: (api, args) => {
      const subtitles = args?.subtitles;
      if (!api.setSubs || !Array.isArray(subtitles)) throw new Error("רשימת כתוביות לא תקינה");
      for (const raw of subtitles) {
        if (!raw || typeof raw !== "object") throw new Error("כתובית לא תקינה");
        const sub = raw as Partial<Sub>;
        if (!sub.id || typeof sub.text !== "string" || !Number.isFinite(sub.start) || !Number.isFinite(sub.end) || Number(sub.end) <= Number(sub.start)) {
          throw new Error("כתובית לא תקינה");
        }
      }
      api.setSubs(subtitles as Sub[]);
    },
  });

  registerCommand({
    id: "track.rename",
    label: "Rename track",
    labelHe: "שנה שם רצועה",
    run: (api, args) => {
      const trackId = String(args?.trackId || "");
      const name = String(args?.name || "").trim();
      if (!trackId || !name) throw new Error("חסרים trackId או name");
      if (!api.getTracks().some((t) => t.id === trackId)) throw new Error("רצועה לא נמצאה");
      api.setTracks(api.getTracks().map((t) => t.id === trackId ? { ...t, name } : t));
    },
  });

  registerCommand({
    id: "track.setLocked",
    label: "Set track locked",
    labelHe: "נעל/שחרר רצועה",
    contexts: ["editor", "agent", "context-menu"],
    presentation: { target: "track", icon: "lock", order: 10, labelHe: (_api, args) => args.locked ? "נעל רצועה" : "שחרר נעילה" },
    run: (api, args) => {
      const trackId = String(args?.trackId || "");
      if (!trackId || !api.getTracks().some((t) => t.id === trackId)) throw new Error("רצועה לא נמצאה");
      api.setTracks(api.getTracks().map((t) => t.id === trackId ? { ...t, locked: !!args?.locked } : t));
    },
  });

  registerCommand({
    id: "track.setMuted",
    label: "Set track muted",
    labelHe: "השתק/בטל השתקת רצועה",
    contexts: ["editor", "agent", "context-menu"],
    presentation: { target: "audio-track", icon: "volume", order: 20, labelHe: (_api, args) => args.muted ? "השתק רצועה" : "בטל השתקה" },
    run: (api, args) => {
      const trackId = String(args?.trackId || "");
      const track = api.getTracks().find((t) => t.id === trackId);
      if (!track) throw new Error("רצועה לא נמצאה");
      if (track.type !== "audio") throw new Error("השתקה זמינה כרגע לרצועת אודיו בלבד");
      api.setTracks(api.getTracks().map((t) => t.id === trackId ? { ...t, muted: !!args?.muted } : t));
    },
  });

  registerCommand({
    id: "track.setHeight",
    label: "Set track height",
    labelHe: "שנה גובה רצועה",
    contexts: ["editor", "agent", "context-menu"],
    presentation: { target: "track", icon: "height", order: 30 },
    run: (api, args) => {
      const trackId = String(args?.trackId || "");
      const height = Number(args?.height);
      if (!trackId || !api.getTracks().some((t) => t.id === trackId)) throw new Error("רצועה לא נמצאה");
      if (!Number.isFinite(height)) throw new Error("גובה רצועה לא תקין");
      api.setTracks(api.getTracks().map((t) => t.id === trackId
        ? { ...t, height: Math.max(28, Math.min(140, height)) }
        : t));
    },
  });

  registerCommand({
    id: "track.reorder",
    label: "Reorder track",
    labelHe: "שנה סדר רצועה",
    run: (api, args) => {
      const trackId = String(args?.trackId || "");
      const direction = Number(args?.direction);
      if (direction !== -1 && direction !== 1) throw new Error("direction חייב להיות 1 או -1");
      const list = [...api.getTracks()].sort((a, b) => a.order - b.order);
      const i = list.findIndex((t) => t.id === trackId);
      const j = i + direction;
      if (i < 0) throw new Error("רצועה לא נמצאה");
      if (j < 0 || j >= list.length) throw new Error("הרצועה כבר בקצה");
      if (list[i].type !== list[j].type) throw new Error("ניתן לשנות סדר רק בין רצועות מאותו סוג");
      const current = list[i], adjacent = list[j];
      api.setTracks(api.getTracks().map((t) => t.id === current.id
        ? { ...t, order: adjacent.order }
        : t.id === adjacent.id ? { ...t, order: current.order } : t));
    },
  });

  registerCommand({
    id: "canvas.setAspectRatio",
    label: "Set canvas aspect ratio",
    labelHe: "שנה יחס תצוגה / פורמט",
    contexts: ["editor", "agent"],
    run: (api, args) => {
      const w = Number(args?.width);
      const h = Number(args?.height);
      if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
        throw new Error("מידות קנבס לא תקינות");
      }
      if (api.setCanvas) {
        api.setCanvas({ width: Math.round(w), height: Math.round(h) });
      }
    },
  });

}
