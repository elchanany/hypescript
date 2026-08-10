import { describe, expect, it } from "vitest";
import { formatTime, safeDownloadName } from "./videoCard";

describe("formatTime", () => {
  it("formats seconds as mm:ss", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(600)).toBe("10:00");
    expect(formatTime(3599)).toBe("59:59");
  });

  it("pads seconds with a leading zero", () => {
    expect(formatTime(9)).toBe("0:09");
    expect(formatTime(61)).toBe("1:01");
  });

  it("handles negative and non-finite input", () => {
    expect(formatTime(-5)).toBe("0:00");
    expect(formatTime(NaN)).toBe("0:00");
    expect(formatTime(Infinity)).toBe("0:00");
  });
});

describe("safeDownloadName", () => {
  it("appends .mp4 when missing", () => {
    expect(safeDownloadName("lesson")).toBe("lesson.mp4");
    expect(safeDownloadName("שיעור")).toBe("שיעור.mp4");
  });

  it("keeps an existing .mp4 suffix", () => {
    expect(safeDownloadName("lesson.mp4")).toBe("lesson.mp4");
    expect(safeDownloadName("lesson.MP4")).toBe("lesson.mp4");
  });

  it("strips unsafe filename characters", () => {
    expect(safeDownloadName('a/b\\c:d*e?f"g<h>i|j')).toBe("a_b_c_d_e_f_g_h_i_j.mp4");
  });

  it("falls back when the name is empty", () => {
    expect(safeDownloadName("")).toBe("video.mp4");
    expect(safeDownloadName("   ")).toBe("video.mp4");
  });
});