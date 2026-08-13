import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

export interface AiAccess {
  planId: "free" | "trial" | "creator" | "pro";
  providerMode: "managed" | "byok";
  canUseByok: boolean;
}

/** Server-side source of truth for provider visibility and BYOK access. */
export async function getAiAccess(supabase: SupabaseClient, user: User): Promise<AiAccess> {
  const [{ data: settings }, { data: subscription }] = await Promise.all([
    supabase.from("user_settings").select("provider_mode").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("cloud_subscriptions")
      .select("plan_id,target_plan_id,status")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const active = subscription && ["active", "trialing"].includes(String(subscription.status));
  const rawPlan = active ? String(subscription.plan_id || "free") : "free";
  const planId = (["free", "trial", "creator", "pro"].includes(rawPlan) ? rawPlan : "free") as AiAccess["planId"];
  // BYOK is a real Pro feature. A trial deliberately does not unlock it.
  const canUseByok = planId === "pro" && subscription?.status === "active";
  const requestedMode = settings?.provider_mode === "byok" ? "byok" : "managed";

  return {
    planId,
    canUseByok,
    providerMode: requestedMode === "byok" && canUseByok ? "byok" : "managed",
  };
}
