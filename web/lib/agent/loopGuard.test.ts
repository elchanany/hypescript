import { describe, it, expect } from "vitest";
import { agentLoopGuard, formatToolError } from "./runtime";

describe("agent loop guards", () => {
  it("blocks delete_clip after 3 in window", () => {
    const recent = ["delete_clip", "delete_clip", "delete_clip"];
    expect(agentLoopGuard(recent, "delete_clip")).toMatch(/נחסם/);
  });

  it("allows delete_clip under limit", () => {
    expect(agentLoopGuard(["delete_clip", "delete_clip"], "delete_clip")).toBeNull();
  });

  it("does not block unrelated tools", () => {
    const recent = ["delete_clip", "delete_clip", "delete_clip"];
    expect(agentLoopGuard(recent, "keep_by_script")).toBeNull();
  });

  it("blocks repeated overlay rebuild and export loops", () => {
    expect(agentLoopGuard(["add_image_overlay", "add_image_overlay"], "add_image_overlay")).toMatch(/נחסם/);
    expect(agentLoopGuard(["render_video"], "render_video")).toMatch(/נחסם/);
    expect(agentLoopGuard(["list_overlays"], "list_overlays")).toBeNull();
  });
});
describe("export error formatting", () => {
  it("keeps local FFmpeg failures specific instead of suggesting a generic refresh", () => {
    const result = formatToolError("מנוע הייצוא המקומי חסר (ffmpeg-core.wasm, HTTP 404)");
    expect(result).toContain("שגיאת ייצוא");
    expect(result).toContain("HTTP 404");
    expect(result).not.toContain("רענון דף");
  });
});
describe("chunk error detection", () => {
  const isChunk = (m: string) =>
    /Loading chunk\s+[\w.-]+\s+failed|ChunkLoadError|error loading dynamically imported module/i.test(m);

  it("detects next chunk failures", () => {
    expect(isChunk("Loading chunk 121 failed. (error: https://hypescript.vercel.app/_next/static/chunks/121.9a49e091c3b05a15.js)")).toBe(true);
    expect(isChunk("normal error")).toBe(false);
  });
});
