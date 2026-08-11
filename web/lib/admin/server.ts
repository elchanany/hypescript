import "server-only";
import { getSupabaseServiceClient } from "@/lib/auth/server";
import { BILLING_PLANS } from "@/lib/billing/plans";

export const ADMIN_ROLES = ["system_owner", "system_admin"] as const;

export async function adminContext(userId: string) {
  const service = getSupabaseServiceClient();
  if (!service) return { service: null, allowed: false, roles: [] as string[] };
  const { data } = await service.from("user_roles").select("role_id").eq("user_id", userId);
  const roles = (data || []).map((row) => String(row.role_id));
  return { service, roles, allowed: roles.some((role) => (ADMIN_ROLES as readonly string[]).includes(role)) };
}

export const BILLING_OVERRIDE_KEY = "billing_plan_overrides";
export async function readPricing(service: any) {
  const fallback = {
    creator: { monthlyIls: BILLING_PLANS.creator.monthlyIls, yearlyIls: BILLING_PLANS.creator.yearlyIls },
    pro: { monthlyIls: BILLING_PLANS.pro.monthlyIls, yearlyIls: BILLING_PLANS.pro.yearlyIls },
  };
  const { data } = await service.from("system_settings").select("value").eq("key", BILLING_OVERRIDE_KEY).maybeSingle();
  return { ...fallback, ...((data?.value && typeof data.value === "object") ? data.value : {}) };
}
