import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentRunner, formatModeBlock, modeAllowsTool, type AgentEvents } from "./runtime";
import { TOOL_BY_NAME, type AgentContext } from "./tools";
import type { AgentMode, ToolCall } from "./types";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function ctx(): AgentContext {
  return {
    media: [], duration: 0, words: null, transcripts: {}, clips: null, subs: null, overlays: [], tracks: [],
    canvas: { width: 1280, height: 720 }, lastRender: null, askUser: async () => "",
  };
}

/** ספק שמחזיר קריאת-כלי אחת ואז מסיים — כך שהלולאה נסגרת אחרי סבב אחד. */
function stubProviderReturningToolCall(call: ToolCall) {
  let turn = 0;
  const fetchMock = vi.fn(async () => {
    turn += 1;
    const body = turn === 1
      ? { content: null, tool_calls: [call] }
      : { content: "סיימתי.", tool_calls: [] };
    return { ok: true, status: 200, text: async () => JSON.stringify(body) };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("modeAllowsTool", () => {
  it("ask blocks every tool, including read-only ones", () => {
    expect(modeAllowsTool("ask", "list_clips")).toBe(false);
    expect(modeAllowsTool("ask", "get_video_info")).toBe(false);
    expect(modeAllowsTool("ask", "delete_clip")).toBe(false);
  });

  it("plan allows inspection but never a mutation", () => {
    expect(modeAllowsTool("plan", "list_clips")).toBe(true);
    expect(modeAllowsTool("plan", "capture_frame")).toBe(true);
    expect(modeAllowsTool("plan", "delete_clip")).toBe(false);
    expect(modeAllowsTool("plan", "keep_by_script")).toBe(false);
    expect(modeAllowsTool("plan", "export_video")).toBe(false);
  });

  it("act allows everything", () => {
    expect(modeAllowsTool("act", "delete_clip")).toBe(true);
    expect(modeAllowsTool("act", "list_clips")).toBe(true);
  });

  it("names the mode the user must switch to, so the UI button is never a guess", () => {
    expect(formatModeBlock("ask", "delete_clip")).toContain("delete_clip");
    expect(formatModeBlock("ask", "delete_clip")).toContain("בצע");
    expect(formatModeBlock("plan", "delete_clip")).toContain("בצע");
  });
});

// זו הבדיקה שבאמת חשובה: המודל *כן* מחזיר קריאת-כלי משנה (למשל כי המשתמש החליף
// מצב תוך כדי בקשה שכבר בדרך, או כי הספק התעלם מרשימת הכלים). הריצה חייבת
// להיחסם ב-runtime — לא רק "לא לשלוח סכמות".
describe.each<AgentMode>(["ask", "plan"])("runtime enforcement in %s mode", (mode) => {
  it("never invokes a mutating tool even when the provider asks for one", async () => {
    const runSpy = vi.spyOn(TOOL_BY_NAME.delete_clip, "run");
    stubProviderReturningToolCall({ id: "call-1", name: "delete_clip", arguments: { index: 1 } });

    const ends: Array<{ ok: boolean; content: string }> = [];
    const blocked: Array<{ name: string; mode: AgentMode }> = [];
    const events: AgentEvents = {
      onAssistant: vi.fn(), onToolStart: vi.fn(), onToolStatus: vi.fn(),
      onToolEnd: (_id, ok, content) => ends.push({ ok, content: String(content) }),
      onError: vi.fn(), onDone: vi.fn(),
      onModeBlocked: (call, m) => blocked.push({ name: call.name, mode: m }),
    };
    const runner = new AgentRunner("deepseek", ctx(), events);
    runner.mode = mode;

    await runner.send("תמחק את הקליפ הראשון");

    expect(runSpy).not.toHaveBeenCalled();
    expect(blocked).toEqual([{ name: "delete_clip", mode }]);
    expect(ends[0].ok).toBe(false);
    expect(ends[0].content).toContain("נחסם");
    // התוצאה חוזרת ל-LLM כתוצאת-כלי, לא כשגיאת רשת — אחרת הוא ינסה שוב באין-סוף.
    const toolMsg = runner.history.find((m) => m.role === "tool");
    expect(toolMsg).toMatchObject({ tool_call_id: "call-1", name: "delete_clip" });
  });
});

describe("runtime enforcement in plan mode", () => {
  it("still runs a read-only tool", async () => {
    const runSpy = vi.spyOn(TOOL_BY_NAME.list_clips, "run").mockResolvedValue("אין קליפים.");
    stubProviderReturningToolCall({ id: "call-2", name: "list_clips", arguments: {} });
    const blocked: string[] = [];
    const runner = new AgentRunner("deepseek", ctx(), {
      onAssistant: vi.fn(), onToolStart: vi.fn(), onToolStatus: vi.fn(), onToolEnd: vi.fn(),
      onError: vi.fn(), onDone: vi.fn(), onModeBlocked: (c) => blocked.push(c.name),
    });
    runner.mode = "plan";

    await runner.send("מה יש בציר?");

    expect(runSpy).toHaveBeenCalledTimes(1);
    expect(blocked).toEqual([]);
  });
});

describe("runtime enforcement in ask mode", () => {
  it("blocks a read-only tool too — ask is advice only", async () => {
    const runSpy = vi.spyOn(TOOL_BY_NAME.list_clips, "run");
    stubProviderReturningToolCall({ id: "call-3", name: "list_clips", arguments: {} });
    const blocked: string[] = [];
    const runner = new AgentRunner("deepseek", ctx(), {
      onAssistant: vi.fn(), onToolStart: vi.fn(), onToolStatus: vi.fn(), onToolEnd: vi.fn(),
      onError: vi.fn(), onDone: vi.fn(), onModeBlocked: (c) => blocked.push(c.name),
    });
    runner.mode = "ask";

    await runner.send("מה יש בציר?");

    expect(runSpy).not.toHaveBeenCalled();
    expect(blocked).toEqual(["list_clips"]);
  });
});
