import { NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";

const MAX_EDITOR_STATE_BYTES = 4 * 1024 * 1024;

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const { data, error } = await auth.supabase
    .from("cloud_projects")
    .select("id,name,state,editor_state,created_at,updated_at")
    .eq("id", params.id)
    .eq("owner_id", auth.user.id)
    .neq("state", "deleting")
    .single();
  if (error || !data) return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  return NextResponse.json({ project: data });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const raw = await request.text();
  if (raw.length > MAX_EDITOR_STATE_BYTES) return NextResponse.json({ error: "project_state_too_large" }, { status: 413 });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw || "{}") as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    const name = body.name.trim().slice(0, 120);
    if (!name) return NextResponse.json({ error: "project_name_required" }, { status: 400 });
    patch.name = name;
  }
  if (body.editorState !== undefined) {
    if (!body.editorState || typeof body.editorState !== "object" || Array.isArray(body.editorState)) {
      return NextResponse.json({ error: "invalid_editor_state" }, { status: 400 });
    }
    patch.editor_state = body.editorState;
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "empty_patch" }, { status: 400 });
  const { data, error } = await auth.supabase
    .from("cloud_projects")
    .update(patch)
    .eq("id", params.id)
    .eq("owner_id", auth.user.id)
    .neq("state", "deleting")
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "project_update_failed" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const { data, error } = await auth.supabase
    .from("cloud_projects")
    .update({ state: "deleting" })
    .eq("id", params.id)
    .eq("owner_id", auth.user.id)
    .neq("state", "deleting")
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "project_delete_failed" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
