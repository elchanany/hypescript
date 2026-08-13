// Lightweight CommandBus — single registry so UI and Agent can share the same
// operations (parity). Commands are pure descriptions + a run(api) function.
// History/Undo still lives in useEditor; commands call into the provided API.

import { assembledToSource, clipEnabled, Clip, MediaAsset } from "./model";
import { Overlay, overlayVisibleAt } from "./overlay";
import { Sub } from "./subtitlesEdl";
import { CanvasSize } from "./canvasCoords";
import { TrackMeta } from "./project";
import type { EditorSnapshot } from "@/hooks/useEditor";
import { isGapClip } from "./timelineOps";

export type CommandId =
  | "clip.delete.ripple"
  | "clip.delete.leaveGap"
  | "clip.splitAtPlayhead"
  | "clip.split"
  | "clip.trim"
  | "clip.move"
  | "clip.add"
  | "clip.replaceAll"
  | "clip.moveToTrack"
  | "clip.moveAtTimeline"
  | "clip.detachAudio"
  | "gap.close"
  | "overlay.delete"
  | "overlay.addText"
  | "overlay.addImage"
  | "overlay.update"
  | "media.remove"
  | "clip.setEnabled"
  | "clip.setVolume"
  | "clip.setAudioFades"
  | "clip.setOpacity"
  | "clip.setColorAdjustments"
  | "clip.setVisualFades"
  | "clip.setFlip"
  | "clip.duplicate"
  | "caption.setStyle"
  | "subtitle.edit"
  | "subtitle.delete"
  | "subtitle.retime"
  | "subtitle.clear"
  | "subtitle.replaceAll"
  | "clip.roll"
  | "clip.slip"
  | "track.addVideo"
  | "track.removeVideo"
  | "track.rename"
  | "track.setLocked"
  | "track.setMuted"
  | "track.setHeight"
  | "track.reorder";

export interface EditorApi {
  getClips(): Clip[] | null;
  setClips(clips: Clip[] | null): void;
  getOverlays(): Overlay[];
  setOverlays(overlays: Overlay[]): void;
  updateOverlay(id: string, patch: Partial<Overlay>): void;
  removeOverlay(id: string): void;
  addOverlay(o: Overlay): void;
  updateClip(id: string, patch: Partial<Clip>): void;
  getMedia(): MediaAsset[];
  removeMediaAsset?: (id: string) => void;
  /**
   * Browser-only media I/O boundary: import a File/Blob-backed MediaAsset into
   * project media. Implemented by the page via mediaRef + setMedia (NOT a JSON
   * CommandBus command — File/Blob is not serializable). All subsequent
   * mutations (clips/overlays) must still go through commands.
   */
  addMediaAsset?: (asset: MediaAsset) => void;
  getSubs(): Sub[] | null;
  setSubs?(subs: Sub[] | null): void;
  getTracks(): TrackMeta[];
  setTracks(tracks: TrackMeta[]): void;
  getCanvas(): CanvasSize;
  selectClip(id: string | null): void;
  selectOverlay(id: string | null): void;
  seek(t: number): void;
  getPlayhead(): number;
  getCaptionStyle?: () => import("./captionStyle").CaptionStyle;
  setCaptionStyle?: (style: import("./captionStyle").CaptionStyle) => void;
  /** Source media duration for roll/slip clamping */
  getMediaDuration?: (sourceId: string) => number;
  getSnapshot?: () => EditorSnapshot;
  restoreSnapshot?: (snapshot: EditorSnapshot) => void;
}

export interface CommandDef {
  id: CommandId;
  label: string;
  /** Hebrew label for agent/UI */
  labelHe: string;
  inputSchema: CommandSchema;
  resultSchema: CommandSchema;
  permissions: CommandPermission[];
  contexts: CommandContext[];
  agentCallable: boolean;
  presentation?: CommandPresentation;
  run: (api: EditorApi, args?: Record<string, unknown>) => void;
}

export interface CommandPresentation {
  target?: "clip" | "gap" | "overlay" | "caption" | "asset" | "track" | "video-track" | "audio-track" | "any";
  icon?: "copy" | "scissors" | "eye" | "square-dashed" | "trash" | "type" | "layers" | "lock" | "volume" | "height";
  order?: number;
  danger?: boolean;
  shortcut?: string;
  separatorBefore?: boolean;
  disableWhenVideoLocked?: boolean;
  labelHe?: (api: EditorApi, args: Record<string, unknown>) => string;
  isVisible?: (api: EditorApi, args: Record<string, unknown>) => boolean;
}

