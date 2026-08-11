import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/auth/server";
import { mapSubscriptionStatus, subscriptionPlan } from "@/lib/billing/lemon";

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
  if (attrs.test_mode !== true) return NextResponse.json({ error: "live_event_blocked" }, { status: 409 });
  const userId = String(payload.meta?.custom_data?.user_id || "");
  const planId = subscriptionPlan(attrs, payload.meta?.custom_data);
  if (!userId || !planId || planId === "free") return NextResponse.json({ error: "subscription_identity_missing" }, { status: 422 });
  const supabase = getSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  const mappedStatus = mapSubscriptionStatus(String(attrs.status || "cancelled"));
  const endsAt = attrs.ends_at ? new Date(attrs.ends_at).getTime() : 0;
  const expired = event === "subscription_expired" || (endsAt > 0 && endsAt <= Date.now());
  // A cancelled subscription keeps access until Lemon's ends_at date.
  const status = mappedStatus === "cancelled" && !expired ? "active" : mappedStatus;
  const { error } = await supabase.from("cloud_subscriptions").upsert({
    user_id: userId,
    plan_id: expired ? "free" : planId,
    plan_version: 1,
    status: expired ? "active" : status,
    provider: "lemonsqueezy_test",
    provider_customer_id: attrs.customer_id ? String(attrs.customer_id) : null,
    provider_subscription_id: String(payload.data?.id || ""),
    current_period_start: attrs.created_at || null,
    current_period_end: attrs.renews_at || attrs.ends_at || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: "subscription_sync_failed" }, { status: 500 });
  return NextResponse.json({ received: true });
}
