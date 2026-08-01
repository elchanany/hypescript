// מחזיר אילו ספקים מוגדרים (מפתח קיים ב-env) — בלי לחשוף את הערכים.
// גם סטטוס מפתח התמלול (Groq).

import { NextResponse } from "next/server";
import { configuredProviders } from "@/lib/agent/providers";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    providers: configuredProviders(),
    transcription: { groq: !!(process.env.GROQ_API_KEY || "").trim() },
  });
}
