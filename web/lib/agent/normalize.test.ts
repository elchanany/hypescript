import { describe, it, expect } from "vitest";
import { repairToolMessages, isToolHistoryValid, CANCELLED_RESULT } from "./normalize";
import { ChatMessage } from "./types";

const asst = (tool_calls: { id: string; name: string }[], content: string | null = null): ChatMessage => ({
  role: "assistant", content, tool_calls: tool_calls.map((t) => ({ id: t.id, name: t.name, arguments: {} })),
});
const toolRes = (id: string, name = "t", content = "ok"): ChatMessage => ({ role: "tool", tool_call_id: id, name, content });

describe("repairToolMessages", () => {
  it("leaves a valid history unchanged and idempotent", () => {
    const h: ChatMessage[] = [
      { role: "user", content: "hi" },
      asst([{ id: "a", name: "get_video_info" }]),
      toolRes("a"),
      { role: "assistant", content: "done" },
    ];
    const once = repairToolMessages(h);
    expect(once).toEqual(h);
    expect(repairToolMessages(once)).toEqual(once);
    expect(isToolHistoryValid(h)).toBe(true);
  });

  it("adds a synthetic result for a tool_call with NO response (the DeepSeek 400 case)", () => {
    const h: ChatMessage[] = [
      { role: "user", content: "cut it" },
      asst([{ id: "call_1", name: "keep_by_script" }]),
      // interrupted: no tool result, then the run resumes with another user turn
      { role: "user", content: "continue" },
    ];
    expect(isToolHistoryValid(h)).toBe(false);
    const r = repairToolMessages(h);
    expect(r[2]).toEqual({ role: "tool", tool_call_id: "call_1", name: "keep_by_script", content: CANCELLED_RESULT });
    expect(r[3]).toEqual({ role: "user", content: "continue" });
    expect(isToolHistoryValid(r)).toBe(true);
  });

  it("fills only the MISSING id when a parallel call is partially answered", () => {
    const h: ChatMessage[] = [
      asst([{ id: "x", name: "a" }, { id: "y", name: "b" }]),
      toolRes("x", "a"),
      // "y" missing
    ];
    const r = repairToolMessages(h);
    const ids = r.filter((m) => m.role === "tool").map((m) => m.tool_call_id);
    expect(ids).toEqual(["x", "y"]);
    expect((r.find((m) => m.role === "tool" && m.tool_call_id === "y") as any).content).toBe(CANCELLED_RESULT);
    expect(isToolHistoryValid(r)).toBe(true);
  });

  it("drops an orphan tool result with no preceding tool_call", () => {
    const h: ChatMessage[] = [
      { role: "user", content: "hi" },
      toolRes("ghost"),
      { role: "assistant", content: "hey" },
    ];
    const r = repairToolMessages(h);
    expect(r.some((m) => m.role === "tool")).toBe(false);
    expect(isToolHistoryValid(r)).toBe(true);
  });

  it("drops duplicate tool results for the same id", () => {
    const h: ChatMessage[] = [asst([{ id: "d", name: "a" }]), toolRes("d", "a", "first"), toolRes("d", "a", "dup")];
    const r = repairToolMessages(h);
    expect(r.filter((m) => m.role === "tool").length).toBe(1);
    expect((r[1] as any).content).toBe("first");
  });

  it("handles consecutive tool-call turns", () => {
    const h: ChatMessage[] = [
      asst([{ id: "1", name: "a" }]), toolRes("1"),
      asst([{ id: "2", name: "b" }]), // missing
      { role: "user", content: "next" },
    ];
    const r = repairToolMessages(h);
    expect(isToolHistoryValid(r)).toBe(true);
    expect(r.filter((m) => m.role === "tool").map((m) => m.tool_call_id)).toEqual(["1", "2"]);
  });
});
