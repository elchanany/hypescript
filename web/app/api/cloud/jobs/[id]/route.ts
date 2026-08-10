import { NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";
import { getRendererConfig } from "@/lib/cloud/config";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const { data, error } = await auth.supabase.from("cloud_jobs").select("id, project_id, status, stage, progress, result_asset_id, error_code, error_message, created_at, started_at, finished_at").eq("id", params.id).single();
  if (error || !data) return NextResponse.json({ error: "job_not_found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const renderer = getRendererConfig();
  const job = await auth.supabase.from("cloud_jobs").select("id, status").eq("id", params.id).single();
  if (job.error || !job.data) return NextResponse.json({ error: "job_not_found" }, { status: 404 });
  if (["completed", "failed", "cancelled"].includes(job.data.status)) return NextResponse.json({ status: job.data.status });
  await auth.supabase.from("cloud_jobs").update({ cancel_requested: true }).eq("id", params.id);
  if (renderer) {
    await fetch(`${renderer.url}/jobs/${params.id}`, {
      method: "DELETE", headers: { authorization: `Bearer ${renderer.token}` }, signal: AbortSignal.timeout(5_000),
    }).catch(() => null);
  }
  return NextResponse.json({ status: "cancelling" }, { status: 202 });
}
