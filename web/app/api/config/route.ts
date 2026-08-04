// מחזיר אילו ספקים מוגדרים (מפתח קיים ב-env) — בלי לחשוף את הערכים.
// גם סטטוס מפתחות תמלול (Groq / ElevenLabs).

import { NextResponse } from "next/server";
import { configuredProviders } from "@/lib/agent/providers";
import { elevenLabsConfigured } from "@/lib/elevenlabs/client";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    providers: configuredProviders(),
    transcription: {
      groq: !!(process.env.GROQ_API_KEY || "").trim(),
      elevenlabs: elevenLabsConfigured(),
    },
  });
}
