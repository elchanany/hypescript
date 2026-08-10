import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSupabaseServiceClient } from "@/lib/auth/server";
import { getRendererConfig } from "@/lib/cloud/config";
import { deleteObject } from "@/lib/cloud/r2";

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
  const found = await service.from("cloud_jobs").select("id, owner_id, project_id, output_key, status, result_asset_id, usage_seconds").eq("id", jobId).single();
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
  if (status === "completed") {
    const completed = await service.rpc("cloud_complete_render", {
      p_job_id: jobId,
      p_size_bytes: Math.max(0, Number(body.sizeBytes) || 0),
      p_render_seconds: Math.max(0, Number(body.renderedSeconds) || Number(found.data.usage_seconds) || 0),
    });
    if (completed.error) {
      if (completed.error.message.includes("storage_quota_exceeded") && found.data.output_key) {
        await deleteObject(found.data.output_key).catch(() => null);
        await service.from("cloud_jobs").update({
          status: "failed", usage_seconds: 0,
          error_code: completed.error.message.includes("global_storage_quota_exceeded") ? "global_storage_quota_exceeded" : "result_storage_quota_exceeded",
          error_message: "Rendered file exceeds storage quota", finished_at: new Date().toISOString(),
        }).eq("id", jobId);
        return NextResponse.json({ ok: true, rejected: "storage_quota_exceeded" });
      }
      return NextResponse.json({ error: "result_asset_create_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, resultAssetId: completed.data });
  }
  await service.from("cloud_jobs").update({
    status, progress: Number(body.progress) || 0, usage_seconds: 0,
    error_code: typeof body.errorCode === "string" ? body.errorCode.slice(0, 100) : null,
    error_message: typeof body.errorMessage === "string" ? body.errorMessage.slice(0, 1000) : null,
    finished_at: new Date().toISOString(),
  }).eq("id", jobId);
  return NextResponse.json({ ok: true });
}