export type CommandPermission = "project.read" | "project.write" | "project.export";
export type CommandContext = "editor" | "agent" | "shortcut" | "context-menu";
export interface CommandSchema {
  type: "object";
  properties?: Record<string, { type: "string" | "number" | "boolean" | "object" | "array" }>;
  required?: string[];
  additionalProperties?: boolean;
}

type CommandRegistration = Omit<CommandDef, "inputSchema" | "resultSchema" | "permissions" | "contexts" | "agentCallable"> &
  Partial<Pick<CommandDef, "inputSchema" | "resultSchema" | "permissions" | "contexts" | "agentCallable">>;
const schema = (required: string[] = [], properties: CommandSchema["properties"] = {}): CommandSchema => ({ type: "object", properties, required, additionalProperties: true });
const id = { type: "string" as const }, num = { type: "number" as const }, bool = { type: "boolean" as const }, str = { type: "string" as const }, obj = { type: "object" as const }, arr = { type: "array" as const };
const INPUT_SCHEMAS: Record<CommandId, CommandSchema> = {
  "clip.delete.ripple": schema(["id"], { id }), "clip.delete.leaveGap": schema(["id"], { id }),
  "clip.splitAtPlayhead": schema(), "clip.split": schema(["id", "at_source"], { id, at_source: num }),
  "clip.trim": schema(["id"], { id, start: num, end: num }), "clip.move": schema(["id", "to_index"], { id, to_index: num }),
  "clip.add": schema(["sourceId"], { sourceId: id, start: num, end: num, duration_seconds: num, trackId: id, at_index: num, timeline_start: num }),
  "clip.replaceAll": schema(["clips"], { clips: arr }),
  "clip.moveToTrack": schema(["id", "trackId"], { id, trackId: id }), "gap.close": schema(["id"], { id }),
  "clip.moveAtTimeline": schema(["id", "trackId", "timeline_start"], { id, trackId: id, timeline_start: num }),
  "clip.detachAudio": schema(["id"], { id }),
  "overlay.delete": schema(["id"], { id }), "overlay.addText": schema([], { text: str, start: num, end: num, preset: str }),
  "overlay.addImage": schema(["assetId"], { assetId: id, overlayId: id, start: num, end: num, width: num, height: num, preset: str, x: num, y: num, w: num, h: num, borderRadius: num, opacity: num, fadeIn: num, fadeOut: num, locked: bool }),
  "overlay.update": schema(["id", "patch"], { id, patch: obj }),
  "media.remove": schema(["id"], { id }),
  "clip.setEnabled": schema(["id", "enabled"], { id, enabled: bool }), "clip.setVolume": schema(["id", "volume"], { id, volume: num }), "clip.setAudioFades": schema(["id"], { id, fadeIn: num, fadeOut: num }), "clip.setOpacity": schema(["id", "opacity"], { id, opacity: num }), "clip.setColorAdjustments": schema(["id"], { id, contrast: num, saturation: num }), "clip.setVisualFades": schema(["id"], { id, fadeIn: num, fadeOut: num }), "clip.setFlip": schema(["id"], { id, flipX: bool, flipY: bool }),
  "clip.duplicate": schema(["id"], { id }), "caption.setStyle": schema(),
  "subtitle.edit": schema(["id", "text"], { id, text: str }), "subtitle.delete": schema(["id"], { id }),
  "subtitle.retime": schema(["id", "start", "end"], { id, start: num, end: num }), "subtitle.clear": schema(),
  "subtitle.replaceAll": schema(["subtitles"], { subtitles: arr }),
  "clip.roll": schema(["delta"], { id, leftIndex: num, delta: num }), "clip.slip": schema(["id", "delta"], { id, delta: num }),
  "track.addVideo": schema([], { name: str }), "track.removeVideo": schema(["trackId"], { trackId: id }),
  "track.rename": schema(["trackId", "name"], { trackId: id, name: str }), "track.setLocked": schema(["trackId", "locked"], { trackId: id, locked: bool }),
  "track.setMuted": schema(["trackId", "muted"], { trackId: id, muted: bool }), "track.setHeight": schema(["trackId", "height"], { trackId: id, height: num }),
  "track.reorder": schema(["trackId", "direction"], { trackId: id, direction: num }),
};
const AGENT_COMMANDS = new Set<CommandId>(["clip.split", "clip.trim", "clip.move", "clip.add", "clip.replaceAll", "clip.moveToTrack", "clip.moveAtTimeline", "clip.setEnabled", "clip.setVolume", "clip.setAudioFades", "clip.setOpacity", "clip.setColorAdjustments", "clip.setVisualFades", "clip.setFlip", "overlay.addText", "overlay.addImage", "overlay.update", "overlay.delete", "subtitle.edit", "subtitle.delete", "subtitle.retime", "subtitle.clear", "subtitle.replaceAll", "track.addVideo", "track.removeVideo", "track.rename", "track.setLocked", "track.setMuted", "track.setHeight", "track.reorder"]);
const RESULT_SCHEMA = schema(["ok"], { ok: bool });

