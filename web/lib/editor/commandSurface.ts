import { clipEnabled } from "./model";
import { isGapClip } from "./timelineOps";
import { listCommands, type CommandDef, type CommandPermission, type EditorApi } from "./commands";

export interface CommandSelection {
  clipId: string | null;
  overlayId: string | null;
  subId?: string | null;
  assetId?: string | null;
  trackId?: string | null;
}

export interface RunnableCommand {
  command: CommandDef;
  args: Record<string, unknown>;
}

function inferArgs(command: CommandDef, api: EditorApi, selection: CommandSelection): Record<string, unknown> | null {
  const args: Record<string, unknown> = {};
  const properties = command.inputSchema.properties || {};
  for (const key of command.inputSchema.required || []) {
    if (key === "id") {
      const selectedId = command.id.startsWith("overlay.") ? selection.overlayId : command.id.startsWith("subtitle.") ? selection.subId : command.id.startsWith("media.") ? selection.assetId : selection.clipId;
      if (!selectedId) return null;
      if (!command.id.startsWith("overlay.") && !command.id.startsWith("subtitle.") && !command.id.startsWith("media.")) {
        const selectedClip = api.getClips()?.find((item) => item.id === selectedId);
        if (!selectedClip) return null;
        if (command.id.startsWith("gap.") !== isGapClip(selectedClip)) return null;
      }
      args.id = selectedId;
      continue;
    }
    if (key === "enabled" && selection.clipId) {
      const clip = api.getClips()?.find((item) => item.id === selection.clipId);
      if (!clip) return null;
      args.enabled = !clipEnabled(clip);
      continue;
    }
    if (key === "trackId" && selection.trackId) {
      args.trackId = selection.trackId;
      continue;
    }
    if ((key === "locked" || key === "muted") && selection.trackId) {
      const track = api.getTracks().find((item) => item.id === selection.trackId);
      if (!track) return null;
      args[key] = !track[key];
      continue;
    }
    if (key === "height" && selection.trackId) {
      const track = api.getTracks().find((item) => item.id === selection.trackId);
      if (!track) return null;
      const heights = [48, 64, 96];
      const index = heights.findIndex((height) => height >= track.height);
      args.height = heights[(index + 1) % heights.length];
      continue;
    }
    return null;
  }
  // Optional inferred values may still make a zero-input command useful.
  if ("id" in properties && !("id" in args)) {
    const selectedId = command.id.startsWith("overlay.") ? selection.overlayId : selection.clipId;
    if (selectedId) args.id = selectedId;
  }
  return args;
}

export function listRunnableCommands(
  api: EditorApi,
  selection: CommandSelection,
  context: "shortcut" | "context-menu",
  granted: readonly CommandPermission[] = ["project.read", "project.write", "project.export"],
): RunnableCommand[] {
  const selectedClip = selection.clipId ? api.getClips()?.find((item) => item.id === selection.clipId) : null;
  const selectedTrack = selection.trackId ? api.getTracks().find((item) => item.id === selection.trackId) : null;
  const targetMatches = (command: CommandDef) => {
    const target = command.presentation?.target || "any";
    if (target === "any") return true;
    if (target === "overlay") return !!selection.overlayId;
    if (target === "caption") return !!selection.subId;
    if (target === "asset") return !!selection.assetId;
    if (target === "track") return !!selectedTrack;
    if (target === "video-track") return selectedTrack?.type === "video";
    if (target === "audio-track") return selectedTrack?.type === "audio";
    if (!selectedClip) return false;
    return target === "gap" ? isGapClip(selectedClip) : !isGapClip(selectedClip);
  };
  return listCommands()
    .filter((command) => command.contexts.includes(context))
    .filter(targetMatches)
    .filter((command) => command.permissions.every((permission) => granted.includes(permission)))
    .map((command) => ({ command, args: inferArgs(command, api, selection) }))
    .filter((entry): entry is RunnableCommand => entry.args !== null)
    .filter((entry) => entry.command.presentation?.isVisible?.(api, entry.args) ?? true)
    .sort((a, b) => (a.command.presentation?.order || 100) - (b.command.presentation?.order || 100));
}
