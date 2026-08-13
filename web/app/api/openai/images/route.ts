// OpenAI GPT Image — POST /v1/images/generations (gpt-image-1).
// המפתח מ-env בלבד (OPENAI_API_KEY); מחזיר את התמונה כ-bytes (image/png).
// מודלי GPT Image מחזירים תמיד b64_json (אין response_format) — מפענחים
// data[0].b64_json ומחזירים PNG. שגיאות מעלה מנוקות מסודות — המפתח לעולם לא מוחזר/מודפס.

import { NextRequest, NextResponse } from "next/server";
import {
  buildImagePayload,
  decodeFirstImage,
  openaiImageErrorHe,
  parseImageRequest,
} from "@/lib/openai/images";
import { requireCloudUser } from "@/lib/cloud/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireCloudUser();
    if (auth.response) return auth.response;
    const body = await req.json().catch(() => null);
    const parsed = parseImageRequest(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const key = (process.env.OPENAI_API_KEY || "").trim();
    if (!key) {
      return NextResponse.json(
        { error: "חסר OPENAI_API_KEY. הגדר אותו ב-Vercel או ב-web/.env.local." },
        { status: 400 },
      );
    }

    let resp: Response;
    try {
      resp = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(buildImagePayload(parsed.value)),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `שגיאת רשת מול OpenAI Images: ${message}` }, { status: 502 });
    }

    const text = await resp.text();
    if (!resp.ok) {
      return NextResponse.json({ error: openaiImageErrorHe(resp.status, text) }, { status: resp.status });
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "תשובת OpenAI Images אינה JSON תקין." }, { status: 502 });
    }

    const image = decodeFirstImage(data);
    if (!image) {
      return NextResponse.json({ error: "OpenAI Images לא החזיר תמונה (b64_json)." }, { status: 502 });
    }

    return new NextResponse(image.bytes, {
      status: 200,
      headers: {
        "Content-Type": image.mime,
        "Content-Length": String(image.bytes.byteLength),
        "X-Image-Model": parsed.value.model,
        "X-Image-Size": parsed.value.size,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `שגיאת שרת: ${message}` }, { status: 500 });
  }
}
