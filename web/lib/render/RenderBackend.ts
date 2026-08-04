// RenderBackend — the single seam the product renders through, so the engine can
// change (browser wasm -> local native FFmpeg -> cloud) without touching the editor,
// timeline, preview or export UI. See docs/RENDER_BACKEND.md for the native plan.

import { Clip, MediaAsset } from "@/lib/editor/model";
import { Overlay } from "@/lib/editor/overlay";
import { CanvasSize } from "@/lib/editor/canvasCoords";
import { Sub } from "@/lib/editor/subtitlesEdl";
import { CaptionStyle } from "@/lib/editor/captionStyle";
import { RenderTarget } from "@/lib/render/graph";

export type ExecutionMode = "local-browser" | "local-native" | "cloud";

export interface RenderCapabilities {
  render: boolean;      // final project export
  proxy: boolean;       // low-res proxies
  thumbnails: boolean;  // filmstrip thumbnails
  waveform: boolean;    // audio waveforms
  transcribe: boolean;  // speech-to-text
}

export interface RenderRequest {
  media: MediaAsset[];
  clips: Clip[];
  target?: RenderTarget;
  audioMuted?: boolean;
  overlays?: Overlay[];
  canvas?: CanvasSize;
  subs?: Sub[] | null;
  captionStyle?: CaptionStyle | null;
  burnCaptions?: boolean;
}

export interface RenderBackend {
  readonly id: string;
  readonly displayName: string;
  readonly executionMode: ExecutionMode;
  readonly capabilities: RenderCapabilities;
  /** True only after a real check (e.g. native service health-check). Never assume. */
  isAvailable(): Promise<boolean>;
  /** Export the project to a single continuous MP4. Honors onProgress and AbortSignal. */
  renderProject(req: RenderRequest, onProgress?: (r: number) => void, signal?: AbortSignal): Promise<Blob>;
}

// --- Browser backend: current ffmpeg.wasm engine, wrapped behind the interface. ---
class BrowserRenderBackend implements RenderBackend {
  readonly id = "browser-wasm";
  readonly displayName = "דפדפן (ffmpeg.wasm)";
  readonly executionMode: ExecutionMode = "local-browser";
  // Honest capabilities: only final render is wired here. Others belong to the
  // native backend and must not be advertised until they actually work.
  readonly capabilities: RenderCapabilities = { render: true, proxy: false, thumbnails: false, waveform: false, transcribe: false };

  async isAvailable() { return typeof window !== "undefined"; }

  async renderProject(req: RenderRequest, onProgress?: (r: number) => void, signal?: AbortSignal): Promise<Blob> {
    const { renderEDL } = await import("@/lib/ffmpeg");
    return renderEDL(req.media, req.clips, onProgress, req.target, {
      audioMuted: req.audioMuted,
      signal,
      overlays: req.overlays,
      canvas: req.canvas,
      subs: req.subs,
      captionStyle: req.captionStyle,
      burnCaptions: req.burnCaptions,
    });
  }
}

const browserBackend = new BrowserRenderBackend();

// Factory. Today returns the browser backend; when the local native service exists it
// becomes: check LocalNativeRenderBackend.isAvailable() -> prefer it, else surface a
// "start the local service" message (never silently fall back / upload).
export function getRenderBackend(): RenderBackend {
  return browserBackend;
}
