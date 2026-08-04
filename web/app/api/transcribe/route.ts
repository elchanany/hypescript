// Proxy לתמלול: מקבל אודיו ומעביר ל-Groq / OpenAI / ElevenLabs.
// המפתח נקרא מ-env בצד השרת בלבד (ElevenLabs תמיד; Groq/OpenAI עם fallback ל-dev).
// האודיו קטן (mono דחוס) — נשאר מתחת למגבלת הגוף של Vercel.

import { NextRequest, NextResponse } from "next/server";
import { elevenLabsErrorHe, elevenLabsFetch } from "@/lib/elevenlabs/client";
import { DEFAULT_STT_MODEL, DEFAULT_STT_OPTIONS } from "@/lib/elevenlabs/constants";
import { normalizeElevenLabsStt, toCompatResponse } from "@/lib/elevenlabs/normalize";

export const runtime = "nodejs";
export const maxDuration = 60;

const OPENAI_COMPAT: Record<string, string> = {
  groq: "https://api.groq.com/openai/v1",
  openai: "https://api.openai.com/v1",
};

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const provider = String(form.get("provider") || "groq").toLowerCase();
    const language = String(form.get("language") || "he");

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "לא התקבל קובץ אודיו." }, { status: 400 });
    }

    if (provider === "elevenlabs") {
      return await transcribeElevenLabs(form, file, language);
    }

    return await transcribeOpenAiCompat(form, file, provider, language);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `שגיאת שרת: ${message}` }, { status: 500 });
  }
}

async function transcribeElevenLabs(form: FormData, file: Blob, language: string) {
  const model = String(form.get("model") || DEFAULT_STT_MODEL);
  const tagEvents = String(form.get("tag_audio_events") ?? "true") !== "false";
  const diarize = String(form.get("diarize") ?? "true") !== "false";
  const noVerbatim = String(form.get("no_verbatim") ?? "false") === "true";
  const numSpeakers = form.get("num_speakers");
  const keyterms = String(form.get("keyterms") || "").trim();

  const upstream = new FormData();
  upstream.append("file", file, "audio.mp3");
  upstream.append("model_id", model);
  upstream.append("language_code", language || DEFAULT_STT_OPTIONS.language_code);
  upstream.append("tag_audio_events", String(tagEvents));
  upstream.append("diarize", String(diarize));
  upstream.append("timestamps_granularity", DEFAULT_STT_OPTIONS.timestamps_granularity);
  if (noVerbatim) upstream.append("no_verbatim", "true");
  if (numSpeakers != null && String(numSpeakers).trim()) {
    upstream.append("num_speakers", String(numSpeakers));
  }
  // Keyterms: JSON array או רשימה מופרדת בפסיקים
  if (keyterms) {
    try {
      const parsed = JSON.parse(keyterms);
      if (Array.isArray(parsed)) {
        for (const term of parsed) upstream.append("keyterms", String(term));
      } else {
        upstream.append("keyterms", keyterms);
      }
    } catch {
      for (const term of keyterms.split(",").map((t) => t.trim()).filter(Boolean)) {
        upstream.append("keyterms", term);
      }
    }
  }

  let resp: Response;
  try {
    resp = await elevenLabsFetch("/v1/speech-to-text", { method: "POST", body: upstream });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const text = await resp.text();
  if (!resp.ok) {
    return NextResponse.json({ error: elevenLabsErrorHe(resp.status, text) }, { status: resp.status });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "תשובת ElevenLabs אינה JSON תקין." }, { status: 502 });
  }

  const norm = normalizeElevenLabsStt(raw as Parameters<typeof normalizeElevenLabsStt>[0], model);
  if (!norm.words.length) {
    return NextResponse.json({ error: "ElevenLabs לא החזיר מילים עם חותמות זמן." }, { status: 502 });
  }
  return NextResponse.json(toCompatResponse(norm));
}

async function transcribeOpenAiCompat(
  form: FormData,
  file: Blob,
  provider: string,
  language: string,
) {
  const model = String(form.get("model") || "whisper-large-v3");
  const envKey = provider === "openai" ? process.env.OPENAI_API_KEY : process.env.GROQ_API_KEY;
  const apiKey = (envKey || String(form.get("apiKey") || "")).trim();

  if (!apiKey) {
    return NextResponse.json(
      { error: "חסר מפתח תמלול. הגדר GROQ_API_KEY (או OPENAI_API_KEY) במשתני הסביבה של Vercel." },
      { status: 400 },
    );
  }

  const base = OPENAI_COMPAT[provider] || OPENAI_COMPAT.groq;
  const upstream = new FormData();
  upstream.append("file", file, "audio.mp3");
  upstream.append("model", model);
  upstream.append("language", language);
  upstream.append("response_format", "verbose_json");
  upstream.append("timestamp_granularities[]", "word");
  upstream.append("timestamp_granularities[]", "segment");

  const resp = await fetch(`${base}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: upstream,
  });

  const text = await resp.text();
  if (!resp.ok) {
    return NextResponse.json(
      { error: `שגיאת ${provider} (${resp.status}): ${text.slice(0, 400)}` },
      { status: resp.status },
    );
  }
  return new NextResponse(text, { status: 200, headers: { "Content-Type": "application/json" } });
}
