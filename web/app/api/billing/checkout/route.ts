import { NextRequest, NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";
import { createCheckout } from "@/lib/billing/lemon";
import type { BillingInterval, BillingPlanId } from "@/lib/billing/plans";

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
    const origin = new URL(request.url).origin;
    const checkout = await createCheckout({
      userId: auth.user.id,
      email: auth.user.email,
      planId,
      interval,
      returnUrl: `${origin}/account?checkout=success`,
    });
    const url = checkout.data.attributes.url;
    if (!url) throw new Error("checkout_url_missing");
    return NextResponse.json({ url, testMode: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "checkout_failed" }, { status: 503 });
  }
}
