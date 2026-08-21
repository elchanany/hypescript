import { describe, expect, it } from "vitest";
import { HEBREW_TERM_COUNT, isHebrewQuery, translateSearchQuery } from "./hebrewSearchTerms";

describe("isHebrewQuery", () => {
  it("detects Hebrew letters", () => {
    expect(isHebrewQuery("חץ")).toBe(true);
    expect(isHebrewQuery("arrow")).toBe(false);
    expect(isHebrewQuery("")).toBe(false);
    expect(isHebrewQuery("logo 2024")).toBe(false);
  });
});

describe("translateSearchQuery", () => {
  it("passes a non-Hebrew query through untouched", () => {
    expect(translateSearchQuery("arrow right")).toBe("arrow right");
    expect(translateSearchQuery("  youtube ")).toBe("youtube");
  });

  it("translates a single Hebrew word", () => {
    expect(translateSearchQuery("חץ")).toBe("arrow");
    expect(translateSearchQuery("לב")).toBe("heart");
    expect(translateSearchQuery("מצלמה")).toBe("camera");
  });

  it("translates a multi-word phrase before falling back to word-by-word", () => {
    expect(translateSearchQuery("מגן דוד")).toBe("star of david");
  });

  it("handles a Hebrew prefix letter (ה/ו/ב)", () => {
    expect(translateSearchQuery("הלב")).toBe("heart");
  });

  it("de-duplicates repeated English words", () => {
    expect(translateSearchQuery("ערוך עריכה")).toBe("edit");
  });

  it("covers the product's own audience (Torah content)", () => {
    expect(translateSearchQuery("תורה")).toBe("torah");
    expect(translateSearchQuery("נרות")).toBe("candles");
  });

  it("returns an empty string for unknown Hebrew, so the caller can say so honestly", () => {
    expect(translateSearchQuery("קרמבו")).toBe("");
  });

  it("is empty for an empty input", () => {
    expect(translateSearchQuery("")).toBe("");
    expect(translateSearchQuery("   ")).toBe("");
  });

  it("knows a useful number of terms", () => {
    expect(HEBREW_TERM_COUNT).toBeGreaterThan(100);
  });
});
