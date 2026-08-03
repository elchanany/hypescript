// Register built-in editor commands used by UI + Agent.
import { assembledToSource, clipDur, splitClip } from "./model";
import { makeTextOverlay } from "./overlay";
import { closeGap, isGapClip, removeClipLeaveGap, removeClipRipple } from "./timelineOps";
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

}
