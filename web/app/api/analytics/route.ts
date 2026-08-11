import { NextRequest, NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";
export async function POST(req: NextRequest) {
  const a = await requireCloudUser();
  if (a.response) return a.response;
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || "").slice(0, 80);
  if (name.length < 2)
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  const { error } = await a.supabase
    .from("analytics_events")
    .insert({
      user_id: a.user.id,
      name,
      path: String(b.path || "").slice(0, 300),
      properties: typeof b.properties === "object" ? b.properties : {},
    });
  return error
    ? NextResponse.json({ ignored: true })
    : NextResponse.json({ ok: true });
}
export async function GET() {
  const a = await requireCloudUser();
  if (a.response) return a.response;
  const { data, error } = await a.supabase
    .from("analytics_events")
    .select("name,path,properties,occurred_at")
    .eq("user_id", a.user.id)
    .order("occurred_at", { ascending: false })
    .limit(10000);
  if (error)
    return NextResponse.json({ error: "export_failed" }, { status: 500 });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": "attachment; filename=hypescript-analytics.json",
    },
  });
}
