import { NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";
import { getSupabaseServiceClient } from "@/lib/auth/server";
import { adminContext } from "@/lib/admin/server";
export async function GET() {
  const a = await requireCloudUser();
  if (a.response) return a.response;
  const s = getSupabaseServiceClient();
  if (!s)
    return NextResponse.json({ error: "admin_unavailable" }, { status: 503 });
  const admin = await adminContext(a.user.id);
  if (!admin.allowed)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [users, profiles, projects, subs, events, credits] = await Promise.all([
    s.from("profiles").select("id", { count: "exact", head: true }),
    s.from("profiles").select("id,email,display_name,avatar_url,created_at,suspended,quota_exempt").order("created_at", { ascending: false }).limit(100),
    s.from("cloud_projects").select("id", { count: "exact", head: true }),
    s.from("cloud_subscriptions").select("user_id,status,plan_id,current_period_end,updated_at"),
    s
      .from("analytics_events")
      .select("user_id,name,path,properties,occurred_at")
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(1000),
    s.from("credit_accounts").select("cached_available_micro_ils"),
  ]);
  const subscriptionByUser = new Map((subs.data || []).map((row: any) => [row.user_id, row]));
  const eventCounts = (events.data || []).reduce((acc: Record<string, number>, row: any) => { acc[row.name] = (acc[row.name] || 0) + 1; return acc; }, {});
  const uniqueVisitors = new Set((events.data || []).map((row: any) => row.user_id)).size;
  return NextResponse.json({
    users: users.count || 0,
    projects: projects.count || 0,
    subscriptions: subs.data || [],
    events: events.data || [],
    eventCounts,
    uniqueVisitors,
    usersList: (profiles.data || []).map((profile: any) => ({ ...profile, subscription: subscriptionByUser.get(profile.id) || null })),
    creditLiabilityIls:
      (credits.data || []).reduce(
        (n, r) => n + Number(r.cached_available_micro_ils || 0),
        0,
      ) / 1e6,
  });
}
