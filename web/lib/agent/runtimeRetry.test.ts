import { describe, expect, it, vi } from "vitest";
import { AgentRunner, type AgentEvents } from "./runtime";
import type { AgentContext } from "./tools";

function context(): AgentContext {
  return {
    media: [], duration: 0, words: null, transcripts: {}, clips: null, subs: null, overlays: [], tracks: [],
    canvas: { width: 1280, height: 720 }, lastRender: null,
    askUser: async () => "",
  };
}

describe("AgentRunner exact tool retry", () => {
  it("replays the same arguments and writes a valid assistant/tool history pair", async () => {
    const starts: any[] = [], ends: any[] = [];
    const events: AgentEvents = {
      onAssistant: vi.fn(), onToolStatus: vi.fn(), onError: vi.fn(), onDone: vi.fn(),
      onToolStart: (call, provider) => starts.push({ call, provider }),
      onToolEnd: (id, ok, summary) => ends.push({ id, ok, summary }),
    };
    const runner = new AgentRunner("deepseek", context(), events);
    await runner.retryTool("list_media", { filter: "video" });
    expect(starts[0].call.arguments).toEqual({ filter: "video" });
    expect(ends[0]).toMatchObject({ ok: true, summary: "אין מדיה טעונה." });
    expect(runner.history[0]).toMatchObject({ role: "assistant", tool_calls: [{ name: "list_media", arguments: { filter: "video" } }] });
    expect(runner.history[1]).toMatchObject({ role: "tool", name: "list_media", content: "אין מדיה טעונה." });
    expect(events.onDone).toHaveBeenCalledOnce();
  });
});
