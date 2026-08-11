import "server-only";

import { BILLING_PLANS, BillingInterval, BillingPlanId, hasRequiredTrial, inferPlanId } from "./plans";

const API = "https://api.lemonsqueezy.com/v1";

type LemonResource = {
  id: string;
  type: string;
  attributes: Record<string, any>;
  relationships?: Record<string, { data?: { id: string; type: string } }>;
};

function apiKey() {
  const value = (process.env.LEMONSQUEEZY_API_KEY || "").trim();
  if (!value) throw new Error("billing_not_configured");
  return value;
}

export async function lemonRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${apiKey()}`,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`lemon_api_${response.status}:${body.slice(0, 300)}`);
  }
  return response.json() as Promise<T>;
}

export async function getStore() {
  const configured = (process.env.LEMONSQUEEZY_STORE_ID || "").trim();
  const result = await lemonRequest<{ data: LemonResource[] }>("/stores");
  const store = result.data.find((item) => item.id === configured) || result.data[0];
  if (!store) throw new Error("lemon_store_missing");
  return store;
}

export async function getCatalog() {
  const result = await lemonRequest<{ data: LemonResource[]; included?: LemonResource[] }>("/products?include=variants");
  const products = result.data || [];
  const variants = (result.included || []).filter((item) => item.type === "variants");
  return { products, variants };
}

export async function resolveVariant(planId: BillingPlanId, interval: BillingInterval) {
  if (planId === "free") throw new Error("free_has_no_checkout");
  const { products, variants } = await getCatalog();
  const productById = new Map(products.map((product) => [product.id, product]));
  const expected = interval === "year" ? BILLING_PLANS[planId].yearlyIls : BILLING_PLANS[planId].monthlyIls;
  const matches = variants.filter((variant) => {
    const productId = String(variant.attributes.product_id || variant.relationships?.product?.data?.id || "");
    const product = productById.get(productId);
    const text = `${product?.attributes.name || ""} ${variant.attributes.name || ""}`;
    const inferred = inferPlanId(text);
    const variantInterval = String(variant.attributes.interval || "");
    const intervalMatches = interval === "year" ? variantInterval === "year" : variantInterval === "month";
    const amount = Number(variant.attributes.price || 0) / 100;
    return inferred === planId && intervalMatches && amount === expected && variant.attributes.is_subscription === true;
  });
  if (matches.length !== 1) throw new Error(matches.length ? "billing_variant_ambiguous" : "billing_variant_missing");
  const variant = matches[0];
  if (variant.attributes.test_mode !== true) throw new Error("live_billing_blocked_while_in_review");
  if (!hasRequiredTrial(variant.attributes)) throw new Error("billing_trial_missing");
  return variant;
}

export async function createCheckout(input: {
  userId: string;
  email?: string | null;
  planId: BillingPlanId;
  interval: BillingInterval;
  returnUrl: string;
  allowTrial: boolean;
  customPriceMinor?: number;
}) {
  const [store, variant] = await Promise.all([getStore(), resolveVariant(input.planId, input.interval)]);
  return lemonRequest<{ data: LemonResource }>("/checkouts", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          test_mode: true,
          custom_price: input.customPriceMinor,
          checkout_data: {
            email: input.email || undefined,
            custom: { user_id: input.userId, plan_id: input.planId, interval: input.interval },
          },
          product_options: {
            enabled_variants: [Number(variant.id)],
            redirect_url: input.returnUrl,
          },
          checkout_options: {
            skip_trial: !input.allowTrial,
            subscription_preview: true,
          },
        },
        relationships: {
          store: { data: { type: "stores", id: store.id } },
          variant: { data: { type: "variants", id: variant.id } },
        },
      },
    }),
  });
}

export async function getSubscription(subscriptionId: string) {
  return lemonRequest<{ data: LemonResource }>(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

export function subscriptionPlan(attributes: Record<string, any>, customData?: Record<string, any>): BillingPlanId | null {
  const custom = inferPlanId(String(customData?.plan_id || ""));
  if (custom && custom !== "free") return custom;
  return inferPlanId(`${attributes.product_name || ""} ${attributes.variant_name || ""}`);
}

export function mapSubscriptionStatus(value: string): "active" | "trialing" | "past_due" | "cancelled" | "paused" {
  if (value === "active") return "active";
  if (value === "on_trial") return "trialing";
  if (value === "past_due" || value === "unpaid") return "past_due";
  if (value === "paused") return "paused";
  return "cancelled";
}
