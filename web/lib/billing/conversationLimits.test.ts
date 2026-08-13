import { describe, expect, it } from "vitest";
import { conversationPinLimit } from "./conversationLimits";

describe("conversation pin limits", () => {
  it("allows 5 pins for regular users and 15 for pro", () => {
    expect(conversationPinLimit("free")).toBe(5);
    expect(conversationPinLimit(null)).toBe(5);
    expect(conversationPinLimit("pro")).toBe(15);
  });

  it("gives creator an intermediate allowance", () => {
    expect(conversationPinLimit("creator")).toBe(10);
    expect(conversationPinLimit("trial")).toBe(5);
  });
});
