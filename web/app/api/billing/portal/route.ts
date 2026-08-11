import { NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";
import { getSubscription } from "@/lib/billing/lemon";

export async function POST() {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const { data, error } = await auth.supabase
    .from("cloud_subscriptions")
    .select("provider_subscription_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error || !data?.provider_subscription_id) {
    return NextResponse.json({ error: "subscription_missing" }, { status: 404 });
  }
  try {
    const subscription = await getSubscription(data.provider_subscription_id);
    const url = subscription.data.attributes.urls?.customer_portal;
    if (!url) throw new Error("portal_url_missing");
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "portal_failed" }, { status: 503 });
  }
}
