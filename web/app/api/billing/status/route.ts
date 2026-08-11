import { NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";

export async function GET() {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const [{ data: subscription }, { data: usage, error: usageError }] = await Promise.all([
    auth.supabase.from("cloud_subscriptions").select("plan_id,status,current_period_start,current_period_end,provider").eq("user_id", auth.user.id).maybeSingle(),
    auth.supabase.rpc("cloud_usage_snapshot"),
  ]);
  if (usageError) return NextResponse.json({ error: "usage_unavailable" }, { status: 503 });
  return NextResponse.json({ subscription: subscription || { plan_id: "free", status: "active", provider: null }, usage });
}
