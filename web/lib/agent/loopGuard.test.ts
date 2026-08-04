import { describe, it, expect, vi } from "vitest";

// בודקים את לוגיקת האנטי-לופ דרך ייצוא עקיף — מדמים את אותה ספירה כמו ב-runtime.
const LOOP_GUARDS: Record<string, { limit: number; hint: string }> = {
  delete_clip: { limit: 3, hint: "נחסם: יותר מדי delete_clip" },
  edit_subtitle: { limit: 4, hint: "נחסם: יותר מדי edit_subtitle" },
};

function wouldBlock(recent: string[], name: string): string | null {
  const guard = LOOP_GUARDS[name];
  if (!guard) return null;
  const window = recent.slice(-12);
  const count = window.filter((n) => n === name).length;
  if (count + 1 > guard.limit) return guard.hint;
  return null;
}

describe("agent loop guards", () => {
  it("blocks delete_clip after 3 in window", () => {
    const recent = ["delete_clip", "delete_clip", "delete_clip"];
    expect(wouldBlock(recent, "delete_clip")).toMatch(/נחסם/);
  });

  it("allows delete_clip under limit", () => {
    expect(wouldBlock(["delete_clip", "delete_clip"], "delete_clip")).toBeNull();
  });

  it("does not block unrelated tools", () => {
    const recent = ["delete_clip", "delete_clip", "delete_clip"];
    expect(wouldBlock(recent, "keep_by_script")).toBeNull();
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

// quiet unused
void vi;
