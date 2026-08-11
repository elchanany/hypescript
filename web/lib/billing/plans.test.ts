import { describe, expect, it } from "vitest";
import { BILLING_PLANS, expectedVariant, inferPlanId } from "./plans";

describe("billing plan contract", () => {
  it("matches the database pricing and quotas", () => {
    expect(BILLING_PLANS.creator).toMatchObject({ monthlyIls: 49, yearlyIls: 490, projects: 50, storageGb: 20, renderMinutes: 120 });
    expect(BILLING_PLANS.pro).toMatchObject({ monthlyIls: 119, yearlyIls: 1190, projects: 500, storageGb: 100, renderMinutes: 480 });
  });

  it("defines exact Lemon Squeezy prices in minor units", () => {
    expect(expectedVariant("creator", "month").amountMinor).toBe(4900);
    expect(expectedVariant("creator", "year").amountMinor).toBe(49000);
    expect(expectedVariant("pro", "month").amountMinor).toBe(11900);
    expect(expectedVariant("pro", "year").amountMinor).toBe(119000);
  });

  it("maps English and Hebrew product names without accepting unknown plans", () => {
    expect(inferPlanId("Hypescript Creator — Monthly")).toBe("creator");
    expect(inferPlanId("מקצועי שנתי")).toBe("pro");
    expect(inferPlanId("Free")).toBeNull();
  });
});
