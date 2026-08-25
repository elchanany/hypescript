import {
  type Clip,
  clipAudioFades,
  clipContrast,
  clipDur,
  clipEffectAmount,
  clipFlipX,
  clipFlipY,
  clipOpacity,
  clipSaturation,
  clipVisualFades,
  clipVolume,
} from "@/lib/editor/model";
import { isGapClip } from "@/lib/editor/timelineOps";
import { clipLook } from "@/lib/creative/clipLook";
import type { MaterializedOverlay } from "./materializeOverlays";

export interface CloudClipRequest {
  assetId?: string;
  gap?: boolean;
  start: number;
  end: number;
  volume?: number;
  fadeIn?: number;
  fadeOut?: number;
  visualFadeIn?: number;
  visualFadeOut?: number;
  flipX?: boolean;
  flipY?: boolean;
  opacity?: number;
  contrast?: number;
  saturation?: number;
  effectId?: string;
  effectAmount?: number;
}

export interface CloudWorkerClip extends CloudClipRequest {
  volume: number;
  fadeIn: number;
  fadeOut: number;
  visualFadeIn: number;
  visualFadeOut: number;
  flipX: boolean;
  flipY: boolean;
  opacity: number;
  look: string;
}

export interface CloudOverlayRequest {
  assetId?: string;
  inlinePngBase64?: string;
  start: number;
  end: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  fadeIn: number;
  fadeOut: number;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
}

/** Convert the shared Preview/WASM overlay materialization into a cloud input. */
export function cloudOverlayFromMaterialized(
  item: MaterializedOverlay,
  cloudAssetId?: string,
): CloudOverlayRequest {
  const source = item.bytes
    ? { inlinePngBase64: bytesToBase64(item.bytes) }
    : cloudAssetId ? { assetId: cloudAssetId } : null;
  if (!source) throw new Error("חסר מקור ענן לשכבה בזמן הייצוא.");
  const spec = item.spec;
  return {
    ...source,
    start: spec.start,
    end: spec.end,
    x: spec.x,
    y: spec.y,
    width: spec.w,
    height: spec.h,
    rotation: spec.rotation,
    opacity: spec.opacity,
    fadeIn: spec.fadeIn || 0,
    fadeOut: spec.fadeOut || 0,
  };
}

/** Serialize every visual/audio clip property that the browser exporter honors. */
export function cloudClipFromEditor(clip: Clip, cloudAssetId?: string): CloudClipRequest {
  if (isGapClip(clip)) {
    return { gap: true, start: 0, end: clipDur(clip) };
  }
  const audio = clipAudioFades(clip);
  const visual = clipVisualFades(clip);
  return {
    assetId: cloudAssetId,
    start: clip.start,
    end: clip.end,
    volume: clipVolume(clip),
    fadeIn: audio.fadeIn,
    fadeOut: audio.fadeOut,
    visualFadeIn: visual.fadeIn,
    visualFadeOut: visual.fadeOut,
    flipX: clipFlipX(clip),
    flipY: clipFlipY(clip),
    opacity: clipOpacity(clip),
    contrast: clipContrast(clip),
    saturation: clipSaturation(clip),
    ...(clip.effectId ? { effectId: clip.effectId, effectAmount: clipEffectAmount(clip) } : {}),
  };
}

function record(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function finite(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

/**
 * Server-side trust boundary. The browser sends structured state; the server
 * clamps it and resolves the catalog ID through clipLook, so the worker never
 * executes an arbitrary user-supplied FFmpeg filter string.
 */
export function parseCloudClips(value: unknown): CloudWorkerClip[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 1000) return null;
  const parsed: CloudWorkerClip[] = [];
  for (const candidate of value) {
    const item = record(candidate);
    if (!item) return null;
    const start = finite(item.start, Number.NaN);
    const end = finite(item.end, Number.NaN);
    const gap = item.gap === true;
    const assetId = typeof item.assetId === "string" ? item.assetId : "";
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || (!gap && !assetId)) return null;

    const clip: Clip = {
      id: "cloud",
      sourceId: gap ? "__gap__" : assetId,
      start,
      end,
      volume: finite(item.volume, 1),
      fadeIn: finite(item.fadeIn, 0),
      fadeOut: finite(item.fadeOut, 0),
      visualFadeIn: finite(item.visualFadeIn, 0),
      visualFadeOut: finite(item.visualFadeOut, 0),
      flipX: item.flipX === true,
      flipY: item.flipY === true,
      opacity: finite(item.opacity, 1),
      contrast: finite(item.contrast, 1),
      saturation: finite(item.saturation, 1),
      effectId: typeof item.effectId === "string" && item.effectId.length <= 80 ? item.effectId : undefined,
      effectAmount: finite(item.effectAmount, 1),
    };
    const audio = clipAudioFades(clip);
    const visual = clipVisualFades(clip);
    parsed.push({
      ...(gap ? { gap: true } : { assetId }),
      start,
      end,
      volume: clipVolume(clip),
      fadeIn: audio.fadeIn,
      fadeOut: audio.fadeOut,
      visualFadeIn: visual.fadeIn,
      visualFadeOut: visual.fadeOut,
      flipX: clipFlipX(clip),
      flipY: clipFlipY(clip),
      opacity: clipOpacity(clip),
      contrast: clipContrast(clip),
      saturation: clipSaturation(clip),
      ...(clip.effectId ? { effectId: clip.effectId, effectAmount: clipEffectAmount(clip) } : {}),
      look: gap ? "" : clipLook(clip).ffmpeg,
    });
  }
  return parsed;
}
