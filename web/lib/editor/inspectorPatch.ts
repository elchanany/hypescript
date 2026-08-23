// מיפוי טהור מ-patch של Inspector/CreativePanel לפקודות CommandBus.
// בלי React ובלי api — updateClipFromInspector ב-page.tsx מריץ את התוצאה,
// והמיפוי עצמו נבדק בנפרד (inspectorPatch.test.ts).

import type { Clip } from "./model";

export interface InspectorCommand {
  id:
    | "clip.trim"
    | "clip.setEnabled"
    | "clip.setVolume"
    | "clip.setAudioFades"
    | "clip.setOpacity"
    | "clip.setColorAdjustments"
    | "clip.setVisualFades"
    | "clip.setFlip"
    | "clip.setEffect";
  args: Record<string, unknown>;
}

export function inspectorPatchToCommands(clipId: string, patch: Partial<Clip>): InspectorCommand[] {
  const id = String(clipId || "");
  const commands: InspectorCommand[] = [];
  if (!id || !patch || typeof patch !== "object") return commands;
  if (patch.start != null || patch.end != null) commands.push({ id: "clip.trim", args: { id, start: patch.start, end: patch.end } });
  if (patch.enabled != null) commands.push({ id: "clip.setEnabled", args: { id, enabled: patch.enabled } });
  if (patch.volume != null) commands.push({ id: "clip.setVolume", args: { id, volume: patch.volume } });
  if (patch.fadeIn != null || patch.fadeOut != null) commands.push({ id: "clip.setAudioFades", args: { id, fadeIn: patch.fadeIn, fadeOut: patch.fadeOut } });
  if (patch.opacity != null) commands.push({ id: "clip.setOpacity", args: { id, opacity: patch.opacity } });
  if (patch.contrast != null || patch.saturation != null) {
    commands.push({ id: "clip.setColorAdjustments", args: { id, contrast: patch.contrast, saturation: patch.saturation } });
  }
  if (patch.visualFadeIn != null || patch.visualFadeOut != null) commands.push({ id: "clip.setVisualFades", args: { id, fadeIn: patch.visualFadeIn, fadeOut: patch.visualFadeOut } });
  if (patch.flipX != null || patch.flipY != null) commands.push({ id: "clip.setFlip", args: { id, flipX: patch.flipX, flipY: patch.flipY } });
  if (patch.effectId != null || patch.effectAmount != null) {
    commands.push({ id: "clip.setEffect", args: { id, effectId: patch.effectId, amount: patch.effectAmount } });
  }
  return commands;
}
