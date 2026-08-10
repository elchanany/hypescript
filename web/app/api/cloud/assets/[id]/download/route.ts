import { NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";
import { signDownload } from "@/lib/cloud/r2";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const { data, error } = await auth.supabase.from("cloud_assets").select("object_key, original_name, state").eq("id", params.id).single();
  if (error || !data || data.state !== "available") return NextResponse.json({ error: "asset_not_found" }, { status: 404 });
  try {
    return NextResponse.json({ url: await signDownload(data.object_key, data.original_name), expiresInSeconds: 600 });
  } catch {
    return NextResponse.json({ error: "download_signing_failed" }, { status: 502 });
  }
}
