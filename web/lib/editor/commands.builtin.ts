// Register built-in editor commands used by UI + Agent.
import { assembledToSource, clipDur, splitClip, uid } from "./model";
import { makeTextOverlay } from "./overlay";
import { closeGap, isGapClip, removeClipLeaveGap, removeClipRipple, rollAtBoundary, slipClip } from "./timelineOps";
import { normalizeCaptionStyle } from "./captionStyle";
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

}
