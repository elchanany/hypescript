import { clipEnabled } from "./model";
import { isGapClip } from "./timelineOps";
import { listCommands, type CommandDef, type CommandPermission, type EditorApi } from "./commands";

export interface CommandSelection {
  clipId: string | null;
  overlayId: string | null;
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
      const selectedId = command.id.startsWith("overlay.") ? selection.overlayId : selection.clipId;
      if (!selectedId) return null;
      if (!command.id.startsWith("overlay.")) {
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
  const targetMatches = (command: CommandDef) => {
    const target = command.presentation?.target || "any";
    if (target === "any") return true;
    if (target === "overlay") return !!selection.overlayId;
    if (!selectedClip) return false;
    return target === "gap" ? isGapClip(selectedClip) : !isGapClip(selectedClip);
  };
  return listCommands()
    .filter((command) => command.contexts.includes(context))
    .filter(targetMatches)
    .filter((command) => command.permissions.every((permission) => granted.includes(permission)))
    .map((command) => ({ command, args: inferArgs(command, api, selection) }))
    .filter((entry): entry is RunnableCommand => entry.args !== null)
    .sort((a, b) => (a.command.presentation?.order || 100) - (b.command.presentation?.order || 100));
}
