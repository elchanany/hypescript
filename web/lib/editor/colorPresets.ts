export interface ClipColorPreset {
  id: "neutral" | "crisp" | "vivid" | "muted" | "mono";
  labelHe: string;
  contrast: number;
  saturation: number;
}

/** Presets are only named pairs of already-supported preview/export values. */
export const CLIP_COLOR_PRESETS: readonly ClipColorPreset[] = [
  { id: "neutral", labelHe: "ללא תיקון", contrast: 1, saturation: 1 },
  { id: "crisp", labelHe: "חד", contrast: 1.15, saturation: 1.1 },
  { id: "vivid", labelHe: "חי", contrast: 1.1, saturation: 1.35 },
  { id: "muted", labelHe: "מרוכך", contrast: 0.95, saturation: 0.6 },
  { id: "mono", labelHe: "שחור-לבן", contrast: 1.05, saturation: 0 },
] as const;

export function colorPreset(id: string | null | undefined): ClipColorPreset | undefined {
  const normalized = String(id || "").trim().toLowerCase();
  return CLIP_COLOR_PRESETS.find((preset) => preset.id === normalized || preset.labelHe === id);
}

export function matchingColorPreset(contrast: number, saturation: number): string {
  return CLIP_COLOR_PRESETS.find((preset) =>
    Math.abs(preset.contrast - contrast) < 1e-6 && Math.abs(preset.saturation - saturation) < 1e-6,
  )?.id || "custom";
}
