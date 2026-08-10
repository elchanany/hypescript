import { NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";
import { headObject } from "@/lib/cloud/r2";
import { getSupabaseServiceClient } from "@/lib/auth/server";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const query = await auth.supabase.from("cloud_assets").select("id, object_key, size_bytes, mime_type, state").eq("id", params.id).single();
  if (query.error || !query.data) return NextResponse.json({ error: "asset_not_found" }, { status: 404 });
  if (query.data.state === "available") return NextResponse.json({ assetId: query.data.id, state: "available" });
  try {
    const object = await headObject(query.data.object_key);
    if (Number(object.ContentLength) !== Number(query.data.size_bytes)) return NextResponse.json({ error: "uploaded_size_mismatch" }, { status: 409 });
    if (object.ContentType && object.ContentType !== query.data.mime_type) return NextResponse.json({ error: "uploaded_type_mismatch" }, { status: 409 });
  } catch {
    return NextResponse.json({ error: "uploaded_object_not_found" }, { status: 409 });
  }
  const service = getSupabaseServiceClient();
  if (!service) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  const { error } = await service.from("cloud_assets").update({ state: "available", uploaded_at: new Date().toISOString() }).eq("id", params.id).eq("owner_id", auth.user.id);
  if (error) return NextResponse.json({ error: "asset_finalize_failed" }, { status: 500 });
  return NextResponse.json({ assetId: params.id, state: "available" });
}
