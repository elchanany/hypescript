import { NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";
import { adminContext } from "@/lib/admin/server";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;

  const admin = await adminContext(auth.user.id);
  if (!admin.allowed || !admin.service) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const s = admin.service;
  const targetUserId = params.id;

  const body = await request.json().catch(() => ({}));
  const { planId, quotaExempt, suspended } = body;

  const profilePatch: Record<string, unknown> = {};
  if (typeof quotaExempt === "boolean") profilePatch.quota_exempt = quotaExempt;
  if (typeof suspended === "boolean") profilePatch.suspended = suspended;

  if (Object.keys(profilePatch).length > 0) {
    const { error: profileError } = await s.from("profiles").update(profilePatch).eq("id", targetUserId);
    if (profileError) return NextResponse.json({ error: "profile_update_failed" }, { status: 500 });
  }

  if (typeof planId === "string" && ["free", "creator", "pro", "team", "lifetime"].includes(planId)) {
    const { error: subError } = await s.from("cloud_subscriptions").upsert({
      user_id: targetUserId,
      plan_id: planId,
      status: "active",
      provider: "admin_override",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (subError) return NextResponse.json({ error: "subscription_update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
