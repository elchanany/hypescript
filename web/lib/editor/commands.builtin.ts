// Register built-in editor commands used by UI + Agent.
import { addClip, assembledToSource, clipDur, splitClip, trimClip, uid } from "./model";
import { makeTextOverlay } from "./overlay";
import { closeGap, isGapClip, removeClipLeaveGap, removeClipRipple, rollAtBoundary, slipClip } from "./timelineOps";
import { normalizeCaptionStyle } from "./captionStyle";
import { createVideoTrack, primaryVideoTrackId, removeVideoTrackMeta } from "./project";
import { clipTrackId, clipsOnTrack, moveClipOnTrack, replaceTrackClips } from "./tracks";
import { registerCommand } from "./commands";

let registered = false;

export function ensureBuiltinCommands() {
  if (registered) return;
  registered = true;

  registerCommand({
    id: "clip.delete.ripple",
    label: "Delete clip (ripple)",
    labelHe: "מחק קטע (ריפל)",
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
    run: (api, args) => {
      const text = String(args?.text || "טקסט חדש");
      const canvas = api.getCanvas();
      const cur = api.getPlayhead();
      const clips = api.getClips();
      const end = Math.max(cur + 4, clips ? clips.reduce((s, c) => s + clipDur(c), 0) : 4);
      const o = makeTextOverlay(canvas.width, canvas.height, api.getOverlays(), text, cur, end);
      api.addOverlay(o);
      api.selectOverlay(o.id);
    },
  });

  registerCommand({
    id: "clip.setEnabled",
    label: "Set clip enabled",
    labelHe: "הפעל/השבת קטע",
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
      const trackId = String(args?.trackId || primary);
      if (!tracks.some((t) => t.id === trackId && t.type === "video")) {
        throw new Error("רצועת וידאו לא נמצאה");
      }
      const start = args?.start != null ? Math.max(0, Number(args.start)) : 0;
      const end = args?.end != null ? Math.min(media.duration, Number(args.end)) : media.duration;
      const clip = {
        id: uid(),
        sourceId,
        start,
        end: Math.max(start + 0.1, end),
        trackId,
      };
      const clips = api.getClips() || [];
      const at = args?.at_index != null ? Number(args.at_index) : undefined;
      if (at != null && Number.isFinite(at)) {
        const onTrack = clipsOnTrack(clips, trackId, primary);
        const inserted = addClip(onTrack, clip, Math.max(0, at));
        api.setClips(replaceTrackClips(clips, trackId, inserted, primary));
      } else {
        api.setClips(addClip(clips, clip));
      }
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

}
