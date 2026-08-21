import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentRunner, type AgentEvents } from "./runtime";
import { PLAN_TOOL_SCHEMAS, type AgentContext } from "./tools";

afterEach(() => vi.unstubAllGlobals());

describe("AgentRunner plan mode", () => {
  it("sends only read-only tool schemas and identifies the response as a non-mutating plan", async () => {
    let requestBody: any;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      requestBody = JSON.parse(String(init.body));
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ content: "- [ ] חתוך פתיח", tool_calls: [] }),
      };
    }));
    const assistant: Array<{ text: string; mode: string }> = [];
    const events: AgentEvents = {
      onAssistant: (text, mode) => assistant.push({ text, mode }),
      onToolStart: vi.fn(), onToolStatus: vi.fn(), onToolEnd: vi.fn(), onError: vi.fn(), onDone: vi.fn(),
    };
    const context: AgentContext = {
      media: [], duration: 0, words: null, transcripts: {}, clips: null, subs: null, overlays: [], tracks: [],
      canvas: { width: 1280, height: 720 }, lastRender: null, askUser: async () => "",
    };
    const runner = new AgentRunner("deepseek", context, events);
    runner.mode = "plan";

    await runner.send("תכנן עריכה");

    // Plan may inspect (PLAN_TOOL_SCHEMAS) but the schemas sent never include a mutating tool.
    expect(requestBody.tools).toEqual(PLAN_TOOL_SCHEMAS);
    expect(requestBody.tools.some((t: any) => t.name === "delete_clip" || t.name === "keep_by_script")).toBe(false);
    expect(assistant).toEqual([{ text: "- [ ] חתוך פתיח", mode: "plan" }]);
    expect(runner.history.at(-1)).toMatchObject({ role: "assistant", content: "- [ ] חתוך פתיח" });
  });
});
