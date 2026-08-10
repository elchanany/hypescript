import { NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";
import { getRendererConfig, getR2Config } from "@/lib/cloud/config";
import { renderObjectKey } from "@/lib/cloud/r2";

interface ClipInput { assetId: string; start: number; end: number }

function parseClips(value: unknown): ClipInput[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 1000) return null;
  const clips = value.map((item) => ({
    assetId: typeof item?.assetId === "string" ? item.assetId : "",
    start: Number(item?.start), end: Number(item?.end),
  }));
  return clips.every((clip) => clip.assetId && Number.isFinite(clip.start) && Number.isFinite(clip.end) && clip.start >= 0 && clip.end > clip.start) ? clips : null;
}

export async function POST(request: Request) {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const renderer = getRendererConfig();
  const r2 = getR2Config();
  if (!renderer || !r2) return NextResponse.json({ error: "cloud_render_not_configured" }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  const clips = parseClips(body.clips);
  if (!projectId || !clips) return NextResponse.json({ error: "invalid_render_plan" }, { status: 400 });
  const project = await auth.supabase.from("cloud_projects").select("id").eq("id", projectId).single();
  if (project.error || !project.data) return NextResponse.json({ error: "project_not_found" }, { status: 404 });

  const assetIds = [...new Set(clips.map((clip) => clip.assetId))];
  const assets = await auth.supabase.from("cloud_assets").select("id, object_key, mime_type, original_name").in("id", assetIds).eq("state", "available");
  if (assets.error || !assets.data || assets.data.length !== assetIds.length) return NextResponse.json({ error: "render_asset_unavailable" }, { status: 409 });
  const assetMap = new Map(assets.data.map((asset) => [asset.id, asset]));

  const inserted = await auth.supabase.from("cloud_jobs").insert({ owner_id: auth.user.id, project_id: projectId, type: "render", status: "dispatching", progress: 0 }).select("id").single();
  if (inserted.error || !inserted.data) return NextResponse.json({ error: "render_job_create_failed" }, { status: 500 });
  const jobId = inserted.data.id;
  const outputKey = renderObjectKey(auth.user.id, projectId, jobId);
  const workerPayload = {
    jobId,
    bucket: r2.bucket,
    callbackUrl: renderer.callbackUrl,
    outputKey,
    inputs: assetIds.map((id) => ({ id, objectKey: assetMap.get(id)!.object_key, mimeType: assetMap.get(id)!.mime_type })),
    clips,
    target: {
      width: Math.max(320, Math.min(3840, Number(body.target?.width) || 1920)),
      height: Math.max(240, Math.min(2160, Number(body.target?.height) || 1080)),
      fps: Math.max(12, Math.min(60, Number(body.target?.fps) || 30)),
    },
  };
  try {
    const response = await fetch(`${renderer.url}/jobs`, {
      method: "POST",
      headers: { authorization: `Bearer ${renderer.token}`, "content-type": "application/json" },
      body: JSON.stringify(workerPayload),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`worker_${response.status}`);
    await auth.supabase.from("cloud_jobs").update({ status: "queued", provider_job_id: jobId, output_key: outputKey }).eq("id", jobId).eq("status", "dispatching");
    return NextResponse.json({ jobId, status: "queued" }, { status: 202 });
  } catch {
    await auth.supabase.from("cloud_jobs").update({ status: "failed", error_code: "dispatch_failed", finished_at: new Date().toISOString() }).eq("id", jobId);
    return NextResponse.json({ error: "render_dispatch_failed", jobId }, { status: 502 });
  }
}
