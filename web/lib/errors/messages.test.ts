import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { explainError, isKnownErrorCode, looksLikeErrorCode } from "./messages";

// קודים שנוספו בכוונה מעבר ל-INVENTORY.md — ראו ההסבר ב-messages.ts.
// אלה נזרקים בפועל ב-web/lib/billing/lemon.ts אבל האינוונטרי המכני לא
// תפס אותם (billing_variant_missing/ambiguous נזרקים דרך תבנית
// `throw new Error(matches.length ? "a" : "b")`, ו-lemon_store_mismatch
// נזרק עם סיומת דינמית — שתי תבניות שחילוץ מכני-פשוט לרוב מפספס).
const EXTRA_REAL_CODES = ["billing_variant_missing", "billing_variant_ambiguous", "lemon_store_mismatch"];

function readInventoryCodes(): string[] {
  const text = readFileSync(new URL("./INVENTORY.md", import.meta.url), "utf8");
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

const INVENTORY_CODES = readInventoryCodes();
const ALL_CODES = Array.from(new Set([...INVENTORY_CODES, ...EXTRA_REAL_CODES]));
const HEBREW_RE = /[֐-׿]/;

describe("INVENTORY.md coverage", () => {
  it("has not gone empty (the parser still finds codes)", () => {
    expect(INVENTORY_CODES.length).toBeGreaterThan(50);
  });

  // זו הבדיקה שתופסת קוד חדש שנוסף לקוד בעתיד בלי הודעה תואמת: אם מישהו
  // מוסיף `throw new Error("some_new_code")` ומריץ מחדש את חילוץ
  // האינוונטרי בלי להוסיף ערך תואם ב-messages.ts, isKnownErrorCode יחזיר
  // false והבדיקה תיכשל — במקום שהקוד הגולמי פשוט "יעבוד" כי הנפילה
  // הגנרית תמיד מחזירה משהו.
  it.each(ALL_CODES)("code %s has an explicit catalogue entry (not just the generic fallback)", (code) => {
    expect(isKnownErrorCode(code)).toBe(true);
  });

  it("every inventory code yields a non-empty Hebrew title and detail", () => {
    for (const code of ALL_CODES) {
      const explanation = explainError(code);
      expect(explanation.title.trim().length, `title for ${code}`).toBeGreaterThan(0);
      expect(explanation.detail.trim().length, `detail for ${code}`).toBeGreaterThan(0);
      expect(HEBREW_RE.test(explanation.title), `title for ${code} should contain Hebrew`).toBe(true);
      expect(HEBREW_RE.test(explanation.detail), `detail for ${code} should contain Hebrew`).toBe(true);
    }
  });

  it("never lets the raw code stand in as the whole title or detail", () => {
    for (const code of ALL_CODES) {
      const explanation = explainError(code);
      expect(explanation.title.trim()).not.toBe(code);
      expect(explanation.detail.trim()).not.toBe(code);
    }
  });

  it("keeps the original code around for support, unmodified", () => {
    for (const code of ALL_CODES) {
      expect(explainError(code).code).toBe(code);
    }
  });
});

describe("explainError — unknown codes", () => {
  it("falls back sanely for a code nobody defined, without throwing", () => {
    const explanation = explainError("some_code_nobody_wrote_a_message_for");
    expect(explanation.title.trim().length).toBeGreaterThan(0);
    expect(explanation.detail.trim().length).toBeGreaterThan(0);
    expect(explanation.title).not.toContain("undefined");
    expect(explanation.detail).not.toContain("undefined");
  });

  it("never renders 'undefined' for null, undefined or empty input", () => {
    for (const input of [null, undefined, "", "   "] as const) {
      const explanation = explainError(input);
      expect(explanation.title).not.toContain("undefined");
      expect(explanation.detail).not.toContain("undefined");
      expect(explanation.title.trim().length).toBeGreaterThan(0);
      expect(explanation.detail.trim().length).toBeGreaterThan(0);
    }
  });

  it("does not throw for garbage input", () => {
    expect(() => explainError("<script>alert(1)</script>")).not.toThrow();
    expect(() => explainError("שגיאה בעברית שאינה קוד")).not.toThrow();
  });
});

describe("explainError — HTTP status fallback", () => {
  it.each([401, 403, 404, 413, 429, 500])("gives a meaningful, non-empty explanation for status %d alone", (status) => {
    const explanation = explainError(undefined, status);
    expect(explanation.title.trim().length).toBeGreaterThan(0);
    expect(explanation.detail.trim().length).toBeGreaterThan(0);
  });

  it("treats other 5xx statuses (502/503/504) the same as 500 — a server-side fault", () => {
    for (const status of [502, 503, 504]) {
      const explanation = explainError(undefined, status);
      expect(explanation.audience).toBe("owner");
      expect(explanation.title.trim().length).toBeGreaterThan(0);
    }
  });

  it("prefers a known code's explanation over the status when both are given", () => {
    const explanation = explainError("pro_required", 403);
    expect(explanation.title).toContain("Pro");
  });

  it("401 asks the person to sign in again, not to fix a config", () => {
    const explanation = explainError(undefined, 401);
    expect(explanation.audience).toBe("user");
  });

  it("413 talks about size, not about a random fault", () => {
    const explanation = explainError(undefined, 413);
    expect(explanation.detail).toMatch(/גדול|גודל/);
  });

  it("falls back to the fully generic explanation with neither a code nor a meaningful status", () => {
    const explanation = explainError(undefined, undefined);
    expect(explanation.title.trim().length).toBeGreaterThan(0);
    const withUnknownStatus = explainError(undefined, 418);
    expect(withUnknownStatus.title.trim().length).toBeGreaterThan(0);
  });
});

describe("explainError — dynamic-suffix codes (code:detail)", () => {
  it("matches the prefix before ':' for codes that carry a dynamic reason", () => {
    const a = explainError("cloud_render_402:render_seconds_quota");
    const b = explainError("cloud_render_402");
    expect(a.title).toBe(b.title);
    expect(a.detail).toBe(b.detail);
    // the full original string is preserved in .code for support, even with the suffix
    expect(a.code).toBe("cloud_render_402:render_seconds_quota");
  });

  it("does the same for lemon_store_mismatch:<storeId>", () => {
    const explanation = explainError("lemon_store_mismatch:abc123");
    expect(isKnownErrorCode("lemon_store_mismatch:abc123")).toBe(true);
    expect(explanation.title.trim().length).toBeGreaterThan(0);
    expect(explanation.title).not.toBe("lemon_store_mismatch:abc123");
  });
});

describe("owner-class configuration faults are never marked retryable", () => {
  // "_not_configured" ותקלות תשתית קבועות דומות לא ייפתרו בעצמן — לנסות
  // שוב לא עוזר, כי שום דבר לא השתנה. זה שונה מכשל DB חד-פעמי, שיכול
  // להיות חולף.
  const permanentConfigFaults = [
    "cloud_render_not_configured",
    "database_not_configured",
    "r2_not_configured",
    "webhook_not_configured",
    "admin_unavailable",
    "account_delete_unavailable",
    "billing_not_configured",
    "byok_encryption_not_configured",
    "invalid_signature",
    "lemon_store_missing",
    "billing_variant_missing",
    "billing_variant_ambiguous",
    "lemon_store_mismatch",
    "billing_trial_missing",
  ];

  it.each(permanentConfigFaults)("%s is audience:owner and retryable:false", (code) => {
    const explanation = explainError(code);
    expect(explanation.audience).toBe("owner");
    expect(explanation.retryable).toBe(false);
  });

  it("owner-class text never blames the user or suggests something that cannot work", () => {
    for (const code of permanentConfigFaults) {
      const explanation = explainError(code);
      // house rules: calm, plain, no marketing tone, no exclamation marks
      expect(explanation.title).not.toMatch(/!/);
      expect(explanation.detail).not.toMatch(/!/);
    }
  });
});

describe("worker_cannot_burn_subtitles reads as a fallback, not as broken", () => {
  it("tells the user export continues in the browser, slower — not that something failed", () => {
    const explanation = explainError("worker_cannot_burn_subtitles");
    expect(explanation.audience).toBe("user");
    expect(explanation.retryable).toBe(false);
    expect(explanation.detail + " " + (explanation.action || "")).toMatch(/דפדפן|מכשיר/);
  });
});

describe("looksLikeErrorCode", () => {
  it("recognizes snake_case machine codes, with or without a dynamic suffix", () => {
    expect(looksLikeErrorCode("byok_save_failed")).toBe(true);
    expect(looksLikeErrorCode("cloud_render_402:render_seconds_quota")).toBe(true);
  });

  it("rejects already-composed Hebrew UI text so it is never re-explained into something generic", () => {
    expect(looksLikeErrorCode("הרצועה כבר בקצה")).toBe(false);
    expect(looksLikeErrorCode("הייצוא בוטל.")).toBe(false);
  });

  it("rejects empty and missing input", () => {
    expect(looksLikeErrorCode("")).toBe(false);
    expect(looksLikeErrorCode(null)).toBe(false);
    expect(looksLikeErrorCode(undefined)).toBe(false);
  });
});
