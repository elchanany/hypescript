import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/auth/server";
import { mapSubscriptionStatus, subscriptionPlan } from "@/lib/billing/lemon";
import { billingModeMismatchError, billingProviderName, matchesBillingMode } from "@/lib/billing/mode";

export const runtime = "nodejs";

function validSignature(raw: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(signature, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  const secret = (process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "").trim();
  if (!secret) return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-signature"), secret)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }
  const payload = JSON.parse(raw);
  const event = String(payload.meta?.event_name || request.headers.get("x-event-name") || "");
  if (!event.startsWith("subscription_")) return NextResponse.json({ received: true, ignored: true });
  const attrs = payload.data?.attributes || {};
  // אירוע חייב להתאים למצב החיוב של הפריסה הזו. 409 מסמן ל-Lemon שהאירוע לא
  // התקבל, כך שהוא יישלח שוב לפריסה הנכונה במקום להיבלע כאן בשקט.
  if (!matchesBillingMode(attrs.test_mode)) {
    return NextResponse.json({ error: billingModeMismatchError(attrs.test_mode) }, { status: 409 });
  }
  const userId = String(payload.meta?.custom_data?.user_id || "");
  const planId = subscriptionPlan(attrs, payload.meta?.custom_data);
  if (!userId || !planId || planId === "free") return NextResponse.json({ error: "subscription_identity_missing" }, { status: 422 });
  const supabase = getSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  const mappedStatus = mapSubscriptionStatus(String(attrs.status || "cancelled"));
  const endsAt = attrs.ends_at ? new Date(attrs.ends_at).getTime() : 0;
  const expired = event === "subscription_expired" || (endsAt > 0 && endsAt <= Date.now());
  const trialEndsAt = attrs.trial_ends_at || (mappedStatus === "trialing" ? attrs.renews_at : null);
  const trialEndMs = trialEndsAt ? new Date(trialEndsAt).getTime() : 0;
  const hasTrialAccess = !expired && trialEndMs > Date.now();
  // A cancelled subscription keeps access until Lemon's ends_at date.
  const status = hasTrialAccess ? "trialing" : mappedStatus === "cancelled" && !expired ? "active" : mappedStatus;
  const { data: existing } = await supabase.from("cloud_subscriptions")
    .select("trial_used_at")
    .eq("user_id", userId)
    .maybeSingle();
  const { error } = await supabase.from("cloud_subscriptions").upsert({
    user_id: userId,
    plan_id: expired ? "free" : hasTrialAccess ? "trial" : planId,
    target_plan_id: planId,
    plan_version: 1,
    status: expired ? "active" : status,
    provider: billingProviderName(),
    provider_customer_id: attrs.customer_id ? String(attrs.customer_id) : null,
    provider_subscription_id: String(payload.data?.id || ""),
    current_period_start: attrs.created_at || null,
    current_period_end: attrs.renews_at || attrs.ends_at || null,
    trial_ends_at: hasTrialAccess ? trialEndsAt : null,
    trial_used_at: existing?.trial_used_at || (hasTrialAccess ? new Date().toISOString() : null),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: "subscription_sync_failed" }, { status: 500 });
  return NextResponse.json({ received: true });
}
