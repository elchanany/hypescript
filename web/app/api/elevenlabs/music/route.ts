import { NextRequest, NextResponse } from "next/server";
import { elevenLabsErrorHe, elevenLabsFetch } from "@/lib/elevenlabs/client";
import { requireCloudUser } from "@/lib/cloud/auth";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const auth = await requireCloudUser();
  if (auth.response) return auth.response;
  const body = await req.json().catch(() => ({}));
  const prompt = String(body.prompt || "").trim();
  const durationSec = Math.max(3, Math.min(600, Number(body.durationSec) || 0));
  if (prompt.length < 8 || prompt.length > 4100) return NextResponse.json({ error: "תיאור המוזיקה חייב להכיל 8–4100 תווים." }, { status: 400 });
  if (!Number.isFinite(durationSec)) return NextResponse.json({ error: "משך מוזיקה לא תקין." }, { status: 400 });
  try {
    const response = await elevenLabsFetch("/v1/music?output_format=mp3_48000_192", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        prompt,
        music_length_ms: Math.round(durationSec * 1000),
        model_id: "music_v2",
        force_instrumental: body.instrumental !== false,
      }),
    });
    if (!response.ok) return NextResponse.json({ error: elevenLabsErrorHe(response.status, await response.text()) }, { status: response.status });
    return new NextResponse(await response.arrayBuffer(), {
      headers: {
        "content-type": response.headers.get("content-type") || "audio/mpeg",
        "cache-control": "no-store",
        "x-music-model": "music_v2",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "יצירת המוזיקה נכשלה." }, { status: 500 });
  }
}
