// Text-to-Speech של ElevenLabs — POST /v1/text-to-speech/{voice_id}
// המפתח מ-env בלבד; מחזיר אודיו בינארי.

import { NextRequest, NextResponse } from "next/server";
import { elevenLabsErrorHe, elevenLabsFetch } from "@/lib/elevenlabs/client";
import { DEFAULT_TTS_MODEL } from "@/lib/elevenlabs/constants";
import { requireCloudUser } from "@/lib/cloud/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TEXT_CHARS = 10_000;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireCloudUser();
    if (auth.response) return auth.response;
    const body = await req.json() as {
      text?: string;
      voice_id?: string;
      model_id?: string;
      language_code?: string;
      stability?: number;
      similarity_boost?: number;
      style?: number;
      use_speaker_boost?: boolean;
      output_format?: string;
    };

    const text = String(body.text || "").trim();
    const voiceId = String(body.voice_id || "").trim();
    if (!text) return NextResponse.json({ error: "חסר טקסט לקריינות." }, { status: 400 });
    if (!voiceId) return NextResponse.json({ error: "חסר voice_id. השתמש ב-list_voices תחילה." }, { status: 400 });
    if (text.length > MAX_TEXT_CHARS) {
      return NextResponse.json(
        { error: `הטקסט ארוך מדי (${text.length} תווים; מקסימום ${MAX_TEXT_CHARS} לבקשה אחת).` },
        { status: 400 },
      );
    }

    const modelId = String(body.model_id || DEFAULT_TTS_MODEL);
    const languageCode = String(body.language_code || "he");
    const outputFormat = String(body.output_format || "mp3_44100_128");

    const payload: Record<string, unknown> = {
      text,
      model_id: modelId,
      language_code: languageCode,
      voice_settings: {
        stability: body.stability ?? 0.45,
        similarity_boost: body.similarity_boost ?? 0.8,
        style: body.style ?? 0.35,
        use_speaker_boost: body.use_speaker_boost !== false,
      },
    };

    let resp: Response;
    try {
      resp = await elevenLabsFetch(
        `/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(outputFormat)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
          body: JSON.stringify(payload),
        },
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (!resp.ok) {
      const errText = await resp.text();
      return NextResponse.json({ error: elevenLabsErrorHe(resp.status, errText) }, { status: resp.status });
    }

    const audio = await resp.arrayBuffer();
    const requestId = resp.headers.get("request-id") || resp.headers.get("x-request-id") || "";
    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type": resp.headers.get("content-type") || "audio/mpeg",
        "X-Voice-Id": voiceId,
        "X-Model-Id": modelId,
        ...(requestId ? { "X-Request-Id": requestId } : {}),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `שגיאת שרת: ${message}` }, { status: 500 });
  }
}
