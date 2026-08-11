export type BillingPlanId = "free" | "creator" | "pro";
export type BillingInterval = "month" | "year";

export const TRIAL_OFFER = {
  interval: "month",
  intervalCount: 1,
  projects: 5,
  storageGb: 1,
  renderMinutes: 20,
} as const;

export const BILLING_PLANS = {
  free: {
    id: "free",
    nameHe: "חינמי",
    monthlyIls: 0,
    yearlyIls: 0,
    projects: 3,
    storageGb: 2,
    renderMinutes: 10,
  },
  creator: {
    id: "creator",
    nameHe: "יוצר",
    monthlyIls: 49,
    yearlyIls: 490,
    projects: 50,
    storageGb: 20,
    renderMinutes: 120,
  },
  pro: {
    id: "pro",
    nameHe: "מקצועי",
    monthlyIls: 119,
    yearlyIls: 1190,
    projects: 500,
    storageGb: 100,
    renderMinutes: 480,
  },
} as const;

export const PAID_PLAN_IDS = ["creator", "pro"] as const;

export function expectedVariant(planId: BillingPlanId, interval: BillingInterval) {
  const plan = BILLING_PLANS[planId];
  return {
    planId,
    interval,
    amountIls: interval === "year" ? plan.yearlyIls : plan.monthlyIls,
    amountMinor: (interval === "year" ? plan.yearlyIls : plan.monthlyIls) * 100,
  };
}

export function inferPlanId(value: string): BillingPlanId | null {
  const normalized = value.toLowerCase();
  if (/creator|יוצר/.test(normalized)) return "creator";
  if (/\bpro\b|professional|מקצועי/.test(normalized)) return "pro";
  return null;
}

export function hasRequiredTrial(attributes: Record<string, unknown>): boolean {
  if (attributes.has_free_trial !== true) return false;
  const interval = String(attributes.trial_interval || "");
  const count = Number(attributes.trial_interval_count || 0);
  return (interval === TRIAL_OFFER.interval && count === TRIAL_OFFER.intervalCount)
    || (interval === "day" && count === 30);
}
