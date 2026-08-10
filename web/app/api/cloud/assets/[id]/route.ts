import { NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";
import { deleteObject } from "@/lib/cloud/r2";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const { data, error } = await auth.supabase.from("cloud_assets").select("object_key").eq("id", params.id).single();
  if (error || !data) return NextResponse.json({ error: "asset_not_found" }, { status: 404 });
  try { await deleteObject(data.object_key); } catch { return NextResponse.json({ error: "storage_delete_failed" }, { status: 502 }); }
  const removed = await auth.supabase.from("cloud_assets").delete().eq("id", params.id);
  if (removed.error) return NextResponse.json({ error: "asset_delete_failed" }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
