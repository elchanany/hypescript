import { NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";
import { cloudQuotaError } from "@/lib/cloud/quota";

export async function GET() {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const { data, error } = await auth.supabase.from("cloud_projects").select("*").order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: "cloud_schema_unavailable" }, { status: 503 });
  return NextResponse.json({ projects: data });
}

export async function POST(request: Request) {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  if (!name) return NextResponse.json({ error: "project_name_required" }, { status: 400 });
  const { data, error } = await auth.supabase.rpc("cloud_create_project", { p_name: name });
  const quota = cloudQuotaError(error);
  if (quota) return NextResponse.json({ error: quota.code }, { status: quota.status });
  if (error || !data) return NextResponse.json({ error: "project_create_failed" }, { status: 500 });
  return NextResponse.json({ id: data }, { status: 201 });
}
