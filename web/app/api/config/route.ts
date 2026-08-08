// מחזיר אילו ספקים מוגדרים (מפתח קיים ב-env) — בלי לחשוף את הערכים.
// זה אינו health check ואינו מוכיח שהמפתח או שירות הספק עובדים.
// גם סטטוס מפתחות תמלול (Groq / ElevenLabs) ו-Auth.

import { NextResponse } from "next/server";
import { configuredProviders } from "@/lib/agent/providers";
import { getAuthDiagnostics, isAuthConfigured } from "@/lib/auth/config";
import { elevenLabsConfigured } from "@/lib/elevenlabs/client";

export const runtime = "nodejs";

export async function GET() {
  const diag = getAuthDiagnostics();
  return NextResponse.json({
    providers: configuredProviders(),
    transcription: {
      groq: !!(process.env.GROQ_API_KEY || "").trim(),
      elevenlabs: elevenLabsConfigured(),
    },
    auth: {
      supabase: isAuthConfigured(),
      // Safe diagnostics only — never the key value.
      urlHost: diag.urlHost,
      keyKind: diag.keyKind,
      keyLen: diag.keyLen,
      issue: diag.issue,
    },
  });
}
