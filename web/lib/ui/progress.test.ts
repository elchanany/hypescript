import { describe, expect, it } from "vitest";
import { clampRatio, formatBytes, formatRemaining, remainingSeconds } from "./progress";

describe("transfer progress", () => {
  it("clamps ratios and formats file sizes", () => {
    expect(clampRatio(1.4)).toBe(1);
    expect(clampRatio(-1)).toBe(0);
    expect(formatBytes(5 * 1024 ** 3)).toBe("5.0 GB");
  });

  it("estimates remaining time from measured throughput", () => {
    const value = { count: 1, fileName: "long.mp4", loadedBytes: 25, totalBytes: 100, ratio: .25, startedAt: 1000 };
    expect(remainingSeconds(value, 11000)).toBe(30);
    expect(formatRemaining(90)).toBe("כ־2 דק׳ נותרו");
  });
});
