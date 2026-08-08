import { describe, expect, it, vi } from "vitest";
import { AgentRunner, type AgentEvents } from "./runtime";
import { TOOL_BY_NAME, type AgentContext, type ToolMeta } from "./tools";
import { ensureBuiltinCommands } from "@/lib/editor/commands.builtin";
import type { EditorApi } from "@/lib/editor/commands";

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

  it("captures a checkpoint before a mutating retry", async () => {
    ensureBuiltinCommands();
    let clips: any[] = [{ id: "c1", sourceId: "m1", start: 0, end: 2, enabled: true }];
    const api: EditorApi = {
      getClips: () => clips, setClips: (next) => { clips = next || []; }, getOverlays: () => [], setOverlays: vi.fn(),
      updateOverlay: vi.fn(), removeOverlay: vi.fn(), addOverlay: vi.fn(),
      updateClip: (id, patch) => { clips = clips.map((c) => c.id === id ? { ...c, ...patch } : c); },
      getMedia: () => [], getSubs: () => [], setSubs: vi.fn(), getTracks: () => [], setTracks: vi.fn(),
      getCanvas: () => ({ width: 1280, height: 720 }), selectClip: vi.fn(), selectOverlay: vi.fn(), seek: vi.fn(), getPlayhead: () => 0,
      getSnapshot: () => ({ clips, subs: [], tracks: [], overlays: [] }), restoreSnapshot: vi.fn(),
    };
    const ctx = context(); ctx.clips = clips; ctx.editorApi = api;
    const checkpoints: any[] = [];
    const events: AgentEvents = {
      onAssistant: vi.fn(), onToolStart: vi.fn(), onToolStatus: vi.fn(), onToolEnd: vi.fn(), onError: vi.fn(), onDone: vi.fn(),
      onCheckpoint: (call, snapshot) => checkpoints.push({ call, snapshot }),
    };
    const runner = new AgentRunner("deepseek", ctx, events);
    await runner.retryTool("set_clip_enabled", { index: 1, enabled: false });
    expect(checkpoints).toHaveLength(1);
    expect(checkpoints[0].snapshot.clips[0].enabled).toBe(true);
    expect(clips[0].enabled).toBe(false);
  });

  it("emits binary artifacts once while keeping only text in LLM history", async () => {
    const blob = new Blob(["hello"], { type: "text/plain" });
    const tool: ToolMeta = {
      name: "test_artifact", label: "test", color: "#000", icon: "x",
      schema: { name: "test_artifact", description: "test", parameters: { type: "object", properties: {} } },
      run: async () => ({
        text: "artifact ready",
        artifacts: [
          { blob, name: "hello.txt", kind: "srt" },
          { blob, name: "duplicate.txt", kind: "srt" },
        ],
      }),
    };
    TOOL_BY_NAME.test_artifact = tool;
    const artifacts: any[] = [];
    const events: AgentEvents = {
      onAssistant: vi.fn(), onToolStart: vi.fn(), onToolStatus: vi.fn(), onToolEnd: vi.fn(), onError: vi.fn(), onDone: vi.fn(),
      onArtifact: (artifact, call) => artifacts.push({ artifact, call }),
    };
    try {
      const runner = new AgentRunner("deepseek", context(), events);
      await runner.retryTool("test_artifact", {});
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].artifact).toMatchObject({ blob, name: "hello.txt", kind: "srt" });
      expect(runner.history.at(-1)).toMatchObject({ role: "tool", content: "artifact ready" });
      expect(JSON.stringify(runner.history)).not.toContain("hello.txt");
    } finally {
      delete TOOL_BY_NAME.test_artifact;
    }
  });
});
