// Proxy לתמלול: מקבל אודיו + מפתח מהלקוח ומעביר ל-Groq/OpenAI (endpoint תואם-OpenAI).
// זה נדרש כי OpenAI חוסם קריאות ישירות מהדפדפן (CORS); דרך פונקציית שרת זה עובד.
// האודיו קטן (mono דחוס) — נשאר מתחת למגבלת הגוף של Vercel.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const PROVIDERS: Record<string, string> = {
  groq: "https://api.groq.com/openai/v1",
  openai: "https://api.openai.com/v1",
};

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const apiKey = String(form.get("apiKey") || "");
    const provider = String(form.get("provider") || "groq");
    const model = String(form.get("model") || "whisper-large-v3");
    const language = String(form.get("language") || "he");

    if (!apiKey) {
      return NextResponse.json({ error: "חסר מפתח API. הזן אותו בהגדרות." }, { status: 400 });
    }
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "לא התקבל קובץ אודיו." }, { status: 400 });
    }

    const base = PROVIDERS[provider] || PROVIDERS.groq;
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
  } catch (err: any) {
    return NextResponse.json({ error: `שגיאת שרת: ${err?.message || err}` }, { status: 500 });
  }
}
