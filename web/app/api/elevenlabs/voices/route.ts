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
    const language = sp.get("language") || "";
    const gender = sp.get("gender") || "";
    const preferCampaign = sp.get("prefer_campaign") === "1" || sp.get("prefer_campaign") === "true";
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

    const mapped = (data.voices || []).map((v) => ({
      voice_id: String(v.voice_id || ""),
      name: String(v.name || ""),
      category: v.category ? String(v.category) : undefined,
      description: String(v.description || ""),
      preview_url: (v.preview_url as string | null) || null,
      labels: (v.labels as Record<string, unknown>) || {},
      high_quality_base_model_ids: Array.isArray(v.high_quality_base_model_ids)
        ? (v.high_quality_base_model_ids as string[])
        : [],
    }));

    const { filterAndRankVoices } = await import("@/lib/elevenlabs/voicesFilter");
    const { voices, noteHe } = filterAndRankVoices(mapped, {
      language: language || null,
      gender: (gender === "male" || gender === "female" || gender === "neutral") ? gender : null,
      preferCampaign,
      preferV3: preferCampaign,
    });

    return NextResponse.json({
      voices,
      has_more: !!data.has_more,
      total_count: data.total_count ?? voices.length,
      note_he: noteHe || undefined,
      hint_he:
        "לקריינות עברית: generate_narration עם model_id=eleven_v3 ו-language_code=he. " +
        "אין חובה לקול עם תווית hebrew — חיפוש ריק ל־hebrew אינו אומר שאין קריינות עברית.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `שגיאת שרת: ${message}` }, { status: 500 });
  }
}
