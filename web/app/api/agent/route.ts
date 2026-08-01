// Proxy לסוכן: מקבל {provider, messages, tools}, קורא מפתח מ-env, קורא ל-LLM,
// ומחזיר {content, tool_calls} מנורמל. המפתחות לעולם לא מגיעים לדפדפן.

import { NextRequest, NextResponse } from "next/server";
import { callProvider } from "@/lib/agent/providers";
import { Provider } from "@/lib/agent/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { provider, messages, tools } = await req.json();
    if (!provider || !messages) {
      return NextResponse.json({ error: "חסר provider או messages." }, { status: 400 });
    }
    const result = await callProvider(provider as Provider, messages, tools || []);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
