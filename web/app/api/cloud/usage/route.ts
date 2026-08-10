import { NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";

export async function GET() {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const { data, error } = await auth.supabase.rpc("cloud_usage_snapshot");
  if (error || !data) return NextResponse.json({ error: "usage_unavailable" }, { status: 503 });
  return NextResponse.json(data);
}
