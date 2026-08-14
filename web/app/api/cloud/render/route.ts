import { NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";
import { getRendererConfig, getR2Config } from "@/lib/cloud/config";
import { renderObjectKey } from "@/lib/cloud/r2";
import { cloudQuotaError } from "@/lib/cloud/quota";
import { getSupabaseServiceClient } from "@/lib/auth/server";

interface ClipInput { assetId?: string; start: number; end: number; gap?: boolean }
interface AudioInput { assetId: string; start: number; end: number; timelineStart: number; volume: number; fadeIn: number; fadeOut: number }
interface OverlayInput { assetId: string; start: number; end: number; x: number; y: number; width: number; height: number; rotation: number; opacity: number; fadeIn: number; fadeOut: number }

function parseClips(value: unknown): ClipInput[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 1000) return null;
  const clips = value.map((item) => ({
    assetId: typeof item?.assetId === "string" ? item.assetId : "",
    start: Number(item?.start), end: Number(item?.end),
    gap: item?.gap === true,
  }));
  return clips.every((clip) => (clip.gap || clip.assetId) && Number.isFinite(clip.start) && Number.isFinite(clip.end) && clip.start >= 0 && clip.end > clip.start) ? clips : null;
}

function finite(value: unknown, fallback = 0) { const out = Number(value); return Number.isFinite(out) ? out : fallback; }
function parseAudio(value: unknown): AudioInput[] | null {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 250) return null;
  const items = value.map((item) => ({ assetId: typeof item?.assetId === "string" ? item.assetId : "", start: finite(item?.start), end: finite(item?.end), timelineStart: Math.max(0, finite(item?.timelineStart)), volume: Math.max(0, Math.min(4, finite(item?.volume, 1))), fadeIn: Math.max(0, finite(item?.fadeIn)), fadeOut: Math.max(0, finite(item?.fadeOut)) }));
  return items.every((item) => item.assetId && item.end > item.start) ? items : null;
}
function parseOverlays(value: unknown): OverlayInput[] | null {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 100) return null;
  const items = value.map((item) => ({ assetId: typeof item?.assetId === "string" ? item.assetId : "", start: Math.max(0, finite(item?.start)), end: finite(item?.end), x: finite(item?.x), y: finite(item?.y), width: Math.max(8, finite(item?.width, 8)), height: Math.max(8, finite(item?.height, 8)), rotation: finite(item?.rotation), opacity: Math.max(0, Math.min(1, finite(item?.opacity, 1))), fadeIn: Math.max(0, finite(item?.fadeIn)), fadeOut: Math.max(0, finite(item?.fadeOut)) }));
  return items.every((item) => item.assetId && item.end > item.start) ? items : null;
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
  const audioClips = parseAudio(body.audioClips);
  const overlays = parseOverlays(body.overlays);
  if (!projectId || !clips || !audioClips || !overlays) return NextResponse.json({ error: "invalid_render_plan" }, { status: 400 });
  const project = await auth.supabase.from("cloud_projects").select("id").eq("id", projectId).single();
  if (project.error || !project.data) return NextResponse.json({ error: "project_not_found" }, { status: 404 });

  const assetIds = [...new Set([...clips.flatMap((clip) => clip.assetId ? [clip.assetId] : []), ...audioClips.map((clip) => clip.assetId), ...overlays.map((overlay) => overlay.assetId)])];
  const assets = await auth.supabase.from("cloud_assets").select("id, object_key, mime_type, original_name").in("id", assetIds).eq("state", "available");
  if (assets.error || !assets.data || assets.data.length !== assetIds.length) return NextResponse.json({ error: "render_asset_unavailable" }, { status: 409 });
  const assetMap = new Map(assets.data.map((asset) => [asset.id, asset]));

  const visualSeconds = clips.reduce((total, clip) => total + clip.end - clip.start, 0);
  const estimatedSeconds = Math.max(visualSeconds, ...audioClips.map((clip) => clip.timelineStart + clip.end - clip.start), ...overlays.map((overlay) => overlay.end));
  const reserved = await auth.supabase.rpc("cloud_reserve_render", {
    p_project_id: projectId,
    p_estimated_seconds: estimatedSeconds,
  });
  const quota = cloudQuotaError(reserved.error);
  if (quota) return NextResponse.json({ error: quota.code }, { status: quota.status });
  if (reserved.error || !reserved.data) return NextResponse.json({ error: "render_job_create_failed" }, { status: 500 });
  const jobId = String(reserved.data);
  const service = getSupabaseServiceClient();
  if (!service) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  const outputKey = renderObjectKey(auth.user.id, projectId, jobId);
  const workerPayload = {
    jobId,
    bucket: r2.bucket,
    callbackUrl: renderer.callbackUrl,
    outputKey,
    inputs: assetIds.map((id) => ({ id, objectKey: assetMap.get(id)!.object_key, mimeType: assetMap.get(id)!.mime_type })),
    clips,
    audioClips,
    overlays,
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
    await service.from("cloud_jobs").update({ status: "queued", provider_job_id: jobId, output_key: outputKey }).eq("id", jobId).eq("owner_id", auth.user.id).eq("status", "dispatching");
    return NextResponse.json({ jobId, status: "queued" }, { status: 202 });
  } catch {
    await service.from("cloud_jobs").update({ status: "failed", usage_seconds: 0, error_code: "dispatch_failed", finished_at: new Date().toISOString() }).eq("id", jobId).eq("owner_id", auth.user.id);
    return NextResponse.json({ error: "render_dispatch_failed", jobId }, { status: 502 });
  }
}
