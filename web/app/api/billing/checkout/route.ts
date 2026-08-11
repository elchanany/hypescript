import { NextRequest, NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";
import { createCheckout } from "@/lib/billing/lemon";
import type { BillingInterval, BillingPlanId } from "@/lib/billing/plans";
import { getSupabaseServiceClient } from "@/lib/auth/server";
import { readPricing } from "@/lib/admin/server";

export async function POST(request: NextRequest) {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({}));
  const planId = body.planId as BillingPlanId;
  const interval = body.interval as BillingInterval;
  if (!(["creator", "pro"] as string[]).includes(planId) || !(["month", "year"] as string[]).includes(interval)) {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }
  try {
    const { data: subscription, error: subscriptionError } = await auth.supabase
      .from("cloud_subscriptions")
      .select("status,provider,trial_used_at")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (subscriptionError) throw new Error("subscription_lookup_failed");
    if (subscription?.provider && ["active", "trialing", "past_due"].includes(subscription.status)) {
      return NextResponse.json({ error: "subscription_already_exists" }, { status: 409 });
    }
    const origin = new URL(request.url).origin;
    const service = getSupabaseServiceClient();
    const pricing = service ? await readPricing(service) : null;
    const customPriceMinor = pricing ? Number(pricing[planId]?.[interval === "year" ? "yearlyIls" : "monthlyIls"]) * 100 : undefined;
    const checkout = await createCheckout({
      userId: auth.user.id,
      email: auth.user.email,
      planId,
      interval,
      returnUrl: `${origin}/account?checkout=success`,
      allowTrial: !subscription?.trial_used_at,
      customPriceMinor,
    });
    const url = checkout.data.attributes.url;
    if (!url) throw new Error("checkout_url_missing");
    return NextResponse.json({ url, testMode: true, trialIncluded: !subscription?.trial_used_at });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "checkout_failed" }, { status: 503 });
  }
}
