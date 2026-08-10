import { NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";
import { getCloudUploadLimitBytes, getR2Config } from "@/lib/cloud/config";
import { assetObjectKey, signUpload } from "@/lib/cloud/r2";
import { cloudQuotaError } from "@/lib/cloud/quota";
import { getSupabaseServiceClient } from "@/lib/auth/server";

const ALLOWED = /^(video|audio|image)\//;

export async function POST(request: Request) {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  if (!getR2Config()) return NextResponse.json({ error: "r2_not_configured" }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 255) : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType.trim().toLowerCase() : "";
  const sizeBytes = Number(body.sizeBytes);
  if (!projectId || !name || !ALLOWED.test(mimeType) || !Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) {
    return NextResponse.json({ error: "invalid_upload" }, { status: 400 });
  }
  if (sizeBytes > getCloudUploadLimitBytes()) return NextResponse.json({ error: "upload_too_large" }, { status: 413 });

  const owned = await auth.supabase.from("cloud_projects").select("id").eq("id", projectId).single();
  if (owned.error || !owned.data) return NextResponse.json({ error: "project_not_found" }, { status: 404 });

  const objectKey = assetObjectKey(auth.user.id, projectId, name);
  const { data, error } = await auth.supabase.rpc("cloud_reserve_asset", {
    p_project_id: projectId,
    p_object_key: objectKey,
    p_original_name: name,
    p_mime_type: mimeType,
    p_media_kind: mimeType.split("/")[0],
    p_size_bytes: sizeBytes,
  });
  const quota = cloudQuotaError(error);
  if (quota) return NextResponse.json({ error: quota.code }, { status: quota.status });
  if (error || !data) return NextResponse.json({ error: "asset_reservation_failed" }, { status: 500 });
  try {
    const uploadUrl = await signUpload(objectKey, mimeType);
    return NextResponse.json({ assetId: data, objectKey, uploadUrl, headers: { "content-type": mimeType }, expiresInSeconds: 900 }, { status: 201 });
  } catch {
    await getSupabaseServiceClient()?.from("cloud_assets").delete().eq("id", data).eq("owner_id", auth.user.id);
    return NextResponse.json({ error: "upload_signing_failed" }, { status: 502 });
  }
}
