import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSupabaseServiceClient } from "@/lib/auth/server";
import { getRendererConfig } from "@/lib/cloud/config";

function secretMatches(received: string, expected: string) {
  const a = Buffer.from(received); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const renderer = getRendererConfig();
  const received = request.headers.get("x-render-callback-secret") || "";
  if (!renderer || !secretMatches(received, renderer.callbackSecret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const service = getSupabaseServiceClient();
  if (!service) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const jobId = typeof body.jobId === "string" ? body.jobId : "";
  if (!jobId) return NextResponse.json({ error: "job_id_required" }, { status: 400 });
  const found = await service.from("cloud_jobs").select("id, owner_id, project_id, output_key, status, result_asset_id").eq("id", jobId).single();
  if (found.error || !found.data) return NextResponse.json({ error: "job_not_found" }, { status: 404 });
  if (["completed", "failed", "cancelled"].includes(found.data.status)) return NextResponse.json({ ok: true, duplicate: true });
  if (body.status === "running") {
    await service.from("cloud_jobs").update({
      status: "running", stage: "rendering", progress: Math.max(0, Math.min(0.99, Number(body.progress) || 0)),
      started_at: new Date().toISOString(),
    }).eq("id", jobId);
    return NextResponse.json({ ok: true });
  }
  const status = body.status === "completed" ? "completed" : body.status === "cancelled" ? "cancelled" : "failed";
  let resultAssetId: string | null = null;
  if (status === "completed") {
    const existing = await service.from("cloud_assets").select("id").eq("object_key", found.data.output_key).maybeSingle();
    if (existing.data) resultAssetId = existing.data.id;
    else {
      const inserted = await service.from("cloud_assets").insert({
        owner_id: found.data.owner_id, project_id: found.data.project_id, object_key: found.data.output_key,
        original_name: `hypescript-${jobId}.mp4`, mime_type: "video/mp4", media_kind: "video",
        size_bytes: Math.max(0, Number(body.sizeBytes) || 0), state: "available", uploaded_at: new Date().toISOString(), source: "render",
      }).select("id").single();
      if (inserted.error) return NextResponse.json({ error: "result_asset_create_failed" }, { status: 500 });
      resultAssetId = inserted.data.id;
    }
  }
  await service.from("cloud_jobs").update({
    status, progress: status === "completed" ? 1 : Number(body.progress) || 0,
    result_asset_id: resultAssetId, error_code: typeof body.errorCode === "string" ? body.errorCode.slice(0, 100) : null,
    error_message: typeof body.errorMessage === "string" ? body.errorMessage.slice(0, 1000) : null,
    finished_at: new Date().toISOString(),
  }).eq("id", jobId);
  return NextResponse.json({ ok: true });
}
