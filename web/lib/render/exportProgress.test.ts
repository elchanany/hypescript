import { describe, expect, it } from "vitest";
import { estimateRemainingSeconds, exportPercent, formatBytes, formatDurationHe } from "./exportProgress";

describe("export progress", () => {
  it("clamps progress into a stable UI percent", () => {
    expect(exportPercent(-1)).toBe(0);
    expect(exportPercent(0.426)).toBe(43);
    expect(exportPercent(2)).toBe(100);
  });

  it("estimates remaining time only after a useful sample", () => {
    expect(estimateRemainingSeconds(0.01, 20)).toBeNull();
    expect(estimateRemainingSeconds(0.25, 10)).toBe(30);
    expect(estimateRemainingSeconds(1, 10)).toBeNull();
  });

  it("formats time and output size for Hebrew UI", () => {
    expect(formatDurationHe(75)).toBe("1 דק׳ 15 שנ׳");
    expect(formatBytes(15 * 1024 * 1024)).toBe("15 MB");
  });
});
