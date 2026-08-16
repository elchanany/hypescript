import { NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";
import { getSupabaseServiceClient } from "@/lib/auth/server";
import { adminContext } from "@/lib/admin/server";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;

  const admin = await adminContext(auth.user.id);
  if (!admin.allowed || !admin.service) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const s = admin.service;
  const targetId = params.id;

  const [profileRes, rolesRes, subRes, projectsRes, eventsRes, creditRes] = await Promise.all([
    s.from("profiles").select("*").eq("id", targetId).single(),
    s.from("user_roles").select("role_id").eq("user_id", targetId),
    s.from("cloud_subscriptions").select("*").eq("user_id", targetId).maybeSingle(),
    s.from("cloud_projects").select("id,name,state,created_at,updated_at").eq("owner_id", targetId).order("updated_at", { ascending: false }),
    s.from("analytics_events").select("name,properties,occurred_at").eq("user_id", targetId).order("occurred_at", { ascending: false }).limit(200),
    s.from("credit_accounts").select("cached_available_micro_ils").eq("user_id", targetId).maybeSingle(),
  ]);

  if (!profileRes.data) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const roles = (rolesRes.data || []).map((r: any) => String(r.role_id));
  const isSuperAdmin = roles.includes("system_owner");
  const isAdmin = roles.includes("system_admin") || isSuperAdmin;

  // Aggregate verified provider usage from events
  const providerStats: Record<string, { calls: number; inputTokens: number; outputTokens: number; totalTokens: number }> = {
    openai: { calls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    anthropic: { calls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    gemini: { calls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    groq: { calls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    deepseek: { calls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    elevenlabs: { calls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 },
  };

  let lastActiveAt: string | null = profileRes.data.created_at;

  (eventsRes.data || []).forEach((ev: any) => {
    if (!lastActiveAt || new Date(ev.occurred_at) > new Date(lastActiveAt)) {
      lastActiveAt = ev.occurred_at;
    }
    const props = ev.properties || {};
    const prov = String(props.provider || props.service || "").toLowerCase();
    const matched = Object.keys(providerStats).find((k) => prov.includes(k));
    if (matched) {
      providerStats[matched].calls += 1;
      const inp = Number(props.inputTokens || props.prompt_tokens || 0);
      const out = Number(props.outputTokens || props.completion_tokens || 0);
      const tot = Number(props.totalTokens || props.total_tokens || inp + out);
      providerStats[matched].inputTokens += inp;
      providerStats[matched].outputTokens += out;
      providerStats[matched].totalTokens += tot;
    }
  });

  return NextResponse.json({
    ok: true,
    user: {
      ...profileRes.data,
      roles,
      isAdmin,
      isSuperAdmin,
      lastActiveAt,
      subscription: subRes.data || null,
      projects: projectsRes.data || [],
      creditBalanceIls: Number(creditRes.data?.cached_available_micro_ils || 0) / 1e6,
      providerStats,
      recentEvents: (eventsRes.data || []).slice(0, 30),
    },
  });
}
