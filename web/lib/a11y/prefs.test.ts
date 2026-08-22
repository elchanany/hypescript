import { describe, expect, it } from "vitest";
import {
  DEFAULT_A11Y_PREFS,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  TEXT_SIZE_STEPS,
  clampFontScale,
  mergeAccountSettingsIntoPrefs,
  parseA11yPrefs,
  serializeA11yPrefs,
  stepFontScale,
  type A11yPrefs,
} from "./prefs";

describe("clampFontScale", () => {
  it("passes a value already inside the range through untouched", () => {
    expect(clampFontScale(1.1)).toBe(1.1);
  });

  it("clamps values below the minimum", () => {
    expect(clampFontScale(0.1)).toBe(FONT_SCALE_MIN);
    expect(clampFontScale(-5)).toBe(FONT_SCALE_MIN);
  });

  it("clamps values above the maximum", () => {
    expect(clampFontScale(5)).toBe(FONT_SCALE_MAX);
  });

  it("falls back to 1 for NaN, missing, or non-numeric input", () => {
    expect(clampFontScale(undefined)).toBe(1);
    expect(clampFontScale(null)).toBe(1);
    expect(clampFontScale("not a number")).toBe(1);
    expect(clampFontScale(NaN)).toBe(1);
  });

  it("rounds away float noise", () => {
    expect(clampFontScale(1.049999999999998)).toBe(1.05);
  });

  it("accepts numeric strings, matching how it is used server-side", () => {
    expect(clampFontScale("1.2")).toBe(1.2);
  });
});

describe("stepFontScale", () => {
  it("moves to the next step up", () => {
    expect(stepFontScale(1, 1)).toBe(1.15);
  });

  it("moves to the previous step down", () => {
    expect(stepFontScale(1, -1)).toBe(0.85);
  });

  it("does not exceed the top step when already at the maximum", () => {
    expect(stepFontScale(TEXT_SIZE_STEPS[TEXT_SIZE_STEPS.length - 1], 1)).toBe(
      TEXT_SIZE_STEPS[TEXT_SIZE_STEPS.length - 1],
    );
  });

  it("does not go below the bottom step when already at the minimum", () => {
    expect(stepFontScale(TEXT_SIZE_STEPS[0], -1)).toBe(TEXT_SIZE_STEPS[0]);
  });

  it("snaps an off-step value (e.g. loaded from the account slider) to the nearest step before moving", () => {
    // 1.07 is closest to the 1.0 step; stepping up should land on the next step (1.15),
    // not drift to some other value.
    expect(stepFontScale(1.07, 1)).toBe(1.15);
  });
});

describe("parseA11yPrefs", () => {
  it("returns defaults for null/undefined/empty input", () => {
    expect(parseA11yPrefs(null)).toEqual(DEFAULT_A11Y_PREFS);
    expect(parseA11yPrefs(undefined)).toEqual(DEFAULT_A11Y_PREFS);
    expect(parseA11yPrefs("")).toEqual(DEFAULT_A11Y_PREFS);
  });

  it("returns defaults for malformed JSON instead of throwing", () => {
    expect(parseA11yPrefs("{not json")).toEqual(DEFAULT_A11Y_PREFS);
  });

  it("returns defaults when the JSON is not an object", () => {
    expect(parseA11yPrefs("42")).toEqual(DEFAULT_A11Y_PREFS);
    expect(parseA11yPrefs('"a string"')).toEqual(DEFAULT_A11Y_PREFS);
    expect(parseA11yPrefs("null")).toEqual(DEFAULT_A11Y_PREFS);
  });

  it("round-trips a valid, fully-populated object", () => {
    const prefs: A11yPrefs = {
      fontScale: 1.15,
      highContrast: true,
      highlightLinks: true,
      reducedMotion: false,
      readableFont: true,
    };
    expect(parseA11yPrefs(JSON.stringify(prefs))).toEqual(prefs);
  });

  it("clamps an out-of-range fontScale from a tampered or stale value", () => {
    expect(parseA11yPrefs(JSON.stringify({ fontScale: 99 }))).toEqual({
      ...DEFAULT_A11Y_PREFS,
      fontScale: FONT_SCALE_MAX,
    });
  });

  it("coerces non-boolean truthy junk to strict booleans rather than passing it through", () => {
    const parsed = parseA11yPrefs(JSON.stringify({ highContrast: "yes", readableFont: 1 }));
    expect(parsed.highContrast).toBe(false);
    expect(parsed.readableFont).toBe(false);
  });

  it("ignores unknown/extra keys from a future or rolled-back schema", () => {
    const parsed = parseA11yPrefs(JSON.stringify({ ...DEFAULT_A11Y_PREFS, somethingNew: "x" }));
    expect(parsed).toEqual(DEFAULT_A11Y_PREFS);
  });
});

describe("serializeA11yPrefs", () => {
  it("produces JSON that parseA11yPrefs reads back identically", () => {
    const prefs: A11yPrefs = {
      fontScale: 1.3,
      highContrast: true,
      highlightLinks: false,
      reducedMotion: true,
      readableFont: false,
    };
    expect(parseA11yPrefs(serializeA11yPrefs(prefs))).toEqual(prefs);
  });

  it("drops unknown fields instead of persisting them", () => {
    const withJunk = { ...DEFAULT_A11Y_PREFS, extra: "should not survive" } as A11yPrefs;
    const serialized = serializeA11yPrefs(withJunk);
    expect(serialized).not.toContain("extra");
  });
});

describe("mergeAccountSettingsIntoPrefs", () => {
  it("overwrites only the three account-backed fields", () => {
    const current: A11yPrefs = {
      fontScale: 1,
      highContrast: false,
      highlightLinks: true,
      reducedMotion: false,
      readableFont: true,
    };
    const merged = mergeAccountSettingsIntoPrefs(
      { high_contrast: true, font_scale: 1.2, reduced_motion: true },
      current,
    );
    expect(merged).toEqual({
      fontScale: 1.2,
      highContrast: true,
      highlightLinks: true, // untouched — the account schema has no such field
      reducedMotion: true,
      readableFont: true, // untouched
    });
  });

  it("clamps an out-of-range font_scale coming from the server", () => {
    const merged = mergeAccountSettingsIntoPrefs(
      { high_contrast: false, font_scale: 10, reduced_motion: false },
      DEFAULT_A11Y_PREFS,
    );
    expect(merged.fontScale).toBe(FONT_SCALE_MAX);
  });

  it("treats a missing/undefined account field as false, not as 'leave untouched'", () => {
    // The account settings object is authoritative once loaded — a field the
    // server omitted should not silently keep a stale local "true".
    const current: A11yPrefs = { ...DEFAULT_A11Y_PREFS, highContrast: true };
    const merged = mergeAccountSettingsIntoPrefs({ font_scale: 1 }, current);
    expect(merged.highContrast).toBe(false);
  });
});
