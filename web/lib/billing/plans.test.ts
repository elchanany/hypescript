import { describe, expect, it } from "vitest";
import { BILLING_PLANS, expectedVariant, hasRequiredTrial, inferPlanId, TRIAL_OFFER } from "./plans";

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

  it("keeps the paid trial intentionally smaller than every paid plan", () => {
    expect(TRIAL_OFFER).toMatchObject({ projects: 5, storageGb: 1, renderMinutes: 20 });
    expect(TRIAL_OFFER.projects).toBeLessThan(BILLING_PLANS.creator.projects);
    expect(TRIAL_OFFER.storageGb).toBeLessThan(BILLING_PLANS.creator.storageGb);
    expect(TRIAL_OFFER.renderMinutes).toBeLessThan(BILLING_PLANS.creator.renderMinutes);
  });

  it("accepts one month or 30 days and rejects missing trials", () => {
    expect(hasRequiredTrial({ has_free_trial: true, trial_interval: "month", trial_interval_count: 1 })).toBe(true);
    expect(hasRequiredTrial({ has_free_trial: true, trial_interval: "day", trial_interval_count: 30 })).toBe(true);
    expect(hasRequiredTrial({ has_free_trial: false, trial_interval: "month", trial_interval_count: 1 })).toBe(false);
    expect(hasRequiredTrial({ has_free_trial: true, trial_interval: "day", trial_interval_count: 14 })).toBe(false);
  });
});
