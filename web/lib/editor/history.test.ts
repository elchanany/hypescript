import { describe, it, expect } from "vitest";
import { createHistory } from "./history";

describe("history (undo/redo)", () => {
  it("undo then redo returns through states", () => {
    const h = createHistory<number>();
    h.push(0); // about to move 0 -> 1
    h.push(1); // about to move 1 -> 2 ; current is 2
    let cur = 2;
    const u1 = h.undo(cur); expect(u1).toBe(1); cur = u1!;
    const u2 = h.undo(cur); expect(u2).toBe(0); cur = u2!;
    expect(h.undo(cur)).toBeNull();
    const r1 = h.redo(cur); expect(r1).toBe(1); cur = r1!;
    const r2 = h.redo(cur); expect(r2).toBe(2); cur = r2!;
    expect(h.redo(cur)).toBeNull();
  });

  it("a new push clears the redo stack", () => {
    const h = createHistory<number>();
    h.push(0);
    let cur = 1;
    cur = h.undo(cur)!; // cur=0, future=[1]
    expect(h.canRedo()).toBe(true);
    h.push(cur); // new branch
    expect(h.canRedo()).toBe(false);
  });

  it("respects the depth limit", () => {
    const h = createHistory<number>(3);
    for (let i = 0; i < 10; i++) h.push(i);
    expect(h.depth().past).toBe(3);
  });

  it("reset clears everything", () => {
    const h = createHistory<number>();
    h.push(1); h.push(2);
    h.reset();
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
  });
});
