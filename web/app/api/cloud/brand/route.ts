import { NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";

export async function GET() {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const { data, error } = await auth.supabase
    .from("user_profiles")
    .select("brand_kit")
    .eq("user_id", auth.user.id)
    .single();
  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ brandKit: null });
  }
  return NextResponse.json({ brandKit: data?.brand_kit || null });
}

export async function PUT(request: Request) {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({}));
  const kit = body.kit || null;

  const { error } = await auth.supabase
    .from("user_profiles")
    .upsert({ user_id: auth.user.id, brand_kit: kit, updated_at: new Date().toISOString() });

  if (error) {
    return NextResponse.json({ ok: false, error: "brand_sync_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
