export interface FFmpegRuntimeUrls {
  classWorkerURL: string;
  coreURL: string;
  wasmURL: string;
}

/**
 * Same-origin URLs for the official FFmpeg ESM worker and core.
 *
 * Keeping these as HTTP URLs is both faster and more reliable than fetching
 * 32 MB, copying it into a Blob and asking a bundled worker to dynamically
 * import the resulting `blob:` URL.
 */
export function ffmpegRuntimeUrls(origin: string): FFmpegRuntimeUrls {
  const base = new URL("/ffmpeg/", origin);
  return {
    classWorkerURL: new URL("worker.js", base).href,
    coreURL: new URL("ffmpeg-core.js", base).href,
    wasmURL: new URL("ffmpeg-core.wasm", base).href,
  };
}
