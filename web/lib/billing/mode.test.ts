import { describe, expect, it } from "vitest";
import {
  billingMode, billingModeMismatchError, billingProviderName, checkoutTestMode,
  isLiveBilling, matchesBillingMode,
} from "./mode";

const env = (value?: string) => ({ ...(value == null ? {} : { BILLING_LIVE_MODE: value }) } as NodeJS.ProcessEnv);

describe("billingMode", () => {
  it("defaults to test when the switch is absent — nothing changes without a deliberate flip", () => {
    expect(billingMode(env())).toBe("test");
    expect(isLiveBilling(env())).toBe(false);
  });

  it("accepts the documented truthy spellings", () => {
    for (const v of ["1", "true", "TRUE", "yes"]) expect(billingMode(env(v))).toBe("live");
  });

  it("treats anything else as test, including a typo", () => {
    for (const v of ["", "0", "false", "no", "live", "on"]) expect(billingMode(env(v))).toBe("test");
  });
});

describe("checkoutTestMode", () => {
  it("sends test_mode true in test and false in live", () => {
    expect(checkoutTestMode(env())).toBe(true);
    expect(checkoutTestMode(env("1"))).toBe(false);
  });
});

describe("billingProviderName", () => {
  it("stamps the row honestly so support can tell a real customer from a test row", () => {
    expect(billingProviderName(env())).toBe("lemonsqueezy_test");
    expect(billingProviderName(env("1"))).toBe("lemonsqueezy");
  });
});

describe("matchesBillingMode", () => {
  it("in test mode accepts test resources and rejects live ones", () => {
    expect(matchesBillingMode(true, env())).toBe(true);
    expect(matchesBillingMode(false, env())).toBe(false);
  });

  it("in live mode accepts live resources and rejects test ones", () => {
    expect(matchesBillingMode(false, env("1"))).toBe(true);
    expect(matchesBillingMode(true, env("1"))).toBe(false);
  });

  it("treats a missing/odd test_mode value as live, never as a wildcard", () => {
    expect(matchesBillingMode(undefined, env())).toBe(false);   // test build refuses it
    expect(matchesBillingMode(undefined, env("1"))).toBe(true);
    expect(matchesBillingMode("true", env())).toBe(false);      // string, not boolean -> not a test resource
  });
});

describe("billingModeMismatchError", () => {
  it("names both sides so the log says what actually happened", () => {
    expect(billingModeMismatchError(false, env())).toBe("billing_mode_mismatch:running=test,resource=live");
    expect(billingModeMismatchError(true, env("1"))).toBe("billing_mode_mismatch:running=live,resource=test");
  });
});
