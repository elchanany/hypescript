import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { dismissToast, pushToast, subscribeToasts } from "./toast";

describe("toast bus", () => {
  beforeEach(() => {
    // drain any leftover toasts
    let cur: { id: string }[] = [];
    const unsub = subscribeToasts((items) => { cur = items; });
    cur.forEach((t) => dismissToast(t.id));
    unsub();
  });
  afterEach(() => { vi.useRealTimers(); });

  it("pushes and notifies subscribers", () => {
    const seen: string[] = [];
    const unsub = subscribeToasts((items) => {
      seen.push(items.map((t) => t.title).join(","));
    });
    pushToast("success", "נוצר", undefined, 0);
    expect(seen.at(-1)).toContain("נוצר");
    unsub();
  });

  it("auto-dismisses after ms", () => {
    vi.useFakeTimers();
    let last = 0;
    const unsub = subscribeToasts((items) => { last = items.length; });
    pushToast("info", "זמני", undefined, 1000);
    expect(last).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(last).toBe(0);
    unsub();
  });
});
