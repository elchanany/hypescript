// Sound Effects של ElevenLabs — POST /v1/sound-generation
// מאחורי פעולה מפורשת של הסוכן/משתמש (צריכת מכסה).

import { NextRequest, NextResponse } from "next/server";
import { elevenLabsErrorHe, elevenLabsFetch } from "@/lib/elevenlabs/client";
import { requireCloudUser } from "@/lib/cloud/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TEXT = 450;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireCloudUser();
    if (auth.response) return auth.response;
    const body = await req.json() as {
      text?: string;
      duration_seconds?: number | null;
      prompt_influence?: number;
      loop?: boolean;
    };

    const text = String(body.text || "").trim();
    if (!text) return NextResponse.json({ error: "חסר תיאור לאפקט הקולי." }, { status: 400 });
    if (text.length > MAX_TEXT) {
      return NextResponse.json({ error: `התיאור ארוך מדי (${text.length}; מקסימום ${MAX_TEXT}).` }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      text,
      model_id: "eleven_text_to_sound_v2",
      prompt_influence: body.prompt_influence ?? 0.3,
    };
    if (body.loop === true) payload.loop = true;
    if (body.duration_seconds != null && Number.isFinite(Number(body.duration_seconds))) {
      const d = Math.max(0.5, Math.min(30, Number(body.duration_seconds)));
      payload.duration_seconds = d;
    }

    let resp: Response;
    try {
      resp = await elevenLabsFetch("/v1/sound-generation?output_format=mp3_44100_128", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify(payload),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (!resp.ok) {
      const errText = await resp.text();
      return NextResponse.json({ error: elevenLabsErrorHe(resp.status, errText) }, { status: resp.status });
    }

    const audio = await resp.arrayBuffer();
    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type": resp.headers.get("content-type") || "audio/mpeg",
        "Cache-Control": "no-store",
        "X-Sfx-Model": "eleven_text_to_sound_v2",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `שגיאת שרת: ${message}` }, { status: 500 });
  }
}
