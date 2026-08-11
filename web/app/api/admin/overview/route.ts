import { NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";
import { getSupabaseServiceClient } from "@/lib/auth/server";
export async function GET() {
  const a = await requireCloudUser();
  if (a.response) return a.response;
  const s = getSupabaseServiceClient();
  if (!s)
    return NextResponse.json({ error: "admin_unavailable" }, { status: 503 });
  const { data: roles } = await s
    .from("user_roles")
    .select("role_id")
    .eq("user_id", a.user.id);
  if (!roles?.some((r) => ["system_owner", "system_admin"].includes(r.role_id)))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const [users, projects, subs, events, credits] = await Promise.all([
    s.from("profiles").select("id", { count: "exact", head: true }),
    s.from("cloud_projects").select("id", { count: "exact", head: true }),
    s.from("cloud_subscriptions").select("status,plan_id"),
    s
      .from("analytics_events")
      .select("name,occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(200),
    s.from("credit_accounts").select("cached_available_micro_ils"),
  ]);
  return NextResponse.json({
    users: users.count || 0,
    projects: projects.count || 0,
    subscriptions: subs.data || [],
    events: events.data || [],
    creditLiabilityIls:
      (credits.data || []).reduce(
        (n, r) => n + Number(r.cached_available_micro_ils || 0),
        0,
      ) / 1e6,
  });
}
