// רשימת מודלים ElevenLabs — GET /v1/models + מודלי STT ידועים.

import { NextResponse } from "next/server";
import { elevenLabsErrorHe, elevenLabsFetch } from "@/lib/elevenlabs/client";
import { KNOWN_STT_MODELS, KNOWN_TTS_MODELS } from "@/lib/elevenlabs/constants";
import { requireCloudUser } from "@/lib/cloud/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await requireCloudUser();
    if (auth.response) return auth.response;
    let resp: Response;
    try {
      resp = await elevenLabsFetch("/v1/models", { method: "GET" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // בלי מפתח — מחזירים את הרשימה הידועה כדי שהסוכן יוכל להציג אפשרויות
      return NextResponse.json({
        error: message,
        stt: KNOWN_STT_MODELS,
        tts: KNOWN_TTS_MODELS,
        source: "fallback",
      }, { status: 200 });
    }

    const text = await resp.text();
    if (!resp.ok) {
      return NextResponse.json({
        error: elevenLabsErrorHe(resp.status, text),
        stt: KNOWN_STT_MODELS,
        tts: KNOWN_TTS_MODELS,
        source: "fallback",
      }, { status: 200 });
    }

    const models = JSON.parse(text) as Array<Record<string, unknown>>;
    const tts = models
      .filter((m) => m.can_do_text_to_speech)
      .map((m) => ({
        id: String(m.model_id || ""),
        name: String(m.name || m.model_id || ""),
        description: String(m.description || ""),
        max_characters: m.max_characters_request_free_user ?? m.max_characters_request_subscribed_user ?? null,
        languages: Array.isArray(m.languages) ? m.languages : [],
        can_use_style: !!m.can_use_style,
        can_use_speaker_boost: !!m.can_use_speaker_boost,
      }));

    // STT לרוב לא מופיע ב-/v1/models — משלבים ידועים + כל מודל עם can_do_speech_to_text אם קיים
    const sttFromApi = models
      .filter((m) => m.can_do_speech_to_text || String(m.model_id || "").startsWith("scribe"))
      .map((m) => ({
        id: String(m.model_id || ""),
        name: String(m.name || m.model_id || ""),
        descriptionHe: String(m.description || ""),
      }));

    const sttIds = new Set(sttFromApi.map((m) => m.id));
    const stt = [
      ...sttFromApi,
      ...KNOWN_STT_MODELS.filter((m) => !sttIds.has(m.id)).map((m) => ({
        id: m.id,
        name: m.name,
        descriptionHe: m.descriptionHe,
      })),
    ];

    return NextResponse.json({
      stt,
      tts: tts.length ? tts : KNOWN_TTS_MODELS,
      source: "live",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `שגיאת שרת: ${message}` }, { status: 500 });
  }
}
