import { describe, expect, it } from "vitest";
import {
  clampComposeDrag, clampComposeHeight, composeContentHeight,
  COMPOSE_DEFAULT_LINES, COMPOSE_H_DEFAULT, COMPOSE_H_MAX, COMPOSE_H_MIN, COMPOSE_LINE_H,
} from "./composeBox";

// הבאג שהבדיקות האלה נועדו למנוע: הגובה היה 82px מול padding מוגן של 84px,
// כלומר לתיבת הכתיבה נשארו 0 פיקסלים והטקסט נחתך מאחורי הכפתורים.
describe("compose box geometry", () => {
  it("leaves a full line of text even at the minimum height", () => {
    expect(composeContentHeight(COMPOSE_H_MIN)).toBeGreaterThanOrEqual(COMPOSE_LINE_H);
  });

  it("shows the intended number of lines at the default height", () => {
    expect(composeContentHeight(COMPOSE_H_DEFAULT)).toBeGreaterThanOrEqual(COMPOSE_LINE_H * COMPOSE_DEFAULT_LINES);
  });

  it("never reports a negative content height", () => {
    expect(composeContentHeight(0)).toBe(0);
    expect(composeContentHeight(-50)).toBe(0);
  });
});

describe("clampComposeHeight (stored value)", () => {
  it("falls back to the default for a value saved before the reserved zones grew", () => {
    expect(clampComposeHeight(64)).toBe(COMPOSE_H_DEFAULT); // הישן COMPOSE_H_MIN
    expect(clampComposeHeight(0)).toBe(COMPOSE_H_DEFAULT);
    expect(clampComposeHeight(NaN)).toBe(COMPOSE_H_DEFAULT);
  });

  it("whatever it returns always leaves at least one writable line", () => {
    for (const stored of [-10, 0, 40, 64, 75, 82, 100, 160, 9999]) {
      expect(composeContentHeight(clampComposeHeight(stored))).toBeGreaterThanOrEqual(COMPOSE_LINE_H);
    }
  });

  it("keeps a valid stored height", () => {
    expect(clampComposeHeight(160)).toBe(160);
  });

  it("caps an absurd stored height", () => {
    expect(clampComposeHeight(9999)).toBe(COMPOSE_H_MAX);
  });
});

describe("clampComposeDrag (live resize)", () => {
  it("stops at the minimum instead of snapping back to the default", () => {
    expect(clampComposeDrag(10)).toBe(COMPOSE_H_MIN);
  });

  it("stops at the maximum", () => {
    expect(clampComposeDrag(5000)).toBe(COMPOSE_H_MAX);
  });

  it("passes a height inside the range through unchanged", () => {
    expect(clampComposeDrag(150)).toBe(150);
  });
});
