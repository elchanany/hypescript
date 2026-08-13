import { NextRequest, NextResponse } from "next/server";
import { requireCloudUser } from "@/lib/cloud/auth";
import { getAiAccess } from "@/lib/billing/aiAccess.server";
import { deleteByokKey, isByokProvider, listByokProviders, saveByokKey } from "@/lib/providers/byok.server";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const access = await getAiAccess(auth.supabase, auth.user);
  const providers = access.canUseByok ? await listByokProviders(auth.user.id) : [];
  return NextResponse.json({ ...access, providers });
}

export async function PUT(req: NextRequest) {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const access = await getAiAccess(auth.supabase, auth.user);
  if (!access.canUseByok) return NextResponse.json({ error: "pro_required" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (!isByokProvider(body.provider)) return NextResponse.json({ error: "unsupported_provider" }, { status: 400 });
  const apiKey = String(body.apiKey || "").trim();
  if (apiKey.length < 12 || apiKey.length > 500) return NextResponse.json({ error: "invalid_api_key" }, { status: 400 });
  try {
    await saveByokKey(auth.user.id, body.provider, apiKey);
    return NextResponse.json({ ok: true, provider: body.provider });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "byok_save_failed" }, { status: 503 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const access = await getAiAccess(auth.supabase, auth.user);
  const body = await req.json().catch(() => ({}));
  const mode = body.mode === "byok" ? "byok" : "managed";
  if (mode === "byok" && !access.canUseByok) return NextResponse.json({ error: "pro_required" }, { status: 403 });
  const { error } = await auth.supabase.from("user_settings").update({ provider_mode: mode, updated_at: new Date().toISOString() }).eq("user_id", auth.user.id);
  if (error) return NextResponse.json({ error: "provider_mode_update_failed" }, { status: 500 });
  return NextResponse.json({ ok: true, providerMode: mode });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const body = await req.json().catch(() => ({}));
  if (!isByokProvider(body.provider)) return NextResponse.json({ error: "unsupported_provider" }, { status: 400 });
  await deleteByokKey(auth.user.id, body.provider);
  return NextResponse.json({ ok: true });
}
