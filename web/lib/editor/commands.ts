// Lightweight CommandBus — single registry so UI and Agent can share the same
// operations (parity). Commands are pure descriptions + a run(api) function.
// History/Undo still lives in useEditor; commands call into the provided API.

import { Clip, MediaAsset } from "./model";
import { Overlay } from "./overlay";
import { Sub } from "./subtitlesEdl";
import { CanvasSize } from "./canvasCoords";
import { VideoTransform } from "./videoTransform";

export type CommandId =
  | "clip.delete.ripple"
  | "clip.delete.leaveGap"
  | "clip.splitAtPlayhead"
  | "clip.splitLinked"
  | "clip.moveToTime"
  | "gap.close"
  | "overlay.delete"
  | "overlay.addText"
  | "clip.setEnabled"
  | "clip.setVolume"
  | "clip.duplicate"
  | "caption.setStyle"
  | "caption.updateText"
  | "caption.updateTiming"
  | "caption.updateLayout"
  | "clip.roll"
  | "clip.slip"
  | "av.detachAudio"
  | "av.relink"
  | "video.setTransform"
  | "video.setFitMode"
  | "select.entity";

export interface EditorApi {
  getClips(): Clip[] | null;
  setClips(clips: Clip[] | null): void;
  getAudioClips(): Clip[] | null;
  setAudioClips(clips: Clip[] | null): void;
  getOverlays(): Overlay[];
  setOverlays(overlays: Overlay[]): void;
  updateOverlay(id: string, patch: Partial<Overlay>): void;
  removeOverlay(id: string): void;
  addOverlay(o: Overlay): void;
  updateClip(id: string, patch: Partial<Clip>): void;
  getMedia(): MediaAsset[];
  getSubs(): Sub[] | null;
  setSubs(subs: Sub[] | null): void;
  updateSub(id: string, patch: Partial<Sub>): void;
  getCanvas(): CanvasSize;
  getVideoTransform(): VideoTransform;
  setVideoTransform(vt: VideoTransform): void;
  selectClip(id: string | null, track?: "video" | "audio"): void;
  selectOverlay(id: string | null): void;
  selectCaption(id: string | null): void;
  seek(t: number): void;
  getPlayhead(): number;
  getCaptionStyle?: () => import("./captionStyle").CaptionStyle;
  setCaptionStyle?: (style: import("./captionStyle").CaptionStyle) => void;
  /** Source media duration for roll/slip clamping */
  getMediaDuration?: (sourceId: string) => number;
  getSourceSize?: () => { w: number; h: number };
}

export interface CommandDef {
  id: CommandId;
  label: string;
  /** Hebrew label for agent/UI */
  labelHe: string;
  run: (api: EditorApi, args?: Record<string, unknown>) => void;
}

const registry = new Map<CommandId, CommandDef>();

export function registerCommand(cmd: CommandDef) {
  registry.set(cmd.id, cmd);
}

export function getCommand(id: CommandId): CommandDef | undefined {
  return registry.get(id);
}

export function listCommands(): CommandDef[] {
  return [...registry.values()];
}

export function runCommand(id: CommandId, api: EditorApi, args?: Record<string, unknown>): { ok: true } | { ok: false; error: string } {
  const cmd = registry.get(id);
  if (!cmd) return { ok: false, error: `פקודה לא ידועה: ${id}` };
  try {
    cmd.run(api, args);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

// --- Query API (read-only snapshots for agent/UI chips) ---
export interface ProjectQuery {
  clipCount: number;
  overlayCount: number;
  captionCount: number;
  duration: number;
  playhead: number;
  selectedClipId: string | null;
  selectedOverlayId: string | null;
  selectedCaptionId: string | null;
  mediaNames: string[];
  avLinked: boolean;
  fitMode: string;
}

export function queryProject(
  api: EditorApi,
  sel: { clipId: string | null; overlayId: string | null; captionId?: string | null },
): ProjectQuery {
  const clips = api.getClips() || [];
  const overlays = api.getOverlays();
  const subs = api.getSubs() || [];
  const dur = clips.reduce((s, c) => s + Math.max(0, c.end - c.start), 0);
  const vt = api.getVideoTransform();
  return {
    clipCount: clips.length,
    overlayCount: overlays.length,
    captionCount: subs.length,
    duration: dur,
    playhead: api.getPlayhead(),
    selectedClipId: sel.clipId,
    selectedOverlayId: sel.overlayId,
    selectedCaptionId: sel.captionId ?? null,
    mediaNames: api.getMedia().map((m) => m.name),
    avLinked: api.getAudioClips() == null,
    fitMode: vt.fitMode,
  };
}
