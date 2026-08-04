import { describe, expect, it } from "vitest";
import { formatDurationHe } from "./preview";

describe("formatDurationHe", () => {
  it("formats minutes and seconds", () => {
    expect(formatDurationHe(65)).toBe("1:05");
    expect(formatDurationHe(9)).toBe("0:09");
  });

  it("formats hours", () => {
    expect(formatDurationHe(3661)).toBe("1:01:01");
  });

  it("returns empty for zero/invalid", () => {
    expect(formatDurationHe(0)).toBe("");
    expect(formatDurationHe(-3)).toBe("");
    expect(formatDurationHe(Number.NaN)).toBe("");
  });
});