const registry = new Map<CommandId, CommandDef>();

export function registerCommand(cmd: CommandRegistration) {
  const agentCallable = cmd.agentCallable ?? AGENT_COMMANDS.has(cmd.id);
  registry.set(cmd.id, { ...cmd, inputSchema: cmd.inputSchema ?? INPUT_SCHEMAS[cmd.id], resultSchema: cmd.resultSchema ?? RESULT_SCHEMA, permissions: cmd.permissions ?? ["project.write"], contexts: cmd.contexts ?? (agentCallable ? ["editor", "agent"] : ["editor"]), agentCallable });
}

export function getCommand(id: CommandId): CommandDef | undefined {
  return registry.get(id);
}

export function listCommands(): CommandDef[] {
  return [...registry.values()];
}

export function listAgentCommands(): CommandDef[] {
  return listCommands().filter((command) => command.agentCallable && command.contexts.includes("agent"));
}

function validateArgs(contract: CommandSchema, args: Record<string, unknown>): string | null {
  for (const key of contract.required || []) if (!(key in args) || args[key] === undefined || args[key] === null || args[key] === "") return `חסר פרמטר: ${key}`;
  for (const [key, spec] of Object.entries(contract.properties || {})) {
    const value = args[key];
    if (value === undefined || value === null) continue;
    const validType = spec.type === "array" ? Array.isArray(value) : typeof value === spec.type;
    if (!validType || (spec.type === "number" && !Number.isFinite(value))) return `פרמטר לא תקין: ${key}`;
  }
  return null;
}

export function runCommand(id: CommandId, api: EditorApi, args?: Record<string, unknown>): { ok: true } | { ok: false; error: string } {
  const cmd = registry.get(id);
  if (!cmd) return { ok: false, error: `פקודה לא ידועה: ${id}` };
  try {
    const input = args || {};
    const validationError = validateArgs(cmd.inputSchema, input);
    if (validationError) return { ok: false, error: validationError };
    cmd.run(api, input);
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
  activeClipId: string | null;
  activeSourceTime: number | null;
  inGap: boolean;
  activeOverlayIds: string[];
  activeCaptionIds: string[];
  mediaNames: string[];
  videoTrackCount: number;
}

export function queryProject(
  api: EditorApi,
  sel: { clipId: string | null; overlayId: string | null; captionId?: string | null },
): ProjectQuery {
  const clips = api.getClips() || [];
  const activeClips = clips.filter(clipEnabled);
  const overlays = api.getOverlays();
  const subs = api.getSubs() || [];
  const tracks = api.getTracks?.() || [];
  const dur = activeClips.reduce((s, c) => s + Math.max(0, c.end - c.start), 0);
  const playhead = api.getPlayhead();
  const mapped = assembledToSource(activeClips, playhead);
  const activeClip = mapped.index >= 0 && playhead >= 0 && playhead <= dur
    ? activeClips[mapped.index]
    : null;
  return {
    clipCount: clips.length,
    overlayCount: overlays.length,
    captionCount: subs.length,
    duration: dur,
    playhead,
    selectedClipId: sel.clipId,
    selectedOverlayId: sel.overlayId,
    selectedCaptionId: sel.captionId ?? null,
    activeClipId: activeClip?.id ?? null,
    activeSourceTime: activeClip && !isGapClip(activeClip) ? mapped.source : null,
    inGap: !!activeClip && isGapClip(activeClip),
    activeOverlayIds: overlays.filter((overlay) => overlayVisibleAt(overlay, playhead)).map((overlay) => overlay.id),
    activeCaptionIds: subs.filter((sub) => playhead >= sub.start && playhead <= sub.end).map((sub) => sub.id),
    mediaNames: api.getMedia().map((m) => m.name),
    videoTrackCount: tracks.filter((t) => t.type === "video").length,
  };
}
