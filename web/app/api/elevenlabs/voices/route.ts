// רשימת קולות ElevenLabs — GET /v2/voices (מפתח מ-env בלבד).

import { NextRequest, NextResponse } from "next/server";
import { elevenLabsErrorHe, elevenLabsFetch } from "@/lib/elevenlabs/client";
import { requireCloudUser } from "@/lib/cloud/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireCloudUser();
    if (auth.response) return auth.response;
    const sp = req.nextUrl.searchParams;
    const pageSize = sp.get("page_size") || "30";
    const search = sp.get("search") || "";
    const qs = new URLSearchParams({ page_size: pageSize });
    if (search) qs.set("search", search);

    let resp: Response;
    try {
      resp = await elevenLabsFetch(`/v2/voices?${qs.toString()}`, { method: "GET" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const text = await resp.text();
    if (!resp.ok) {
      return NextResponse.json({ error: elevenLabsErrorHe(resp.status, text) }, { status: resp.status });
    }

    const data = JSON.parse(text) as {
      voices?: Array<Record<string, unknown>>;
      has_more?: boolean;
      total_count?: number;
    };

    const voices = (data.voices || []).map((v) => ({
      voice_id: v.voice_id,
      name: v.name,
      category: v.category,
      description: v.description || "",
      preview_url: v.preview_url || null,
      labels: v.labels || {},
      high_quality_base_model_ids: v.high_quality_base_model_ids || [],
    }));

    return NextResponse.json({
      voices,
      has_more: !!data.has_more,
      total_count: data.total_count ?? voices.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `שגיאת שרת: ${message}` }, { status: 500 });
  }
}
