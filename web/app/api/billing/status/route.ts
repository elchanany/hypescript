import { NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";

export async function GET() {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const [{ data: subscription }, { data: usage, error: usageError }] = await Promise.all([
    auth.supabase.from("cloud_subscriptions").select("plan_id,target_plan_id,status,current_period_start,current_period_end,trial_ends_at,provider").eq("user_id", auth.user.id).maybeSingle(),
    auth.supabase.rpc("cloud_usage_snapshot"),
  ]);
  if (usageError) return NextResponse.json({ error: "usage_unavailable" }, { status: 503 });
  const trialing = subscription?.plan_id === "trial" || subscription?.status === "trialing";
  const normalized = subscription ? {
    ...subscription,
    plan_id: trialing ? (subscription.target_plan_id || "creator") : subscription.plan_id,
    entitlement: trialing ? "trial" : subscription.plan_id === "free" ? "free" : "paid",
  } : { plan_id: "free", status: "active", provider: null, entitlement: "free" };
  return NextResponse.json({ subscription: normalized, usage: { ...usage, entitlement: normalized.entitlement } });
}
