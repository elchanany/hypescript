import { describe, it, expect } from "vitest";
import {
  collapseConsecutiveTools,
  toolGroupTitle,
  toolGroupSummary,
  CollapsibleTool,
} from "./collapseTools";

const tool = (partial: Partial<CollapsibleTool> & Pick<CollapsibleTool, "id" | "name">): CollapsibleTool => ({
  kind: "tool",
  label: partial.label || partial.name,
  color: "#ef4444",
  status: "הושלם",
  state: "ok",
  summary: "",
  time: "12:00",
  ...partial,
});

describe("collapseConsecutiveTools", () => {
  it("leaves singles and non-tools alone", () => {
    const items = [
      { kind: "user" as const, text: "hi" },
      tool({ id: "1", name: "delete_clip", summary: "נמחק. 1" }),
      { kind: "assistant" as const, text: "done" },
    ];
    const r = collapseConsecutiveTools(items);
    expect(r).toHaveLength(3);
    expect(r[1]).toMatchObject({ kind: "tool", name: "delete_clip", count: 1 });
  });

  it("collapses consecutive same-name tools and keeps last summary", () => {
    const items = [
      tool({ id: "a", name: "delete_clip", label: "מחיקת קליפ", summary: "נמחק. 1 קליפים" }),
      tool({ id: "b", name: "delete_clip", label: "מחיקת קליפ", summary: "נמחק. 2 קליפים" }),
      tool({ id: "c", name: "delete_clip", label: "מחיקת קליפ", summary: "נמחק. 3 קליפים" }),
    ];
    const r = collapseConsecutiveTools(items);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      kind: "tool",
      name: "delete_clip",
      count: 3,
      summary: "נמחק. 3 קליפים",
      state: "ok",
    });
  });

  it("does not collapse across different tool names", () => {
    const items = [
      tool({ id: "a", name: "delete_clip" }),
      tool({ id: "b", name: "delete_subtitle", label: "מחיקת כתובית" }),
      tool({ id: "c", name: "delete_clip" }),
    ];
    const r = collapseConsecutiveTools(items);
    expect(r.map((x) => (x as CollapsibleTool).name)).toEqual([
      "delete_clip",
      "delete_subtitle",
      "delete_clip",
    ]);
    expect(r.map((x) => (x as { count: number }).count)).toEqual([1, 1, 1]);
  });

  it("breaks groups on intervening messages", () => {
    const items = [
      tool({ id: "a", name: "delete_clip", summary: "1" }),
      tool({ id: "b", name: "delete_clip", summary: "2" }),
      { kind: "assistant" as const, text: "רגע" },
      tool({ id: "c", name: "delete_clip", summary: "3" }),
    ];
    const r = collapseConsecutiveTools(items);
    expect(r).toHaveLength(3);
    expect(r[0]).toMatchObject({ count: 2, summary: "2" });
    expect(r[2]).toMatchObject({ count: 1, summary: "3" });
  });

  it("propagates running/error state across the group", () => {
    const items = [
      tool({ id: "a", name: "delete_clip", state: "ok" }),
      tool({ id: "b", name: "delete_clip", state: "running", status: "מוחק…" }),
    ];
    expect(collapseConsecutiveTools(items)[0]).toMatchObject({ state: "running", count: 2, status: "מוחק…" });

    const err = collapseConsecutiveTools([
      tool({ id: "a", name: "delete_clip", state: "ok" }),
      tool({ id: "b", name: "delete_clip", state: "error", summary: "שגיאה" }),
    ]);
    expect(err[0]).toMatchObject({ state: "error", count: 2, summary: "שגיאה" });
  });

  it("keeps retry arguments and duration from the latest collapsed call", () => {
    const r = collapseConsecutiveTools([
      tool({ id: "a", name: "delete_clip", args: { index: 1 }, durationMs: 120 }),
      tool({ id: "b", name: "delete_clip", state: "error", args: { index: 2 }, durationMs: 340 }),
    ]);
    expect(r[0]).toMatchObject({ count: 2, state: "error", args: { index: 2 }, durationMs: 340 });
  });
});

describe("toolGroupTitle / toolGroupSummary", () => {
  it("titles with ×N when collapsed", () => {
    expect(toolGroupTitle("מחיקת קליפ", 1)).toBe("מחיקת קליפ");
    expect(toolGroupTitle("מחיקת קליפ", 55)).toBe("מחיקת קליפ ×55");
  });

  it("summarizes deletes by noun", () => {
    expect(toolGroupSummary("delete_clip", 55, "נמחק. 55 קליפים", "הושלם", "ok")).toBe(
      "נמחקו 55 קליפים",
    );
    expect(toolGroupSummary("delete_subtitle", 3, "נמחק.", "הושלם", "ok")).toBe(
      "נמחקו 3 כתוביות",
    );
    expect(toolGroupSummary("delete_clip", 1, "נמחק. 1", "הושלם", "ok")).toBe("נמחק. 1");
    expect(toolGroupSummary("delete_clip", 2, "", "מוחק…", "running")).toBe("מוחק… (×2)");
    expect(toolGroupSummary("unknown_tool", 4, "סיכום אחרון", "הושלם", "ok")).toBe("סיכום אחרון");
  });
});
