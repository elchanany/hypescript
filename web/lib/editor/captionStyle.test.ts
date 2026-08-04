import { describe, it, expect } from "vitest";
import {
  captionStyleToCss,
  DEFAULT_CAPTION_STYLE,
  normalizeCaptionStyle,
} from "./captionStyle";

describe("captionStyle", () => {
  it("returns defaults for empty/invalid input", () => {
    expect(normalizeCaptionStyle(null)).toEqual(DEFAULT_CAPTION_STYLE);
    expect(normalizeCaptionStyle({ fontSize: 99, color: "red" }).fontSize).toBe(12);
    expect(normalizeCaptionStyle({ color: "red" }).color).toBe(DEFAULT_CAPTION_STYLE.color);
  });

  it("clamps and accepts valid patches", () => {
    const s = normalizeCaptionStyle({
      fontSize: 6,
      color: "#ffcc00",
      bold: false,
      position: "top",
      bg: "box",
    });
    expect(s).toEqual({
      fontSize: 6,
      color: "#ffcc00",
      bold: false,
      position: "top",
      bg: "box",
    });
  });

  it("maps style to CSS for preview", () => {
    const css = captionStyleToCss({ ...DEFAULT_CAPTION_STYLE, position: "center", bg: "box" });
    expect(css.top).toBe("50%");
    expect(css.background).toContain("rgba");
    expect(css.color).toBe("#ffffff");
  });
});
