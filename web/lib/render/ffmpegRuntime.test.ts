import { describe, expect, it } from "vitest";
import { ffmpegRuntimeUrls } from "./ffmpegRuntime";

describe("ffmpegRuntimeUrls", () => {
  it("uses same-origin static ESM worker/core URLs and never blob URLs", () => {
    const urls = ffmpegRuntimeUrls("https://hypescript.vercel.app/editor");
    expect(urls).toEqual({
      classWorkerURL: "https://hypescript.vercel.app/ffmpeg/worker.js",
      coreURL: "https://hypescript.vercel.app/ffmpeg/ffmpeg-core.js",
      wasmURL: "https://hypescript.vercel.app/ffmpeg/ffmpeg-core.wasm",
    });
    expect(Object.values(urls).every((url) => !url.startsWith("blob:"))).toBe(true);
  });
});
